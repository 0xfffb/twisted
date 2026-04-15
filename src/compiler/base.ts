abstract class BaseCompiler {
	protected source: string;

	constructor(source: string) {
		this.source = source;
	}

	abstract compile(): any;
}

export { BaseCompiler };
