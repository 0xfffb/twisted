import type { Value } from "../../value.js";
import { Terminator } from "./terminator.js";

export class ReturnTerminator extends Terminator {
	readonly kind = "Return" as const;
	constructor(public readonly value: Value) {
		super();
	}
	toString(): string {
		return `ret ${this.value}`;
	}
}
