class Variables {
	private variables: Map<number, any>;

	constructor() {
		this.variables = new Map();
	}

	public get(index: number): any {
		if (!this.has(index)) {
			throw new Error(`Variable index out of bounds for index: ${index}`);
		}
		return this.variables.get(index);
	}

	public set(index: number, value: any): void {
		this.variables.set(index, value);
	}

	public has(index: number): boolean {
		return this.variables.has(index);
	}

}
export default Variables;