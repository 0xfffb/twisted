import { Constant } from "./constant.js";
import { Value } from "../value.js";

export class GlobalVariable extends Constant {
	readonly kind = "GlobalVariable" as const;

	constructor(
		public readonly name: string,
		public readonly value: Value,
	) {
		super();
	}

	toString(): string {
		return `@${this.name}`;
	}

	dump(): string {
		return `@${this.name} = global ${this.value}`;
	}
}
