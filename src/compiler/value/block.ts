import type { Instruction } from "./instruction/index.js";
import type { Terminator } from "./instruction/terminator/index.js";

class BasicBlock {
	readonly id: number;
	name: string;
	instructions: Instruction[];
	terminator: Terminator | undefined;

	constructor(id: number, name: string) {
		this.id = id;
		this.name = name;
		this.instructions = [];
		this.terminator = undefined;
	}

	emit(instr: Instruction): void {
		this.instructions.push(instr);
	}

	terminate(term: Terminator): void {
		this.terminator = term;
	}
}

export { BasicBlock };
