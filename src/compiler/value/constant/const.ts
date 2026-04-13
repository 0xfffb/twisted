import { Constant } from "./constant.js";

export type Literal = number | string | boolean | null;

export class ConstValue extends Constant {
	readonly kind = "Const" as const;

	constructor(public readonly literal: Literal) {
		super();
	}

	toString(): string {
		return JSON.stringify(this.literal);
	}
}
