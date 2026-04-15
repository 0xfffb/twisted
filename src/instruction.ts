import { Opcode } from "./constant.js";

enum ArgKind {
	Undefined = 0,
	String = 1,
	Number = 2,
	Dependency = 4,
	Property = 5,
	Parameter = 6,
	Variable = 7,
	DynAddr = 8,
}

interface Arg {
	kind: ArgKind;
	value: any;
}

interface Instruction {
	opcode: Opcode;
	args: Arg[];
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
