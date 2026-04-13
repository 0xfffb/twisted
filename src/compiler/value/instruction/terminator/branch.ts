import type { Value } from "../../value.js";
import { Terminator } from "./terminator.js";

export class BranchTerminator extends Terminator {
	readonly kind = "Branch" as const;
	constructor(
		public readonly cond: Value,
		public readonly ifTrue: number,
		public readonly ifFalse: number,
	) {
		super();
	}
	toString(): string {
		return `br ${this.cond}, block_${this.ifTrue}, block_${this.ifFalse}`;
	}
}
