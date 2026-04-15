import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class UnaryInstruction extends Instruction {
	readonly kind = "Unary" as const;
	constructor(
		id: number,
		public readonly op: string,
		public readonly operand: Value,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = unary "${this.op}" ${this.operand}`;
	}
}
