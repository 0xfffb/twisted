import { BaseCompiler } from "./base.js";


class HyperionCompiler extends BaseCompiler {
	constructor(source: string) {
		super(source);
	}

	compile(): any[] {
		throw new Error("Not implemented");
	}
}

export { HyperionCompiler };