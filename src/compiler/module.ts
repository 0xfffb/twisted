import { GlobalVariable } from "./value/constant/global.js";
import { IrFunction } from "./value/constant/function.js";
import { Value } from "./value/value.js";

class Module {
	readonly name: string;
	readonly functions: Value[];
	readonly globals: Value[];

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
		return this.functions.find((fn) => fn.kind === "Function" && (fn as IrFunction).name === name) as IrFunction | undefined;
	}

	dump(): string {
		const lines: string[] = [`; Module: ${this.name}`];
		for (const g of this.globals) {
			lines.push((g as GlobalVariable).dump());
		}
		if (this.globals.length > 0) lines.push("");
		for (const fn of this.functions) {
			lines.push((fn as IrFunction).dump());
			lines.push("");
		}
		return lines.join("\n");
	}
}

export { GlobalVariable, Module };
