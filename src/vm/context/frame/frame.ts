import Stack from "./stack.js";
import Variables from "./variables.js";

class Frame {
	public stack: Stack;
	public variables: Variables;
	public captures: any[];
	/** 当前调用的 this（宿主回调 / Apply 传入） */
	public thisValue: unknown;
	private parameters: any[];
	private tracebackPc?: number;

	constructor(
		tracebackPc?: number,
		parameters?: any[],
		captures?: any[],
		thisValue?: unknown,
	) {
		this.stack = new Stack();
		this.variables = new Variables();
		this.parameters = parameters ?? [];
		this.captures = captures ?? [];
		this.thisValue = thisValue;
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
