import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class CallInstruction extends Instruction {
	readonly kind = "Call" as const;
	constructor(
		id: number,
		public readonly callee: Value,
		public readonly args: Value[],
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = call ${this.callee}(${this.args.join(", ")})`;
	}
}
