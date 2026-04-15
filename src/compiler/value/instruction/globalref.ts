import { Instruction } from "./instruction.js";

export class GlobalRefInstruction extends Instruction {
	readonly kind = "GlobalRef" as const;
	constructor(id: number, public readonly name: string) { super(id); }
	dump(): string { return `%${this.id} = global_ref "${this.name}"`; }
}

export class ThisInstruction extends Instruction {
	readonly kind = "This" as const;
	constructor(id: number) { super(id); }
	dump(): string { return `%${this.id} = this`; }
}
