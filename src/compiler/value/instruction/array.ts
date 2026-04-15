import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class ArrayInstruction extends Instruction {
	readonly kind = "Array" as const;
	constructor(id: number, public readonly elements: Value[]) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = array [${this.elements.join(", ")}]`;
	}
}
