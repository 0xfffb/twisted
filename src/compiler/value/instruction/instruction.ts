import { Value } from "../value.js";

export abstract class Instruction extends Value {
	readonly id: number;

	constructor(id: number) {
		super();
		this.id = id;
	}

	toString(): string {
		return `%${this.id}`;
	}

	abstract dump(): string;
}
