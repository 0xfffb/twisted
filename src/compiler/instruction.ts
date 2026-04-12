enum InstructionKind {
	Push = "Push",
	Pop = "Pop",
	Add = "Add",
	Sub = "Sub",
	Mul = "Mul",
	Div = "Div",
	Equal = "Equal",
	Jmp = "Jmp",
	JmpIf = "JmpIf",
}

enum Terminator {
	Branch = "Branch",
	Switch = "Switch",
	Return = "Return",
	Unreachable = "Unreachable",
}

interface Instruction {
	kind: InstructionKind;
	reg: number;
	lhs: number;
	rhs: number;
	terminator: Terminator;
}

export type { Instruction, Terminator };
