import Stack from "./stack.js";
import Variables from "./variables.js";


class Frame {
	public stack: Stack;
	public variables: Variables;
	private parameters: any[];
	private tracebackPc?: number;

	constructor() {
		this.stack = new Stack();
		this.variables = new Variables();
		this.parameters = [];
		this.tracebackPc = undefined;
	}

	public getParameter(index: number) {
		try {
			return this.parameters[index];
		} catch (error) {
			throw new Error(`Get parameter index out of bounds for index: ${index}`);
		}
	}

}

export default Frame;
