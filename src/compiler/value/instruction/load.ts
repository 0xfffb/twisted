import { Instruction } from "./instruction.js";

export class LoadInstruction extends Instruction {
	readonly kind = "Load" as const;
	constructor(
		id: number,
		public readonly slot: number,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = load slot[${this.slot}]`;
	}
}
