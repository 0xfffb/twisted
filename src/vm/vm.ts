import { OPCODE } from "../constant.js";

class VM {
	private stack: any[];
	private locals: any[];
	private globals: any[];
	private pc: number;
	private functions: { [key: number]: (v: any) => void };

	constructor() {
		this.stack = [];
		this.locals = [];
		this.globals = [];
		this.pc = 0;
		this.functions = {
			0: (v) => console.log("console.log: ", v),
		};
	}

	execute(bytecode: number[]) {
		this.stack = [];
		this.locals = [];
		this.globals = [];
		this.pc = 0;
		while (this.pc < bytecode.length) {
			const opcode = bytecode[this.pc];
			switch (opcode) {
				// stack commands
				case OPCODE.Push:
					this.stack.push(bytecode[this.pc + 1]);
					this.pc += 1;
					break;
				case OPCODE.Pop:
					this.stack.pop();
					break;
				// arithmetic commands
				case OPCODE.Add:
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a + b);
					} else {
						throw new Error("Invalid operands for Add");
					}
					break;
				case OPCODE.Sub: {
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a - b);
					} else {
						throw new Error("Invalid operands for Sub");
					}
					break;
				}
				case OPCODE.Mul: {
					const a = this.stack.pop();
					const b = this.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.stack.push(a * b);
					} else {
						throw new Error("Invalid operands for Mul");
					}
					break;
				}
				case OPCODE.Div: {
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
				case OPCODE.Jmp: {
					const target = bytecode[this.pc + 1];
					this.pc = target;
					break;
				}
				case OPCODE.JmpIf: {
					const condition = this.stack.pop();
					const target = bytecode[this.pc + 1];
					if (condition) {
						this.pc = target;
					} else {
						this.pc += 1;
					}
					break;
				}
				// local commands
				case OPCODE.LocalStore: {
					const value = this.stack.pop();
					const index = bytecode[this.pc + 1];
					this.locals[index] = value;
					this.pc += 1;
					break;
				}
				case OPCODE.LocalLoad: {
					const index = bytecode[this.pc + 1];
					const value = this.locals[index];
					this.stack.push(value);
					this.pc += 1;
					break;
				}

				// global commands
				case OPCODE.GlobalStore: {
					const value = this.stack.pop();
					const index = bytecode[this.pc + 1];
					this.globals[index] = value;
					this.pc += 1;
					break;
				}
				case OPCODE.GlobalLoad: {
					const index = bytecode[this.pc + 1];
					const value = this.globals[index];
					this.stack.push(value);
					this.pc += 1;
					break;
				}
				case OPCODE.Call: {
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
