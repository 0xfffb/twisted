import { Constant } from "../constant.js";

export abstract class GlobalValue extends Constant {
	readonly isDeclaration: boolean = false;

	constructor(public readonly name: string) {
		super();
	}

	abstract dump(): string;

	toString(): string {
		return `@${this.name}`;
	}
}
