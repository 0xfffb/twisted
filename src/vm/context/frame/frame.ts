import Stack from "./stack.js";
import Variables from "./variables.js";

class Frame {
	public stack: Stack;
	public variables: Variables;
	public captures: any[];
	private parameters: any[];
	private tracebackPc?: number;

	constructor(tracebackPc?: number, parameters?: any[], captures?: any[]) {
		this.stack = new Stack();
		this.variables = new Variables();
		this.parameters = parameters ?? [];
		this.captures = captures ?? [];
		this.tracebackPc = tracebackPc;
	}

	public getParameter(index: number): any {
		try {
			return this.parameters[index];
		} catch (error) {
			throw new Error(`Get parameter index out of bounds for index: ${index}`);
		}
	}

	public getParameters(): any[] {
		return [...this.parameters];
	}

	public getTracebackPc(): number {
		if (!this.tracebackPc) {
			throw new Error("🤖 Traceback PC is not set");
		}
		return this.tracebackPc;
	}
}

export default Frame;
