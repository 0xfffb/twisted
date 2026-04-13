import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class BinaryInstruction extends Instruction {
	readonly kind: "Add" | "Sub" | "Mul" | "Div" | "Equal";
	constructor(
		id: number,
		kind: BinaryInstruction["kind"],
		public readonly lhs: Value,
		public readonly rhs: Value,
	) {
		super(id);
		this.kind = kind;
	}
	dump(): string {
		return `%${this.id} = ${this.kind.toLowerCase()} ${this.lhs}, ${this.rhs}`;
	}
}
