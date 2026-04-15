import type { IRModule } from "./module.js";
import { IRFunction } from "./value/constant/global/function.js";
import { GlobalVariable } from "./value/constant/global/variable.js";
import { BasicBlock } from "./value/block.js";
import { ConstValue } from "./value/constant/const.js";
import { ArgValue } from "./value/argument.js";
import type { Value } from "./value/value.js";
import { Instruction } from "./value/instruction/instruction.js";
import type { Terminator } from "./value/instruction/terminator/terminator.js";
import {
	BinaryInstruction,
	UnaryInstruction,
	PhiInstruction,
	CallInstruction,
	ApplyInstruction,
	LoadInstruction,
	StoreInstruction,
	ArrayInstruction,
	ObjectInstruction,
	NewInstruction,
	GlobalRefInstruction,
	ThisInstruction,
	ArgumentsInstruction,
	ForInInitInstruction,
	ForInHasInstruction,
	ForInNextInstruction,
	GetPropInstruction,
	GetElemInstruction,
	SetPropInstruction,
	SetElemInstruction,
	DeletePropInstruction,
	DeleteElemInstruction,
	MakeClosureInstruction,
	LoadCaptureInstruction,
	LandingPadInstruction,
	BranchTerminator,
	JmpTerminator,
	ReturnTerminator,
	UnreachableTerminator,
	ThrowTerminator,
} from "./value/instruction/index.js";

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [k: string]: JsonValue };

class HyperionSerializer {
	serialize(module: IRModule): JsonValue {
		return {
			kind: "Module",
			name: module.name,
			globals: module.globals.map((g) => ({
				name: g.name,
				value: this.serializeValue(g.value),
			})),
			functions: module.functions.map((fn) => this.serializeFunction(fn)),
		};
	}

	serializeModuleToJson(module: IRModule, space: string | number = 2): string {
		return JSON.stringify(this.serialize(module), null, space);
	}

	private serializeValue(v: Value): JsonValue {
		if (v instanceof ConstValue) {
			return { kind: "const", value: v.literal as JsonValue };
		}
		if (v instanceof ArgValue) {
			return { kind: "arg", index: v.index, name: v.name };
		}
		if (v instanceof Instruction) {
			return { kind: "reg", id: v.id };
		}
		if (v instanceof IRFunction) {
			return { kind: "fn", name: v.name };
		}
		if (v instanceof BasicBlock) {
			return { kind: "block", id: v.id, name: v.name };
		}
		if (v instanceof GlobalVariable) {
			return { kind: "global", name: v.name, init: this.serializeValue(v.value) };
		}
		return { kind: "unknown", repr: String(v) };
	}

	private serializeTerminator(t: Terminator): JsonValue {
		if (t instanceof BranchTerminator) {
			return {
				kind: "Branch",
				cond: this.serializeValue(t.cond),
				ifTrue: t.ifTrue.name,
				ifFalse: t.ifFalse.name,
			};
		}
		if (t instanceof JmpTerminator) {
			return { kind: "Jmp", dest: t.dest.name };
		}
		if (t instanceof ReturnTerminator) {
			return { kind: "Return", value: this.serializeValue(t.value) };
		}
		if (t instanceof UnreachableTerminator) {
			return { kind: "Unreachable" };
		}
		if (t instanceof ThrowTerminator) {
			return { kind: "Throw", value: this.serializeValue(t.value) };
		}
		return { kind: "unknownTerminator", repr: String(t) };
	}

	private serializeInstruction(instr: Instruction): JsonValue {
		const id = instr.id;
		if (instr instanceof BinaryInstruction) {
			return {
				kind: "Binary",
				id,
				op: instr.kind,
				lhs: this.serializeValue(instr.lhs),
				rhs: this.serializeValue(instr.rhs),
			};
		}
		if (instr instanceof UnaryInstruction) {
			return {
				kind: "Unary",
				id,
				op: instr.op,
				operand: this.serializeValue(instr.operand),
			};
		}
		if (instr instanceof PhiInstruction) {
			return {
				kind: "Phi",
				id,
				incoming: instr.incoming.map(({ block, value }) => ({
					block: block.name,
					value: this.serializeValue(value),
				})),
			};
		}
		if (instr instanceof CallInstruction) {
			return {
				kind: "Call",
				id,
				callee: this.serializeValue(instr.callee),
				args: instr.args.map((a) => this.serializeValue(a)),
			};
		}
		if (instr instanceof ApplyInstruction) {
			return {
				kind: "Apply",
				id,
				thisVal: this.serializeValue(instr.thisVal),
				func: this.serializeValue(instr.func),
				args: instr.args.map((a) => this.serializeValue(a)),
			};
		}
		if (instr instanceof LoadInstruction) {
			return { kind: "Load", id, slot: instr.slot };
		}
		if (instr instanceof StoreInstruction) {
			return {
				kind: "Store",
				id,
				slot: instr.slot,
				value: this.serializeValue(instr.value),
			};
		}
		if (instr instanceof ArrayInstruction) {
			return { kind: "Array", id, elements: instr.elements.map((e) => this.serializeValue(e)) };
		}
		if (instr instanceof ObjectInstruction) {
			return {
				kind: "Object",
				id,
				props: instr.props.map((p) => ({ key: p.key, value: this.serializeValue(p.value) })),
			};
		}
		if (instr instanceof NewInstruction) {
			return {
				kind: "New",
				id,
				callee: this.serializeValue(instr.callee),
				args: instr.args.map((a) => this.serializeValue(a)),
			};
		}
		if (instr instanceof GlobalRefInstruction) {
			return { kind: "GlobalRef", id, name: instr.name };
		}
		if (instr instanceof ThisInstruction) {
			return { kind: "This", id };
		}
		if (instr instanceof ArgumentsInstruction) {
			return { kind: "Arguments", id };
		}
		if (instr instanceof ForInInitInstruction) {
			return { kind: "ForInInit", id, obj: this.serializeValue(instr.obj) };
		}
		if (instr instanceof ForInHasInstruction) {
			return { kind: "ForInHas", id, iter: this.serializeValue(instr.iter) };
		}
		if (instr instanceof ForInNextInstruction) {
			return { kind: "ForInNext", id, iter: this.serializeValue(instr.iter) };
		}
		if (instr instanceof GetPropInstruction) {
			return { kind: "GetProp", id, obj: this.serializeValue(instr.obj), key: instr.key };
		}
		if (instr instanceof GetElemInstruction) {
			return {
				kind: "GetElem",
				id,
				obj: this.serializeValue(instr.obj),
				key: this.serializeValue(instr.key),
			};
		}
		if (instr instanceof SetPropInstruction) {
			return {
				kind: "SetProp",
				id,
				obj: this.serializeValue(instr.obj),
				key: instr.key,
				value: this.serializeValue(instr.value),
			};
		}
		if (instr instanceof SetElemInstruction) {
			return {
				kind: "SetElem",
				id,
				obj: this.serializeValue(instr.obj),
				key: this.serializeValue(instr.key),
				value: this.serializeValue(instr.value),
			};
		}
		if (instr instanceof DeletePropInstruction) {
			return { kind: "DeleteProp", id, obj: this.serializeValue(instr.obj), key: instr.key };
		}
		if (instr instanceof DeleteElemInstruction) {
			return {
				kind: "DeleteElem",
				id,
				obj: this.serializeValue(instr.obj),
				key: this.serializeValue(instr.key),
			};
		}
		if (instr instanceof MakeClosureInstruction) {
			return {
				kind: "MakeClosure",
				id,
				fn: this.serializeValue(instr.fn),
				captures: instr.captures.map((c) => this.serializeValue(c)),
			};
		}
		if (instr instanceof LoadCaptureInstruction) {
			return { kind: "LoadCapture", id, index: instr.index };
		}
		if (instr instanceof LandingPadInstruction) {
			return { kind: "LandingPad", id };
		}
		return { kind: "UnknownInstr", id, repr: instr.dump() };
	}

	private serializeBlock(block: BasicBlock): JsonValue {
		return {
			name: block.name,
			id: block.id,
			unwindTo: block.unwindTo?.name ?? null,
			instructions: block.instructions.map((i) => this.serializeInstruction(i)),
			terminator: block.terminator ? this.serializeTerminator(block.terminator) : null,
		};
	}

	private serializeFunction(fn: IRFunction): JsonValue {
		return {
			name: fn.name,
			params: fn.params.map((p) => ({ index: p.index, name: p.name })),
			blocks: fn.blocks.map((b) => this.serializeBlock(b)),
		};
	}
}


export { HyperionSerializer };
