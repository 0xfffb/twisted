import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class StoreInstruction extends Instruction {
	readonly kind = "Store" as const;
	constructor(
		id: number,
		public readonly slot: number,
		public readonly value: Value,
	) {
		super(id);
	}
	dump(): string {
		return `store slot[${this.slot}] = ${this.value}`;
	}
}
