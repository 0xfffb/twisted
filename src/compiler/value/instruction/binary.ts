import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export type BinaryInstructionKind = "Add" | "Sub" | "Mul" | "Div" | "Equal" | "Lt" | "Lte" | "Gt" | "Gte";

export class BinaryInstruction extends Instruction {
	readonly kind: BinaryInstructionKind;
	constructor(
		id: number,
		kind: BinaryInstructionKind,
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
