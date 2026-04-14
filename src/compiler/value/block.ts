import type { Instruction } from "./instruction/index.js";
import type { Terminator } from "./instruction/terminator/index.js";
import { Value } from "./value.js";

class BasicBlock extends Value {
	readonly kind = "BasicBlock" as const;
	readonly id: number;
	readonly name: string;
	instructions: Instruction[];
	terminator: Terminator | undefined;

	constructor(id: number, name: string) {
		super();
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

	toString(): string {
		return `block_${this.id}`;
	}
}

export { BasicBlock };
