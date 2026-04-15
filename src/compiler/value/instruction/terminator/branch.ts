import type { Value } from "../../value.js";
import type { BasicBlock } from "../../block.js";
import { Terminator } from "./terminator.js";

export class BranchTerminator extends Terminator {
	readonly kind = "Branch" as const;
	constructor(
		public readonly cond: Value,
		public readonly ifTrue: BasicBlock,
		public readonly ifFalse: BasicBlock,
	) {
		super();
	}
	toString(): string {
		return `br ${this.cond}, ${this.ifTrue.name}, ${this.ifFalse.name}`;
	}
}
