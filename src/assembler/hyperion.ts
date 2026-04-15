import { AssemblerBundle, BaseAssembler } from "./base.js";


class HyperionAssembler extends BaseAssembler {
	constructor() {
		super();
	}

	assemble(ir: any[]): AssemblerBundle {
		return {
			bytecode: this.bytecode,
			meta: this.meta,
		};
	}
}

export { HyperionAssembler };