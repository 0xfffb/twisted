/**
 * Hyperion JSON IR → 线性 Instruction[] → LinearAssembler 生成 VM bytecode。
 * JSON 格式与 HyperionSerializer 输出一致（kind: Module）。
 */
import { LabelType, Opcode } from "../constant.js";
import { ArgKind, createArg, createInstruction, type Instruction } from "../instruction.js";
import { Bulldozer } from "../compiler/bulldozer.js";
import { AssemblerBundle, BaseAssembler } from "./base.js";
import { LinearAssembler } from "./linear.js";

type Json = Record<string, unknown>;

const DEPS_WINDOW = 0;

function asObj(v: unknown): Json {
	if (v === null || typeof v !== "object" || Array.isArray(v)) {
		throw new Error("HyperionAssembler: 期望对象");
	}
	return v as Json;
}

function asStr(v: unknown): string {
	if (typeof v !== "string") throw new Error("HyperionAssembler: 期望字符串");
	return v;
}

function asNum(v: unknown): number {
	if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("HyperionAssembler: 期望数字");
	return v;
}

/** 二元 IR 操作 → Opcode（与 LinearCompiler / VM 约定一致） */
function binaryKindToOpcode(kind: string): Opcode {
	switch (kind) {
		case "Add":
			return Opcode.Add;
		case "Sub":
			return Opcode.Sub;
		case "Mul":
			return Opcode.Mul;
		case "Div":
			return Opcode.Div;
		case "Equal":
			return Opcode.Equal;
		case "Lt":
			return Opcode.LessThan;
		case "Lte":
			return Opcode.LessThanOrEqual;
		case "Gt":
			return Opcode.GreaterThan;
		case "Gte":
			return Opcode.GreaterThanOrEqual;
		case "BitOr":
			return Opcode.BitOr;
		case "BitXor":
			return Opcode.BitXor;
		case "Shl":
			return Opcode.ShiftLeft;
		case "UShr":
			return Opcode.ShiftRightUnsigned;
		default:
			throw new Error(`HyperionAssembler: 暂不支持的 Binary 运算 ${kind}`);
	}
}

class HyperionToLinearIr {
	private readonly module: Json;
	private readonly ir: Instruction[] = [];
	private readonly bulldozer = new Bulldozer();
	/** `${fnName}::${blockName}` → label id */
	private blockLabelIds = new Map<string, number>();
	/** 函数入口（首块）label id，供 Call { kind: fn } 与 MakeClosure 使用 */
	private fnEntryLabelIds = new Map<string, number>();
	private moduleHaltLabelId!: number;
	/** 与 SSA reg id 错开，用于 MakeClosure 捕获物化（const/arg 等） */
	private nextCaptureTempSlot = 1_000_000;

	constructor(module: Json) {
		this.module = module;
	}

	private allocCaptureTempSlot(): number {
		return this.nextCaptureTempSlot++;
	}

	/**
	 * MakeClosure 运行时只认 Variable 槽。序列化捕获可能是 reg / const / arg 等，
	 * 非常量槽先求值再 Store 到临时槽。
	 */
	private materializeCaptureToSlot(v: unknown): number {
		const o = asObj(v);
		const k = asStr(o.kind);
		if (k === "reg") {
			return asNum(o.id);
		}
		const tmp = this.allocCaptureTempSlot();
		if (k === "arg") {
			this.pushIr(createInstruction(Opcode.LoadParameter, [createArg(ArgKind.Number, asNum(o.index))]));
			this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, tmp)]));
			return tmp;
		}
		if (k === "const") {
			const lit = o.value;
			if (lit === null) {
				this.pushIr(createInstruction(Opcode.PushNull, []));
			} else if (typeof lit === "number") {
				this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, lit)]));
			} else if (typeof lit === "string") {
				this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.String, lit)]));
			} else if (typeof lit === "boolean") {
				this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, lit ? 1 : 0)]));
			} else {
				throw new Error("HyperionAssembler: MakeClosure 捕获 const 值类型不支持");
			}
			this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, tmp)]));
			return tmp;
		}
		this.emitValue(v);
		this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, tmp)]));
		return tmp;
	}

	run(): Instruction[] {
		if (asStr(this.module.kind) !== "Module") {
			throw new Error('HyperionAssembler: 根节点须为 kind: "Module"');
		}
		const functions = this.module.functions;
		if (!Array.isArray(functions) || functions.length === 0) {
			throw new Error("HyperionAssembler: Module.functions 不能为空");
		}

		const main = functions.find((f) => asObj(f).name === "__main__");
		const rest = functions.filter((f) => asObj(f).name !== "__main__");
		const ordered = main ? [main, ...rest] : [...functions];

		const haltLab = this.bulldozer.label(undefined, LabelType.FUNCTION_END);
		this.moduleHaltLabelId = haltLab.id;

		this.preRegisterLabels(ordered);

		for (const fnJson of ordered) {
			this.emitFunction(asObj(fnJson));
		}

		this.pushIr(createInstruction(Opcode.Halt, []));
		this.bulldozer.record(this.moduleHaltLabelId, this.ir.length - 1);

		this.bulldozer.backpatch(this.ir);
		return this.ir;
	}

	private preRegisterLabels(functions: unknown[]): void {
		for (const f of functions) {
			const fn = asObj(f);
			const fnName = asStr(fn.name);
			const blocks = fn.blocks;
			if (!Array.isArray(blocks) || blocks.length === 0) {
				throw new Error(`HyperionAssembler: 函数 ${fnName} 无基本块`);
			}
			for (const b of blocks) {
				const block = asObj(b);
				const key = this.blockKey(fnName, asStr(block.name));
				const lab = this.bulldozer.label(`${fnName}_${block.name}`, LabelType.IF_END);
				this.blockLabelIds.set(key, lab.id);
			}
			const entryKey = this.blockKey(fnName, asStr(asObj(blocks[0]).name));
			const entryId = this.blockLabelIds.get(entryKey);
			if (entryId === undefined) throw new Error(`HyperionAssembler: 未登记入口块 ${fnName}`);
			this.fnEntryLabelIds.set(fnName, entryId);
		}
	}

	private blockKey(fnName: string, blockName: string): string {
		return `${fnName}::${blockName}`;
	}

	private pushIr(instr: Instruction): void {
		this.ir.push(instr);
	}

	private emitFunction(fn: Json): void {
		const fnName = asStr(fn.name);
		const blocks = fn.blocks as unknown[];
		const orderedBlocks = this.orderBlocks(fn);

		const fnEndLab = this.bulldozer.label(undefined, LabelType.FUNCTION_END);

		if (fnName !== "__main__") {
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, fnEndLab.id)]));
			const entryId = this.fnEntryLabelIds.get(fnName);
			if (entryId === undefined) throw new Error(`HyperionAssembler: 缺少函数入口 ${fnName}`);
			this.bulldozer.record(entryId, this.ir.length);
		}

		for (const block of orderedBlocks) {
			this.emitBlock(fnName, asObj(block));
		}

		if (fnName !== "__main__") {
			this.bulldozer.record(fnEndLab.id, this.ir.length);
		}
	}

	/** 从入口块出发 DFS，未连通的块追加在后，避免漏块 */
	private orderBlocks(fn: Json): Json[] {
		const fnName = asStr(fn.name);
		const blocks = fn.blocks as Json[];
		const byName = new Map<string, Json>();
		for (const b of blocks) {
			const bb = asObj(b);
			byName.set(asStr(bb.name), bb);
		}
		const entryName = asStr(asObj(blocks[0]).name);
		const out: Json[] = [];
		const seen = new Set<string>();

		const succ = (b: Json): string[] => {
			const t = b.terminator as Json | null | undefined;
			if (!t || typeof t !== "object") return [];
			const k = asStr((t as Json).kind);
			if (k === "Branch") return [asStr(t.ifTrue), asStr(t.ifFalse)];
			if (k === "Jmp") return [asStr(t.dest)];
			return [];
		};

		const visit = (name: string) => {
			if (seen.has(name)) return;
			seen.add(name);
			const b = byName.get(name);
			if (!b) throw new Error(`HyperionAssembler: 未找到基本块 ${fnName}::${name}`);
			out.push(b);
			for (const s of succ(b)) visit(s);
		};

		visit(entryName);
		for (const b of blocks) {
			const nm = asStr(asObj(b).name);
			if (!seen.has(nm)) visit(nm);
		}
		return out;
	}

	private emitBlock(fnName: string, block: Json): void {
		const blockName = asStr(block.name);
		const key = this.blockKey(fnName, blockName);
		const labelId = this.blockLabelIds.get(key);
		if (labelId === undefined) throw new Error(`HyperionAssembler: 未登记块标签 ${key}`);
		this.bulldozer.record(labelId, this.ir.length);

		const instructions = block.instructions;
		if (Array.isArray(instructions)) {
			for (const raw of instructions) {
				const ins = asObj(raw);
				if (asStr(ins.kind) === "Phi") continue;
				this.emitSsaInstruction(fnName, ins);
			}
		}

		const term = block.terminator;
		if (term !== undefined && term !== null) {
			this.emitTerminator(fnName, blockName, asObj(term));
		}
	}

	private emitPhiCopies(fromBlockName: string, toBlockName: string, fn: Json): void {
		const fnName = asStr(fn.name);
		const blocks = fn.blocks as Json[];
		const target = blocks.map(asObj).find((b) => asStr(b.name) === toBlockName);
		if (!target) return;
		const instrs = target.instructions;
		if (!Array.isArray(instrs)) return;
		for (const raw of instrs) {
			const ins = asObj(raw);
			if (asStr(ins.kind) !== "Phi") continue;
			const incoming = ins.incoming as unknown[];
			if (!Array.isArray(incoming)) continue;
			for (const edge of incoming) {
				const e = asObj(edge);
				if (asStr(e.block) !== fromBlockName) continue;
				this.emitValue(e.value);
				this.pushIr(
					createInstruction(Opcode.Store, [createArg(ArgKind.Variable, asNum(ins.id))]),
				);
			}
		}
	}

	private emitTerminator(fnName: string, currentBlockName: string, t: Json): void {
		const kind = asStr(t.kind);
		const isMain = fnName === "__main__";

		if (kind === "Branch") {
			const cond = t.cond;
			this.emitValue(cond);
			const ifTrueName = asStr(t.ifTrue);
			const ifFalseName = asStr(t.ifFalse);

			const LTrue = this.bulldozer.label(undefined, LabelType.IF_THEN);
			this.pushIr(createInstruction(Opcode.JmpIf, [createArg(ArgKind.DynAddr, LTrue.id)]));

			this.emitPhiCopies(currentBlockName, ifFalseName, this.getFnJson(fnName));
			this.pushIr(
				createInstruction(Opcode.Jmp, [
					createArg(ArgKind.DynAddr, this.blockLabelIds.get(this.blockKey(fnName, ifFalseName))!),
				]),
			);

			this.bulldozer.record(LTrue.id, this.ir.length);
			this.emitPhiCopies(currentBlockName, ifTrueName, this.getFnJson(fnName));
			this.pushIr(
				createInstruction(Opcode.Jmp, [
					createArg(ArgKind.DynAddr, this.blockLabelIds.get(this.blockKey(fnName, ifTrueName))!),
				]),
			);
			return;
		}

		if (kind === "Jmp") {
			const dest = asStr(t.dest);
			this.emitPhiCopies(currentBlockName, dest, this.getFnJson(fnName));
			this.pushIr(
				createInstruction(Opcode.Jmp, [
					createArg(ArgKind.DynAddr, this.blockLabelIds.get(this.blockKey(fnName, dest))!),
				]),
			);
			return;
		}

		if (kind === "Return") {
			this.emitValue(t.value);
			if (isMain) {
				this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, this.moduleHaltLabelId)]));
			} else {
				this.pushIr(createInstruction(Opcode.PopFrame, []));
			}
			return;
		}

		if (kind === "Unreachable") {
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, this.moduleHaltLabelId)]));
			return;
		}

		throw new Error(`HyperionAssembler: 暂不支持的 terminator: ${kind}`);
	}

	private getFnJson(fnName: string): Json {
		const functions = this.module.functions as unknown[];
		const f = functions.map(asObj).find((x) => asStr(x.name) === fnName);
		if (!f) throw new Error(`HyperionAssembler: 未找到函数 ${fnName}`);
		return f;
	}

	private emitSsaInstruction(fnName: string, ins: Json): void {
		const kind = asStr(ins.kind);
		const id = asNum(ins.id);

		switch (kind) {
			case "Binary": {
				const op = asStr(ins.op);
				this.emitValue(ins.lhs);
				this.emitValue(ins.rhs);
				this.pushIr(createInstruction(binaryKindToOpcode(op), []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Unary": {
				const op = asStr(ins.op);
				const operand = ins.operand;
				if (op === "!") {
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.Not, []));
				} else if (op === "-") {
					this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, 0)]));
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.Sub, []));
				} else {
					throw new Error(`HyperionAssembler: 暂不支持的 Unary "${op}"`);
				}
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Load": {
				const slot = asNum(ins.slot);
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, slot)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Store": {
				this.emitValue(ins.value);
				const slot = asNum(ins.slot);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, slot)]));
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, slot)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "GlobalRef": {
				const name = asStr(ins.name);
				this.pushIr(createInstruction(Opcode.Dependency, [createArg(ArgKind.Dependency, DEPS_WINDOW)]));
				this.pushIr(createInstruction(Opcode.Property, [createArg(ArgKind.Property, name)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "This": {
				this.pushIr(createInstruction(Opcode.Dependency, [createArg(ArgKind.Dependency, DEPS_WINDOW)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Call": {
				this.emitCall(ins);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "New": {
				const args = ins.args as unknown[];
				if (!Array.isArray(args)) throw new Error("HyperionAssembler: New.args 须为数组");
				for (const a of args) this.emitValue(a);
				this.pushIr(
					createInstruction(Opcode.BuildArray, [createArg(ArgKind.Number, args.length)]),
				);
				this.emitValue(ins.callee);
				this.pushIr(createInstruction(Opcode.Construct, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Array": {
				const els = ins.elements as unknown[];
				if (!Array.isArray(els)) throw new Error("HyperionAssembler: Array.elements 须为数组");
				for (const el of els) this.emitValue(el);
				this.pushIr(
					createInstruction(Opcode.BuildArray, [createArg(ArgKind.Number, els.length)]),
				);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Object": {
				const props = ins.props as unknown[];
				if (!Array.isArray(props)) throw new Error("HyperionAssembler: Object.props 须为数组");
				for (const p of props) {
					const prop = asObj(p);
					this.pushIr(
						createInstruction(Opcode.Push, [createArg(ArgKind.String, asStr(prop.key))]),
					);
					this.emitValue(prop.value);
				}
				this.pushIr(
					createInstruction(Opcode.BuildObject, [createArg(ArgKind.Number, props.length)]),
				);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "GetProp": {
				this.emitValue(ins.obj);
				this.pushIr(createInstruction(Opcode.Property, [createArg(ArgKind.Property, asStr(ins.key))]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "GetElem": {
				this.emitValue(ins.obj);
				this.emitValue(ins.key);
				this.pushIr(createInstruction(Opcode.GetElement, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "SetProp": {
				this.emitValue(ins.obj);
				this.emitValue(ins.value);
				this.pushIr(createInstruction(Opcode.SetProperty, [createArg(ArgKind.Property, asStr(ins.key))]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "SetElem": {
				this.emitValue(ins.obj);
				this.emitValue(ins.key);
				this.emitValue(ins.value);
				this.pushIr(createInstruction(Opcode.SetElement, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "MakeClosure": {
				const fnRef = ins.fn;
				const captures = ins.captures as unknown[];
				if (!Array.isArray(captures)) throw new Error("HyperionAssembler: MakeClosure.captures 须为数组");
				const entryId = this.resolveFnEntryLabel(fnRef);
				const slots = captures.map((c) => this.materializeCaptureToSlot(c));
				this.pushIr(
					createInstruction(Opcode.MakeClosure, [
						createArg(ArgKind.DynAddr, entryId),
						createArg(ArgKind.Number, slots.length),
						...slots.map((s) => createArg(ArgKind.Variable, s)),
					]),
				);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "LoadCapture": {
				this.pushIr(createInstruction(Opcode.LoadCapture, [createArg(ArgKind.Number, asNum(ins.index))]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			default:
				throw new Error(`HyperionAssembler: 暂不支持的指令 kind=${kind}`);
		}
	}

	private resolveFnEntryLabel(fnRef: unknown): number {
		const v = asObj(fnRef);
		if (asStr(v.kind) !== "fn") throw new Error("HyperionAssembler: MakeClosure.fn 须为 { kind: fn, name }");
		const name = asStr(v.name);
		const lid = this.fnEntryLabelIds.get(name);
		if (lid === undefined) throw new Error(`HyperionAssembler: 未找到函数 ${name} 的入口标签`);
		return lid;
	}

	private emitCall(ins: Json): void {
		const args = ins.args as unknown[];
		if (!Array.isArray(args)) throw new Error("HyperionAssembler: Call.args 须为数组");
		for (const a of args) this.emitValue(a);
		this.pushIr(createInstruction(Opcode.BuildArray, [createArg(ArgKind.Number, args.length)]));

		const callee = ins.callee;
		const cv = asObj(callee);
		const ck = asStr(cv.kind);
		if (ck === "fn") {
			const name = asStr(cv.name);
			const entryId = this.fnEntryLabelIds.get(name);
			if (entryId === undefined) throw new Error(`HyperionAssembler: 调用未定义函数 ${name}`);
			this.pushIr(createInstruction(Opcode.PushFrame, []));
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, entryId)]));
			return;
		}
		this.emitValue(callee);
		this.pushIr(createInstruction(Opcode.InvokeValue, []));
	}

	private emitValue(v: unknown): void {
		if (v === null || v === undefined) {
			this.pushIr(createInstruction(Opcode.PushNull, []));
			return;
		}
		if (typeof v === "number") {
			this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, v)]));
			return;
		}
		if (typeof v === "string") {
			this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.String, v)]));
			return;
		}
		if (typeof v === "boolean") {
			this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, v ? 1 : 0)]));
			return;
		}
		if (Array.isArray(v)) {
			throw new Error("HyperionAssembler: 非法 JSON 值（数组）");
		}
		const o = asObj(v);
		const kind = asStr(o.kind);
		switch (kind) {
			case "const": {
				const lit = o.value;
				if (lit === null) {
					this.pushIr(createInstruction(Opcode.PushNull, []));
				} else if (typeof lit === "number") {
					this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, lit)]));
				} else if (typeof lit === "string") {
					this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.String, lit)]));
				} else if (typeof lit === "boolean") {
					this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, lit ? 1 : 0)]));
				} else {
					throw new Error("HyperionAssembler: 不支持的 const 类型");
				}
				break;
			}
			case "arg": {
				const idx = asNum(o.index);
				this.pushIr(createInstruction(Opcode.LoadParameter, [createArg(ArgKind.Number, idx)]));
				break;
			}
			case "reg": {
				const rid = asNum(o.id);
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, rid)]));
				break;
			}
			case "fn": {
				const name = asStr(o.name);
				const entryId = this.fnEntryLabelIds.get(name);
				if (entryId === undefined) {
					throw new Error(`HyperionAssembler: 未登记函数入口 ${name}（无法将 { kind: fn } 变为闭包值）`);
				}
				// 模块内具名函数作为值：与无捕获 MakeClosure 一致，供 InvokeValue / 传参等使用
				this.pushIr(
					createInstruction(Opcode.MakeClosure, [
						createArg(ArgKind.DynAddr, entryId),
						createArg(ArgKind.Number, 0),
					]),
				);
				break;
			}
			case "global": {
				throw new Error("HyperionAssembler: 暂不支持序列化的 global 值");
			}
			default:
				throw new Error(`HyperionAssembler: 不支持的 Value kind=${kind}`);
		}
	}
}

class HyperionAssembler extends BaseAssembler {
	constructor() {
		super();
	}

	assemble(input: string | object): AssemblerBundle {
		const json = typeof input === "string" ? (JSON.parse(input) as Json) : (input as Json);
		const lower = new HyperionToLinearIr(json);
		const ir = lower.run();
		return new LinearAssembler().assemble(ir);
	}
}

export { HyperionAssembler };
