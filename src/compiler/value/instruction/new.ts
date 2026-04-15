import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class NewInstruction extends Instruction {
	readonly kind = "New" as const;
	constructor(id: number, public readonly callee: Value, public readonly args: Value[]) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = new ${this.callee}(${this.args.join(", ")})`;
	}
}
