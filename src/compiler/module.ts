import { IrFunction } from "./value/constant/function.js";

interface GlobalVariable {
	name: string;
	value: unknown;
}

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

	addGlobal(name: string, value: unknown): void {
		this.globals.push({ name, value });
	}

	getFunction(name: string): IrFunction | undefined {
		return this.functions.find((fn) => fn.name === name);
	}

	dump(): string {
		const lines: string[] = [`; Module: ${this.name}`];
		for (const g of this.globals) {
			lines.push(`@${g.name} = ${JSON.stringify(g.value)}`);
		}
		if (this.globals.length > 0) lines.push("");
		for (const fn of this.functions) {
			lines.push(fn.dump());
			lines.push("");
		}
		return lines.join("\n");
	}
}

export type { GlobalVariable };
export { Module };
