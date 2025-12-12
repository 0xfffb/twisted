import { Opcode } from "../constant.js";

enum ArgKind {
	Undefined = 0,
	String = 1,
	Number = 2,
}

interface Arg {
	kind: ArgKind;
	value: any;
}

interface Instruction {
	opcode: Opcode;
	args: Arg[];
	tags: string[];
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

function createInstruction(
	opcode: Opcode,
	args: Arg[] | null = null,
	tags: string[] | null = null,
): Instruction {
	return {
		opcode,
		args: args ?? [],
		tags: tags ?? [],
	};
}

export { Instruction, Arg, createInstruction, ArgKind };
