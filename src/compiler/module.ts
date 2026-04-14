import type { GlobalValue } from "./value/constant/global/index.js";
import { GlobalVariable, IRFunction } from "./value/constant/global/index.js";
import { Value } from "./value/value.js";

class IRModule {
	readonly name: string;
	readonly functions: IRFunction[];
	readonly globals: GlobalVariable[];

	constructor(name: string) {
		this.name = name;
		this.functions = [];
		this.globals = [];
	}

	addFunction(fn: IRFunction): void {
		this.functions.push(fn);
	}

	addGlobal(name: string, value: Value): void {
		this.globals.push(new GlobalVariable(name, value));
	}

	getFunction(name: string): IRFunction | undefined {
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

export { IRModule };
