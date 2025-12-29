class Frame {
	private stack: any[];
	private variables: any[];
	private parameters: any[];
	private tracebackPc?: number;

	constructor() {
		this.stack = [];
		this.variables = [];
		this.parameters = [];
		this.tracebackPc = undefined;
	}

	public getVariable(index: number) {
		try {
			return this.variables[index];
		} catch (error) {
			throw new Error(`Get variable index out of bounds for index: ${index}`);
		}
	}

	public setVariable(index: number, value: any) {
		try {
			this.variables[index] = value;
		} catch (error) {
			throw new Error(`Set variable index out of bounds for index: ${index}`);
		}
	}

	public getParameter(index: number) {
		try {
			return this.parameters[index];
		} catch (error) {
			throw new Error(`Get parameter index out of bounds for index: ${index}`);
		}
	}
}

export { Frame };
