import { Opcode } from "./constant.js";

enum ArgKind {
	Undefined = 0,
	String = 1,
	Number = 2,
	ArgLength = 3,
	Dependency = 4,
	Property = 5,
	Parameter = 6,
	Variable = 7,
}

interface Arg {
	kind: ArgKind;
	value: any;
}

interface Instruction {
	opcode: Opcode;
	args: Arg[];
}

interface BasicBlock {
	id: number;
	start: number;
	end: number;
	instructions: Instruction[];
	predecessors: BasicBlock[];
	successors: BasicBlock[];
}

interface ControlFlowGraph {
	entry: number;
	exit: number;
	blocks: Map<number, BasicBlock>;
}

function createInstruction(opcode: Opcode, args: Arg[] | null = null): Instruction {
	return {
		opcode,
		args: args ?? [],
	};
}

function createArg(kind: ArgKind, value: any): Arg {
	return {
		kind,
		value,
	};
}

export { Instruction, Arg, createInstruction, ArgKind, createArg };
