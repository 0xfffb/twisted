import type { BasicBlock } from "../block.js";
import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export type PhiIncoming = { block: BasicBlock; value: Value };

export class PhiInstruction extends Instruction {
	readonly kind = "Phi" as const;
	constructor(
		id: number,
		public readonly incoming: PhiIncoming[],
	) {
		super(id);
	}
	dump(): string {
		const ins = this.incoming.map(({ block, value }) => `[${value}, ${block.name}]`).join(", ");
		return `%${this.id} = phi ${ins}`;
	}
}
