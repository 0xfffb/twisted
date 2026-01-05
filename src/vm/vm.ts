import Opcode from "../constant.js";
import Context from "./context.js";

class VM {
	private context: Context;
	private pc: number;
	private dependencies: object[];

	constructor(dependencies: object[]) {
		this.context = new Context();
		this.pc = 0;
		this.dependencies = dependencies;
	}

	public execute(bytecode: number[]) {
		this.pc = 0;
		while (this.pc < bytecode.length) {
			const opcode = bytecode[this.pc];
			switch (opcode) {
				case Opcode.Push:
					this.context.frame.stack.push(bytecode[this.pc + 1]);
					this.pc += 1;
					break;
				case Opcode.Pop:
					this.context.frame.stack.pop();
					break;
				case Opcode.Add:
					const a = this.context.frame.stack.pop();
					const b = this.context.frame.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.context.frame.stack.push(a + b);
					} else {
						throw new Error("Invalid operands for Add");
					}
					break;
				case Opcode.Sub: {
					const a = this.context.frame.stack.pop();
					const b = this.context.frame.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.context.frame.stack.push(a - b);
					} else {
						throw new Error("Invalid operands for Sub");
					}
					break;
				}
				case Opcode.Mul: {
					const a = this.context.frame.stack.pop();
					const b = this.context.frame.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.context.frame.stack.push(a * b);
					} else {
						throw new Error("Invalid operands for Mul");
					}
					break;
				}
				case Opcode.Div: {
					const a = this.context.frame.stack.pop();
					const b = this.context.frame.stack.pop();
					if (typeof a === "number" && typeof b === "number") {
						this.context.frame.stack.push(a / b);
					} else {
						throw new Error("Invalid operands for Div");
					}
					break;
				}
				case Opcode.Jmp: {
					const target = bytecode[this.pc + 1];
					this.pc = target;
					break;
				}
				case Opcode.JmpIf: {
					const condition = this.context.frame.stack.pop();
					const target = bytecode[this.pc + 1];
					if (condition) {
						this.pc = target;
					} else {
						this.pc += 1;
					}
					break;
				}
				case Opcode.Store: {
					const value = this.context.frame.stack.pop();
					const index = bytecode[this.pc + 1];
					this.context.frame.variables.set(index, value);
					this.pc += 1;
					break;
				}
				case Opcode.Load: {
					const index = bytecode[this.pc + 1];
					const value = this.context.frame.variables.get(index);
					this.context.frame.stack.push(value);
					this.pc += 1;
					break;
				}
				case Opcode.Call: {
					const argsLength = bytecode[this.pc + 1];
					var args = [];
					for (let i = 0; i < argsLength; i++) {
						args.push(this.context.frame.stack.pop());
					}
					args.reverse();
					const dependency = this.context.frame.stack.pop();
					console.log("🤖 Calling dependency: %s", dependency);
					dependency(...args);
					this.pc += 1;
					break;
				}
				case Opcode.Dependency: {
					const index = bytecode[this.pc + 1];
					const dependency = this.dependencies[index];
					console.log("🤖 Dependency index: %s, dependency: %s", index);
					this.context.frame.stack.push(dependency);
					this.pc += 1;
					break;
				}
				case Opcode.Property: {
					const dependency = this.context.frame.stack.pop();
					const property = bytecode[this.pc + 1];
					this.context.frame.stack.push(dependency[property]);
					this.pc += 1;
					break;
				}
			}
			this.pc += 1;
		}
		return this.context.frame.stack.peek();
	}

	private _execute(opcode: Opcode) {
	}
}

export default VM;
