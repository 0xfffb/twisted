
class Stack {
	private stack: any[];

	constructor() {
		this.stack = [];
	}

	public push(value: any) {
		this.stack.push(value);
	}
	
	public pop() {
		if (this.isEmpty()) {
			throw new Error("🤖 Stack is empty");
		}
		return this.stack.pop();
	}

	public peek() {
		return this.stack[this.stack.length - 1];
	}

	public size() {
		return this.stack.length;
	}

	public isEmpty() {
		return this.stack.length === 0;
	}
}

export default Stack;