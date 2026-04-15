import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class GetPropInstruction extends Instruction {
	readonly kind = "GetProp" as const;
	constructor(
		id: number,
		public readonly obj: Value,
		public readonly key: string,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = getprop ${this.obj}, "${this.key}"`;
	}
}

export class GetElemInstruction extends Instruction {
	readonly kind = "GetElem" as const;
	constructor(
		id: number,
		public readonly obj: Value,
		public readonly key: Value,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = getelem ${this.obj}, ${this.key}`;
	}
}

export class SetPropInstruction extends Instruction {
	readonly kind = "SetProp" as const;
	constructor(
		id: number,
		public readonly obj: Value,
		public readonly key: string,
		public readonly value: Value,
	) {
		super(id);
	}
	dump(): string {
		return `setprop ${this.obj}, "${this.key}", ${this.value}`;
	}
}

export class SetElemInstruction extends Instruction {
	readonly kind = "SetElem" as const;
	constructor(
		id: number,
		public readonly obj: Value,
		public readonly key: Value,
		public readonly value: Value,
	) {
		super(id);
	}
	dump(): string {
		return `setelem ${this.obj}, ${this.key}, ${this.value}`;
	}
}

export class DeletePropInstruction extends Instruction {
	readonly kind = "DeleteProp" as const;
	constructor(
		id: number,
		public readonly obj: Value,
		public readonly key: string,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = delete_prop ${this.obj}, "${this.key}"`;
	}
}

export class DeleteElemInstruction extends Instruction {
	readonly kind = "DeleteElem" as const;
	constructor(
		id: number,
		public readonly obj: Value,
		public readonly key: Value,
	) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = delete_elem ${this.obj}, ${this.key}`;
	}
}
