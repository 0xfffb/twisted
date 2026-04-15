import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class ApplyInstruction extends Instruction {
	readonly kind = "Apply" as const;
	constructor(
		id: number,
		public readonly thisVal: Value,
		public readonly func: Value,
		public readonly args: Value[],
	) {
		super(id);
	}
	dump(): string {
		const argStr = this.args.map((a) => `${a}`).join(", ");
		return `%${this.id} = apply ${this.func} this=${this.thisVal} args=[${argStr}]`;
	}
}
