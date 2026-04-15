import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export type ObjectProp = { key: string; value: Value };

export class ObjectInstruction extends Instruction {
	readonly kind = "Object" as const;
	constructor(id: number, public readonly props: ObjectProp[]) {
		super(id);
	}
	dump(): string {
		const pairs = this.props.map(({ key, value }) => `"${key}": ${value}`).join(", ");
		return `%${this.id} = object { ${pairs} }`;
	}
}
