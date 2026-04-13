import { Value } from "./value.js";

export class RegValue extends Value {
	readonly kind = "Reg" as const;

	constructor(public readonly id: number) {
		super();
	}

	toString(): string {
		return `%${this.id}`;
	}
}
