
class Stack {
	private stack: any[];

	constructor() {
		this.stack = [];
	}

	public push(value: any): void {
		this.stack.push(value);
	}
	
	public pop(): any {
		if (this.isEmpty()) {
			throw new Error("🤖 Stack is empty");
		}
		return this.stack.pop();
	}

	public peek(): any {
		return this.stack[this.stack.length - 1];
	}

	public size(): number {
		return this.stack.length;
	}

	public isEmpty(): boolean {
		return this.stack.length === 0;
	}
}

export default Stack;