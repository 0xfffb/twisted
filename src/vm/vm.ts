import { Opcode } from "../constant.js";
import Context from "./context/context.js";
import Frame from "./context/frame/frame.js";
import BytecodeReader from "./reader.js";

class VM {
	private context: Context;
	private reader: BytecodeReader;
	private dependencies: object[];
	private meta: string[];

	constructor(bytecode: number[], meta: string[] = [], dependencies: object[] = [window, console]) {
		this.context = new Context();
		this.reader = new BytecodeReader(bytecode);
		this.dependencies = dependencies;
		this.meta = meta;
	}

	public async execute() {
		while (this.reader.hasNext()) {
			const opcode = this.reader.read();
			await this._execute(opcode);
		}
		return this.context.frame.stack.peek();
	}

	private async _execute(opcode: Opcode) {
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
			case Opcode.BitOr: {
				const a = this.context.frame.stack.pop();
				const b = this.context.frame.stack.pop();
				if (typeof a === "number" && typeof b === "number") {
					this.context.frame.stack.push(b | a);
				} else {
					throw new Error("Invalid operands for BitOr");
				}
				break;
			}
			case Opcode.ShiftLeft: {
				const a = this.context.frame.stack.pop();
				const b = this.context.frame.stack.pop();
				if (typeof a === "number" && typeof b === "number") {
					this.context.frame.stack.push(b << a);
				} else {
					throw new Error("Invalid operands for ShiftLeft");
				}
				break;
			}
			case Opcode.ShiftRightUnsigned: {
				const a = this.context.frame.stack.pop();
				const b = this.context.frame.stack.pop();
				if (typeof a === "number" && typeof b === "number") {
					this.context.frame.stack.push(b >>> a);
				} else {
					throw new Error("Invalid operands for ShiftRightUnsigned");
				}
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
			case Opcode.LoadMeta: {
				const index = this.reader.read();
				const value = this.meta[index];
				this.context.frame.stack.push(value);
				break;
			}
			case Opcode.Apply: {
				const _func = this.context.frame.stack.pop();
				const _this = this.context.frame.stack.pop();
				const _args = this.context.frame.stack.pop();
				const _return = _func.apply(_this, _args);
				this.context.frame.stack.push(_return);
				break;
			}
			case Opcode.Await: {
				const value = this.context.frame.stack.pop();
				const awaited = await Promise.resolve(value);
				this.context.frame.stack.push(awaited);
				break;
			}
			case Opcode.Construct: {
				const _ctor = this.context.frame.stack.pop();
				const _args = this.context.frame.stack.pop();
				const _instance = Reflect.construct(_ctor as Function, _args as unknown[]);
				this.context.frame.stack.push(_instance);
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
				const propertyIndex = this.reader.read();
				const property = this.meta[propertyIndex];
				console.log("🤖 Property: %s", property);
				this.context.frame.stack.push(dependency[property]);
				break;
			}
			case Opcode.PushFrame: {
				const args = this.context.frame.stack.pop();
				const pc = this.reader.getPc();
				const frame = new Frame(pc, args);
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
			case Opcode.BuildObject: {
				const length = this.reader.read();
				console.log("🤖 BuildObject: %s", length);
				const object: Record<string, unknown> = {};
				for (let i = 0; i < length; i++) {
					const value = this.context.frame.stack.pop();
					const key = this.context.frame.stack.pop();
					object[key] = value;
				}
				this.context.frame.stack.push(object);
				break;
			}
			case Opcode.LoadParameter: {
				const index = this.reader.read();
				const parameter = this.context.frame.getParameter(index);
				this.context.frame.stack.push(parameter);
				break;
			}
			case Opcode.Halt:
				break;
		}
	}
}

export default VM;
