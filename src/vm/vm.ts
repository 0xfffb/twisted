import { tsConstructSignatureDeclaration } from "@babel/types";
import { Opcode } from "../constant.js";
import Context from "./context/context.js";
import Frame from "./context/frame/frame.js";
import BytecodeReader from "./reader.js";

class VM {
	private context: Context;
	private reader: BytecodeReader;
	private dependencies: object[];

	constructor(bytecode: number[], dependencies: object[]) {
		this.context = new Context();
		this.reader = new BytecodeReader(bytecode);
		this.dependencies = dependencies;
	}

	public execute() {
		while (this.reader.hasNext()) {
			const opcode = this.reader.read();
			this._execute(opcode);
		}
		return this.context.frame.stack.peek();
	}

	private _execute(opcode: Opcode) {
		switch (opcode) {
			case Opcode.Push:
				this.context.frame.stack.push(this.reader.read());
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
			case Opcode.Equal: {
				const a = this.context.frame.stack.pop();
				const b = this.context.frame.stack.pop();
				this.context.frame.stack.push(a === b);
				break;
			}
			case Opcode.Jmp: {
				const target = this.reader.read();
				this.reader.jump(target);
				break;
			}
			case Opcode.JmpIf: {
				const condition = this.context.frame.stack.pop();
				const target = this.reader.read();
				if (condition) {
					this.reader.jump(target);
				}
				break;
			}
			case Opcode.Store: {
				const value = this.context.frame.stack.pop();
				const index = this.reader.read();
				this.context.frame.variables.set(index, value);
				break;
			}
			case Opcode.Load: {
				const index = this.reader.read();
				const value = this.context.frame.variables.get(index);
				this.context.frame.stack.push(value);
				break;
			}
			case Opcode.Apply: {
				const array = this.context.frame.stack.pop();
				// const _this = this.context.frame.stack.pop();
				const _function = this.context.frame.stack.pop();
				// const value = _function.apply(_this, array);
				const value = _function(array);
				this.context.frame.stack.push(value);
				break;
			}
			case Opcode.Dependency: {
				const index = this.reader.read();
				const dependency = this.dependencies[index];
				console.log("🤖 Dependency index: %s, dependency: %s", index);
				this.context.frame.stack.push(dependency);
				break;
			}
			case Opcode.Property: {
				const dependency = this.context.frame.stack.pop();
				const property = this.reader.read();
				console.log("🤖 Property: %s", property);
				this.context.frame.stack.push(dependency[property]);
				break;
			}
			case Opcode.PushFrame: {
				const pc = this.reader.getPc();
				const frame = new Frame(pc);
				this.context.pushFrame(frame);
				break;
			}
			case Opcode.PopFrame: {
				const frame = this.context.popFrame();
				this.reader.jump(frame.getTracebackPc() + 1);
				this.context.frame.stack.push(frame.stack.pop());
				break;
			}
			case Opcode.BuildArray: {
				const length = this.reader.read();
				console.log("🤖 BuildArray: %s", length);
				const array = [];
				for (let i = 0; i < length; i++) {
					array.unshift(this.context.frame.stack.pop());
				}
				this.context.frame.stack.push(array);
				break;
			}
		}
	}
}

export default VM;
