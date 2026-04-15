import type { BasicBlock } from "../../block.js";
import { Terminator } from "./terminator.js";

export class JmpTerminator extends Terminator {
	readonly kind = "Jmp" as const;
	constructor(public readonly dest: BasicBlock) {
		super();
	}
	toString(): string {
		return `jmp ${this.dest.name}`;
	}
}
