import type { Value } from "../../value.js";
import { Terminator } from "./terminator.js";

export class ThrowTerminator extends Terminator {
	readonly kind = "Throw" as const;
	constructor(public readonly value: Value) {
		super();
	}
	toString(): string {
		return `throw ${this.value}`;
	}
}
