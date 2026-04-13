import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class PhiInstruction extends Instruction {
	readonly kind = "Phi" as const;
	constructor(
		id: number,
		public readonly incoming: { block: number; value: Value }[],
	) {
		super(id);
	}
	dump(): string {
		const ins = this.incoming.map((e) => `[${e.value}, block_${e.block}]`).join(", ");
		return `%${this.id} = phi ${ins}`;
	}
}
