import { AssemblerBundle, BaseAssembler } from "./base.js";


class HyperionAssembler extends BaseAssembler {
	constructor() {
		super();
	}

	assemble(input: string): AssemblerBundle {
		return {
			bytecode: this.bytecode,
			meta: this.meta,
		};
	}
}

export { HyperionAssembler };