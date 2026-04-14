import { GlobalValue } from "./value.js";
import { Value } from "../../value.js";

class GlobalVariable extends GlobalValue {
	readonly kind = "GlobalVariable" as const;
	public readonly value: Value;

	constructor(
		public readonly name: string,
		value: Value,
	) {
		super(name);
		this.value = value;
	}

	toString(): string {
		return `@${this.name}`;
	}

	dump(): string {
		return `@${this.name} = global ${this.value}`;
	}
}

export { GlobalVariable };