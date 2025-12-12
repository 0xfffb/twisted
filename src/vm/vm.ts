import { Opcode } from "../constant.js";

class VM {
	private stack: any[];
	private globals: any[];
	private pc: number;
	private functions: { [key: number]: (v: any) => void };

	constructor() {
		this.stack = [];
		this.globals = [];
		this.pc = 0;
		this.functions = {
			0: (v) => console.log("console.log: ", v),
		};
	}

	execute(bytecode: number[]) {
		this.stack = [];
		this.globals = [];
		this.pc = 0;
		while (this.pc < bytecode.length) {
			const opcode = bytecode[this.pc];
			switch (opcode) {
				// stack commands
				case Opcode.Push:
					this.stack.push(bytecode[this.pc + 1]);
					this.pc += 1;
					break;
				case Opcode.Pop:
					this.stack.pop();
					break;
				// arithmetic commands
				case Opcode.Add:
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a + b);
					} else {
						throw new Error("Invalid operands for Add");
					}
					break;
				case Opcode.Sub: {
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a - b);
					} else {
						throw new Error("Invalid operands for Sub");
					}
					break;
				}
				case Opcode.Mul: {
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a * b);
					} else {
						throw new Error("Invalid operands for Mul");
					}
					break;
				}
				case Opcode.Div: {
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a / b);
					} else {
						throw new Error("Invalid operands for Div");
					}
					break;
				}
				// control flow commands
				case Opcode.Jmp: {
					const target = bytecode[this.pc + 1];
					this.pc = target;
					break;
				}
				case Opcode.JmpIf: {
					const condition = this.stack.pop();
					const target = bytecode[this.pc + 1];
					if (condition) {
						this.pc = target;
					} else {
						this.pc += 1;
					}
					break;
				}
				// global commands
				case Opcode.Store: {
					const value = this.stack.pop();
					const index = bytecode[this.pc + 1];
					this.globals[index] = value;
					this.pc += 1;
					break;
				}
				case Opcode.Load: {
					const index = bytecode[this.pc + 1];
					const value = this.globals[index];
					this.stack.push(value);
					this.pc += 1;
					break;
				}
				case Opcode.RuntimeCall: {
					const functionIndex = bytecode[this.pc + 1];
					this.pc += 1;
					const args = this.stack.pop();
					const func = this.functions[functionIndex];
					if (!func) {
						throw new Error(`Function not found: ${functionIndex}`);
					}
					const result = func(args);
					if (result !== undefined) {
						this.stack.push(result);
					}
					break;
				}
			}
			this.pc += 1;
		}
		return this.stack[this.stack.length - 1];
	}
}

export default VM;
