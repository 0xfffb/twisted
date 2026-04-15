import { Instruction } from "./instruction.js";

export class LandingPadInstruction extends Instruction {
	readonly kind = "LandingPad" as const;

	constructor(id: number) {
		super(id);
	}

	dump(): string {
		return `%${this.id} = landingpad`;
	}
}
