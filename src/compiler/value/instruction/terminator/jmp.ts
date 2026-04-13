import { Terminator } from "./terminator.js";

export class JmpTerminator extends Terminator {
	readonly kind = "Jmp" as const;
	constructor(public readonly dest: number) {
		super();
	}
	toString(): string {
		return `jmp block_${this.dest}`;
	}
}
