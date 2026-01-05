class Variables {
	private variables: Map<number, any>;

	constructor() {
		this.variables = new Map();
	}

	public get(index: number) {
		if (!this.has(index)) {
			throw new Error(`Variable index out of bounds for index: ${index}`);
		}
		return this.variables.get(index);
	}

	public set(index: number, value: any) {
		if (this.has(index)) {
			throw new Error(`Variable index already declared for index: ${index}`);
		}
		this.variables.set(index, value);
	}

	public has(index: number) {
		return this.variables.has(index);
	}

}
export default Variables;