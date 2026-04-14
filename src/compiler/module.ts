import type { GlobalValue } from "./value/constant/global/index.js";
import { GlobalVariable, IrFunction } from "./value/constant/global/index.js";
import { Value } from "./value/value.js";

class Module {
	readonly name: string;
	readonly functions: IrFunction[];
	readonly globals: GlobalVariable[];

	constructor(name: string) {
		this.name = name;
		this.functions = [];
		this.globals = [];
	}

	addFunction(fn: IrFunction): void {
		this.functions.push(fn);
	}

	addGlobal(name: string, value: Value): void {
		this.globals.push(new GlobalVariable(name, value));
	}

	getFunction(name: string): IrFunction | undefined {
		return this.functions.find((fn) => fn.name === name);
	}

	dump(): string {
		const lines: string[] = [`; Module: ${this.name}`];
		for (const g of this.globals) {
			lines.push(g.dump());
		}
		if (this.globals.length > 0) lines.push("");
		for (const fn of this.functions) {
			lines.push(fn.dump());
			lines.push("");
		}
		return lines.join("\n");
	}
}

export type { GlobalValue } from "./value/constant/global/index.js";
export { GlobalVariable, IrFunction, Module };
export type { GlobalValue as Global };
