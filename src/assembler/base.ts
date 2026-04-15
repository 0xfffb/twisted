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

	abstract assemble(input: any): AssemblerBundle;
}

export { BaseAssembler, type AssemblerBundle };

