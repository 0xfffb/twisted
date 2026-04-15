import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class ForInInitInstruction extends Instruction {
	readonly kind = "ForInInit" as const;
	constructor(
		id: number,
		public readonly obj: Value,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = for_in_init ${this.obj}`;
	}
}

export class ForInHasInstruction extends Instruction {
	readonly kind = "ForInHas" as const;
	constructor(
		id: number,
		public readonly iter: Value,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = for_in_has ${this.iter}`;
	}
}

export class ForInNextInstruction extends Instruction {
	readonly kind = "ForInNext" as const;
	constructor(
		id: number,
		public readonly iter: Value,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = for_in_next ${this.iter}`;
	}
}
