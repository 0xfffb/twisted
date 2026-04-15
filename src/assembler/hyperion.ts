import { LabelType, Opcode } from "../constant.js";
import { ArgKind, createArg, createInstruction, type Instruction } from "../instruction.js";
import { Bulldozer as CompilerBulldozer } from "../compiler/bulldozer.js";
import { AssemblerBundle, BaseAssembler } from "./base.js";
import { Bulldozer as AssemblerBulldozer } from "./bulldozer.js";

type Json = Record<string, unknown>;

const DEPS_WINDOW = 0;

class HyperionAssembler extends BaseAssembler {
	private module!: Json;
	private readonly ir: Instruction[] = [];
	private readonly bulldozer = new CompilerBulldozer();
	private readonly bytecodeBulldozer = new AssemblerBulldozer();
	private readonly constPoolMap = new Map<string, number>();
	private blockLabelIds = new Map<string, number>();
	private fnEntryLabelIds = new Map<string, number>();
	private moduleHaltLabelId!: number;
	private nextCaptureTempSlot = 1_000_000;

	constructor() {
		super();
	}

	assemble(input: string | object): AssemblerBundle {
		this.module = typeof input === "string" ? (JSON.parse(input) as Json) : (input as Json);
		this.resetState();
		const ir = this.run();
		ir.forEach((instruction, index) => {
			this.bytecodeBulldozer.mark(index, this.bytecode.length);
			this.pushBytecodeInstruction(instruction);
		});
		this.bytecodeBulldozer.backpatch(this.bytecode, ir);
		return {
			bytecode: this.bytecode,
			meta: this.meta,
		};
	}

	private resetState(): void {
		this.ir.length = 0;
		this.bytecode.length = 0;
		this.meta.length = 0;
		this.constPoolMap.clear();
		this.blockLabelIds.clear();
		this.fnEntryLabelIds.clear();
		this.nextCaptureTempSlot = 1_000_000;
	}

	private pushBytecodeInstruction(instruction: Instruction): void {
		let opcode = instruction.opcode;
		if (instruction.opcode === Opcode.Push && instruction.args.length === 1) {
			const [arg] = instruction.args;
			if (arg.kind === ArgKind.String) {
				opcode = Opcode.LoadMeta;
			}
		}

		this.bytecode.push(opcode);
		instruction.args.forEach((arg) => {
			switch (arg.kind) {
				case ArgKind.Number:
				case ArgKind.Dependency:
				case ArgKind.Parameter:
				case ArgKind.Variable:
				case ArgKind.DynAddr:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.String:
				case ArgKind.Property:
					this.bytecode.push(this.getMetaIndex(arg.value));
					break;
				case ArgKind.Undefined:
					throw new Error(`Undefined arg kind: ${arg.kind}`);
				default:
					throw new Error(`Unknown arg kind: ${arg.kind}`);
			}
		});
	}

	private getMetaIndex(value: string): number {
		const index = this.constPoolMap.get(value);
		if (index !== undefined) {
			return index;
		}
		const nextIndex = this.meta.length;
		this.meta.push(value);
		this.constPoolMap.set(value, nextIndex);
		return nextIndex;
	}

	private asObj(v: unknown): Json {
		if (v === null || typeof v !== "object" || Array.isArray(v)) {
			throw new Error("HyperionAssembler: 期望对象");
		}
		return v as Json;
	}

	private asStr(v: unknown): string {
		if (typeof v !== "string") throw new Error("HyperionAssembler: 期望字符串");
		return v;
	}

	private asNum(v: unknown): number {
		if (typeof v !== "number" || !Number.isFinite(v)) {
			throw new Error("HyperionAssembler: 期望数字");
		}
		return v;
	}

	private binaryKindToOpcode(kind: string): Opcode {
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
			case "BitAnd":
				return Opcode.BitAnd;
			case "BitXor":
				return Opcode.BitXor;
			case "Shl":
				return Opcode.ShiftLeft;
			case "Shr":
				return Opcode.ShiftRight;
			case "UShr":
				return Opcode.ShiftRightUnsigned;
			case "Mod":
				return Opcode.Mod;
			case "Instanceof":
				return Opcode.Instanceof;
			case "In":
				return Opcode.In;
			default:
				throw new Error(`HyperionAssembler: 暂不支持的 Binary 运算 ${kind}`);
		}
	}

	private allocCaptureTempSlot(): number {
		return this.nextCaptureTempSlot++;
	}

	private materializeCaptureToSlot(v: unknown): number {
		const o = this.asObj(v);
		const k = this.asStr(o.kind);
		if (k === "reg") {
			return this.asNum(o.id);
		}
		const tmp = this.allocCaptureTempSlot();
		if (k === "arg") {
			this.pushIr(
				createInstruction(Opcode.LoadParameter, [createArg(ArgKind.Number, this.asNum(o.index))]),
			);
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

	private run(): Instruction[] {
		if (this.asStr(this.module.kind) !== "Module") {
			throw new Error('HyperionAssembler: 根节点须为 kind: "Module"');
		}
		const functions = this.module.functions;
		if (!Array.isArray(functions) || functions.length === 0) {
			throw new Error("HyperionAssembler: Module.functions 不能为空");
		}

		const main = functions.find((f) => this.asObj(f).name === "__main__");
		const rest = functions.filter((f) => this.asObj(f).name !== "__main__");
		const ordered = main ? [main, ...rest] : [...functions];

		const haltLab = this.bulldozer.label(undefined, LabelType.FUNCTION_END);
		this.moduleHaltLabelId = haltLab.id;

		this.preRegisterLabels(ordered);

		for (const fnJson of ordered) {
			this.emitFunction(this.asObj(fnJson));
		}

		this.pushIr(createInstruction(Opcode.Halt, []));
		this.bulldozer.record(this.moduleHaltLabelId, this.ir.length - 1);

		this.bulldozer.backpatch(this.ir);
		return this.ir;
	}

	private preRegisterLabels(functions: unknown[]): void {
		for (const f of functions) {
			const fn = this.asObj(f);
			const fnName = this.asStr(fn.name);
			const blocks = fn.blocks;
			if (!Array.isArray(blocks) || blocks.length === 0) {
				throw new Error(`HyperionAssembler: 函数 ${fnName} 无基本块`);
			}
			for (const b of blocks) {
				const block = this.asObj(b);
				const key = this.blockKey(fnName, this.asStr(block.name));
				const lab = this.bulldozer.label(`${fnName}_${block.name}`, LabelType.IF_END);
				this.blockLabelIds.set(key, lab.id);
			}
			const entryKey = this.blockKey(fnName, this.asStr(this.asObj(blocks[0]).name));
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
		const fnName = this.asStr(fn.name);
		const orderedBlocks = this.orderBlocks(fn);
		const fnEndLab = this.bulldozer.label(undefined, LabelType.FUNCTION_END);

		if (fnName !== "__main__") {
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, fnEndLab.id)]));
			const entryId = this.fnEntryLabelIds.get(fnName);
			if (entryId === undefined) throw new Error(`HyperionAssembler: 缺少函数入口 ${fnName}`);
			this.bulldozer.record(entryId, this.ir.length);
		}

		for (const block of orderedBlocks) {
			this.emitBlock(fnName, this.asObj(block));
		}

		if (fnName !== "__main__") {
			this.bulldozer.record(fnEndLab.id, this.ir.length);
		}
	}

	private orderBlocks(fn: Json): Json[] {
		const fnName = this.asStr(fn.name);
		const blocks = fn.blocks as Json[];
		const byName = new Map<string, Json>();
		for (const b of blocks) {
			const bb = this.asObj(b);
			byName.set(this.asStr(bb.name), bb);
		}
		const entryName = this.asStr(this.asObj(blocks[0]).name);
		const out: Json[] = [];
		const seen = new Set<string>();

		const succ = (b: Json): string[] => {
			const t = b.terminator as Json | null | undefined;
			if (!t || typeof t !== "object") return [];
			const k = this.asStr((t as Json).kind);
			if (k === "Branch") return [this.asStr(t.ifTrue), this.asStr(t.ifFalse)];
			if (k === "Jmp") return [this.asStr(t.dest)];
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
			const nm = this.asStr(this.asObj(b).name);
			if (!seen.has(nm)) visit(nm);
		}
		return out;
	}

	private emitBlock(fnName: string, block: Json): void {
		const blockName = this.asStr(block.name);
		const key = this.blockKey(fnName, blockName);
		const labelId = this.blockLabelIds.get(key);
		if (labelId === undefined) throw new Error(`HyperionAssembler: 未登记块标签 ${key}`);
		this.bulldozer.record(labelId, this.ir.length);

		const instructions = block.instructions;
		if (Array.isArray(instructions)) {
			for (const raw of instructions) {
				const ins = this.asObj(raw);
				if (this.asStr(ins.kind) === "Phi") continue;
				this.emitSsaInstruction(fnName, ins);
			}
		}

		const term = block.terminator;
		if (term !== undefined && term !== null) {
			this.emitTerminator(fnName, blockName, this.asObj(term));
		}
	}

	private emitPhiCopies(fromBlockName: string, toBlockName: string, fn: Json): void {
		const blocks = fn.blocks as Json[];
		const target = blocks.map((b) => this.asObj(b)).find((b) => this.asStr(b.name) === toBlockName);
		if (!target) return;
		const instrs = target.instructions;
		if (!Array.isArray(instrs)) return;
		for (const raw of instrs) {
			const ins = this.asObj(raw);
			if (this.asStr(ins.kind) !== "Phi") continue;
			const incoming = ins.incoming as unknown[];
			if (!Array.isArray(incoming)) continue;
			for (const edge of incoming) {
				const e = this.asObj(edge);
				if (this.asStr(e.block) !== fromBlockName) continue;
				this.emitValue(e.value);
				this.pushIr(
					createInstruction(Opcode.Store, [createArg(ArgKind.Variable, this.asNum(ins.id))]),
				);
			}
		}
	}

	private emitTerminator(fnName: string, currentBlockName: string, t: Json): void {
		const kind = this.asStr(t.kind);
		const isMain = fnName === "__main__";

		if (kind === "Branch") {
			this.emitValue(t.cond);
			const ifTrueName = this.asStr(t.ifTrue);
			const ifFalseName = this.asStr(t.ifFalse);
			const lTrue = this.bulldozer.label(undefined, LabelType.IF_THEN);
			this.pushIr(createInstruction(Opcode.JmpIf, [createArg(ArgKind.DynAddr, lTrue.id)]));

			this.emitPhiCopies(currentBlockName, ifFalseName, this.getFnJson(fnName));
			this.pushIr(
				createInstruction(Opcode.Jmp, [
					createArg(ArgKind.DynAddr, this.blockLabelIds.get(this.blockKey(fnName, ifFalseName))!),
				]),
			);

			this.bulldozer.record(lTrue.id, this.ir.length);
			this.emitPhiCopies(currentBlockName, ifTrueName, this.getFnJson(fnName));
			this.pushIr(
				createInstruction(Opcode.Jmp, [
					createArg(ArgKind.DynAddr, this.blockLabelIds.get(this.blockKey(fnName, ifTrueName))!),
				]),
			);
			return;
		}

		if (kind === "Jmp") {
			const dest = this.asStr(t.dest);
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
				this.pushIr(
					createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, this.moduleHaltLabelId)]),
				);
			} else {
				this.pushIr(createInstruction(Opcode.PopFrame, []));
			}
			return;
		}

		if (kind === "Throw") {
			this.emitValue(t.value);
			this.pushIr(createInstruction(Opcode.Throw, []));
			return;
		}

		if (kind === "Unreachable") {
			this.pushIr(
				createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, this.moduleHaltLabelId)]),
			);
			return;
		}

		throw new Error(`HyperionAssembler: 暂不支持的 terminator: ${kind}`);
	}

	private getFnJson(fnName: string): Json {
		const functions = this.module.functions as unknown[];
		const f = functions.map((x) => this.asObj(x)).find((x) => this.asStr(x.name) === fnName);
		if (!f) throw new Error(`HyperionAssembler: 未找到函数 ${fnName}`);
		return f;
	}

	private emitSsaInstruction(fnName: string, ins: Json): void {
		const kind = this.asStr(ins.kind);
		const id = this.asNum(ins.id);

		switch (kind) {
			case "Binary": {
				const op = this.asStr(ins.op);
				this.emitValue(ins.lhs);
				this.emitValue(ins.rhs);
				this.pushIr(createInstruction(this.binaryKindToOpcode(op), []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Unary": {
				const op = this.asStr(ins.op);
				const operand = ins.operand;
				if (op === "!") {
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.Not, []));
				} else if (op === "-") {
					this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, 0)]));
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.Sub, []));
				} else if (op === "typeof") {
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.Typeof, []));
				} else if (op === "~") {
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.BitNot, []));
				} else if (op === "+") {
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.UnaryPlus, []));
				} else if (op === "void") {
					this.emitValue(operand);
					this.pushIr(createInstruction(Opcode.Void, []));
				} else {
					throw new Error(`HyperionAssembler: 暂不支持的 Unary "${op}"`);
				}
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Load": {
				const slot = this.asNum(ins.slot);
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, slot)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Store": {
				this.emitValue(ins.value);
				const slot = this.asNum(ins.slot);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, slot)]));
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, slot)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "GlobalRef": {
				const name = this.asStr(ins.name);
				this.pushIr(
					createInstruction(Opcode.Dependency, [createArg(ArgKind.Dependency, DEPS_WINDOW)]),
				);
				this.pushIr(createInstruction(Opcode.Property, [createArg(ArgKind.Property, name)]));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "This": {
				this.pushIr(
					createInstruction(Opcode.Dependency, [createArg(ArgKind.Dependency, DEPS_WINDOW)]),
				);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Arguments": {
				this.pushIr(createInstruction(Opcode.Arguments, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Call": {
				this.emitCall(ins);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "Apply": {
				const args = ins.args as unknown[];
				if (!Array.isArray(args)) throw new Error("HyperionAssembler: Apply.args 须为数组");
				for (const a of args) this.emitValue(a);
				this.pushIr(
					createInstruction(Opcode.BuildArray, [createArg(ArgKind.Number, args.length)]),
				);
				this.emitValue(ins.thisVal);
				this.emitValue(ins.func);
				this.pushIr(createInstruction(Opcode.Apply, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "ForInInit": {
				this.emitValue(ins.obj);
				this.pushIr(createInstruction(Opcode.ForInInit, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "ForInHas": {
				this.emitValue(ins.iter);
				this.pushIr(createInstruction(Opcode.ForInHas, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "ForInNext": {
				this.emitValue(ins.iter);
				this.pushIr(createInstruction(Opcode.ForInNext, []));
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
					const prop = this.asObj(p);
					this.pushIr(
						createInstruction(Opcode.Push, [createArg(ArgKind.String, this.asStr(prop.key))]),
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
				this.pushIr(
					createInstruction(Opcode.Property, [createArg(ArgKind.Property, this.asStr(ins.key))]),
				);
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
				this.pushIr(
					createInstruction(Opcode.SetProperty, [
						createArg(ArgKind.Property, this.asStr(ins.key)),
					]),
				);
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
			case "DeleteProp": {
				this.emitValue(ins.obj);
				this.pushIr(
					createInstruction(Opcode.DeleteProp, [createArg(ArgKind.Property, this.asStr(ins.key))]),
				);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "DeleteElem": {
				this.emitValue(ins.obj);
				this.emitValue(ins.key);
				this.pushIr(createInstruction(Opcode.DeleteElem, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "LandingPad": {
				this.pushIr(createInstruction(Opcode.LandingPad, []));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			case "MakeClosure": {
				const captures = ins.captures as unknown[];
				if (!Array.isArray(captures)) {
					throw new Error("HyperionAssembler: MakeClosure.captures 须为数组");
				}
				const entryId = this.resolveFnEntryLabel(ins.fn);
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
				this.pushIr(
					createInstruction(Opcode.LoadCapture, [createArg(ArgKind.Number, this.asNum(ins.index))]),
				);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, id)]));
				break;
			}
			default:
				throw new Error(`HyperionAssembler: 暂不支持的指令 kind=${kind}`);
		}
	}

	private resolveFnEntryLabel(fnRef: unknown): number {
		const v = this.asObj(fnRef);
		if (this.asStr(v.kind) !== "fn") {
			throw new Error("HyperionAssembler: MakeClosure.fn 须为 { kind: fn, name }");
		}
		const name = this.asStr(v.name);
		const lid = this.fnEntryLabelIds.get(name);
		if (lid === undefined) throw new Error(`HyperionAssembler: 未找到函数 ${name} 的入口标签`);
		return lid;
	}

	private emitCall(ins: Json): void {
		const args = ins.args as unknown[];
		if (!Array.isArray(args)) throw new Error("HyperionAssembler: Call.args 须为数组");
		for (const a of args) this.emitValue(a);
		this.pushIr(createInstruction(Opcode.BuildArray, [createArg(ArgKind.Number, args.length)]));

		const cv = this.asObj(ins.callee);
		const ck = this.asStr(cv.kind);
		if (ck === "fn") {
			const name = this.asStr(cv.name);
			const entryId = this.fnEntryLabelIds.get(name);
			if (entryId === undefined) throw new Error(`HyperionAssembler: 调用未定义函数 ${name}`);
			this.pushIr(createInstruction(Opcode.PushFrame, []));
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, entryId)]));
			return;
		}
		this.emitValue(ins.callee);
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
		const o = this.asObj(v);
		const kind = this.asStr(o.kind);
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
				const idx = this.asNum(o.index);
				this.pushIr(createInstruction(Opcode.LoadParameter, [createArg(ArgKind.Number, idx)]));
				break;
			}
			case "reg": {
				const rid = this.asNum(o.id);
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, rid)]));
				break;
			}
			case "fn": {
				const name = this.asStr(o.name);
				const entryId = this.fnEntryLabelIds.get(name);
				if (entryId === undefined) {
					throw new Error(`HyperionAssembler: 未登记函数入口 ${name}（无法将 { kind: fn } 变为闭包值）`);
				}
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

export { HyperionAssembler };
