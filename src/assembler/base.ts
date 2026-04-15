interface AssemblerBundle {
	bytecode: number[];
	meta: string[];
}

abstract class BaseAssembler {
	protected bytecode: number[];
	protected meta: string[];

	constructor() {
		this.bytecode = [];
		this.meta = [];
	}

	abstract assemble(ir: any[]): AssemblerBundle
}

export { BaseAssembler, type AssemblerBundle };

