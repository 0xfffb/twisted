import { Value } from "./value.js";

export class ArgValue extends Value {
	readonly kind = "Arg" as const;

	constructor(
		public readonly index: number,
		public readonly name: string,
	) {
		super();
	}

	toString(): string {
		return `%${this.name}`;
	}
}
