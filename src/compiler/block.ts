import type { Instruction, Terminator } from "./instruction.js";

class BasicBlock {
	readonly id: number;
	label: string;
	instructions: Instruction[];
	terminator: Terminator | undefined;

	constructor(id: number, label: string, instructions: Instruction[], terminator?: Terminator) {
		this.id = id;
		this.label = label;
		this.instructions = instructions;
		this.terminator = terminator;
	}
}
