import { Opcode } from "../constant.js";
import Context from "./context/context.js";
import Frame from "./context/frame/frame.js";
import BytecodeReader from "./reader.js";

/** 闭包值的运行时标记（同时适用于函数和普通对象） */
interface ClosureValue {
	$pc: number;
	$caps: unknown[];
}

/** 检测一个值是否为 VM 闭包（兼容 function 和 object 两种形式） */
function isClosure(v: unknown): v is ClosureValue {
	return v != null && typeof (v as any).$pc === "number";
}

class VM {
	private context: Context;
	private reader: BytecodeReader;
	private readonly _bytecode: number[];
	private dependencies: object[];
	private meta: string[];
	private handlers: Record<number, any>;

	constructor(bytecode: number[], meta: string[] = [], dependencies: object[] = [window, console]) {
		this._bytecode = bytecode;
		this.context = new Context();
		this.reader = new BytecodeReader(bytecode);
		this.dependencies = dependencies;
		this.meta = meta;
		this.handlers = {
			[Opcode.Push]: this.opPush.bind(this),
			[Opcode.PushNull]: this.opPushNull.bind(this),
			[Opcode.Pop]: this.opPop.bind(this),
			[Opcode.Add]: this.opAdd.bind(this),
			[Opcode.Sub]: this.opSub.bind(this),
			[Opcode.Mul]: this.opMul.bind(this),
			[Opcode.Div]: this.opDiv.bind(this),
			[Opcode.Equal]: this.opEqual.bind(this),
			[Opcode.BitOr]: this.opBitOr.bind(this),
			[Opcode.BitXor]: this.opBitXor.bind(this),
			[Opcode.ShiftLeft]: this.opShiftLeft.bind(this),
			[Opcode.ShiftRightUnsigned]: this.opShiftRightUnsigned.bind(this),
			[Opcode.LessThan]: this.opLessThan.bind(this),
			[Opcode.GreaterThan]: this.opGreaterThan.bind(this),
			[Opcode.GreaterThanOrEqual]: this.opGreaterThanOrEqual.bind(this),
			[Opcode.LessThanOrEqual]: this.opLessThanOrEqual.bind(this),
			[Opcode.Jmp]: this.opJmp.bind(this),
			[Opcode.JmpIf]: this.opJmpIf.bind(this),
			[Opcode.Store]: this.opStore.bind(this),
			[Opcode.Load]: this.opLoad.bind(this),
			[Opcode.LoadMeta]: this.opLoadMeta.bind(this),
			[Opcode.Apply]: this.opApply.bind(this),
			[Opcode.Await]: this.opAwait.bind(this),
			[Opcode.Construct]: this.opConstruct.bind(this),
			[Opcode.Dependency]: this.opDependency.bind(this),
			[Opcode.Property]: this.opProperty.bind(this),
			[Opcode.SetProperty]: this.opSetProperty.bind(this),
			[Opcode.GetElement]: this.opGetElement.bind(this),
			[Opcode.SetElement]: this.opSetElement.bind(this),
			[Opcode.PushFrame]: this.opPushFrame.bind(this),
			[Opcode.PopFrame]: this.opPopFrame.bind(this),
			[Opcode.BuildArray]: this.opBuildArray.bind(this),
			[Opcode.BuildObject]: this.opBuildObject.bind(this),
			[Opcode.LoadParameter]: this.opLoadParameter.bind(this),
			[Opcode.MakeClosure]: this.opMakeClosure.bind(this),
			[Opcode.LoadCapture]: this.opLoadCapture.bind(this),
			[Opcode.InvokeValue]: this.opInvokeValue.bind(this),
			[Opcode.Debugger]: this.opDebugger.bind(this),
			[Opcode.Not]: this.opNot.bind(this),
			[Opcode.Halt]: this.opHalt.bind(this),
		};
	}

	/**
	 * 从外部直接调用一个闭包。
	 * 创建新的执行上下文，从 entryPc 开始，携带捕获变量和参数。
	 * 当底层帧的 PopFrame 触发（tracebackPc 未设置）时返回结果。
	 */
	public async executeClosure(entryPc: number, caps: unknown[], args: unknown[]): Promise<unknown> {
		this.reader.jump(entryPc);
		const closureFrame = new Frame(undefined, args, caps);
		this.context.pushFrame(closureFrame);

		while (this.reader.hasNext()) {
			const opcode = this.reader.read();
			if (opcode === Opcode.Halt) break;
			if (opcode === Opcode.PopFrame) {
				const poppedFrame = this.context.popFrame();
				let returnPc: number;
				try {
					returnPc = poppedFrame.getTracebackPc();
				} catch (_) {
					// tracebackPc 未设置 → 这是闭包自身的返回出口
					return poppedFrame.stack.pop();
				}
				this.reader.jump(returnPc);
				this.context.frame.stack.push(poppedFrame.stack.pop());
			} else {
				await this.handlers[opcode]?.();
			}
		}
		return undefined;
	}

	public async execute() {
		while (this.reader.hasNext()) {
			const opcode = this.reader.read();
			await this.handlers[opcode]?.();
		}
		return this.context.frame.stack.peek();
	}

	// private async _execute(opcode: Opcode) {
	// 	switch (opcode) {
	// 		case Opcode.Push:
	// 			return this.opPush();
	// 		case Opcode.PushNull:
	// 			return this.opPushNull();
	// 		case Opcode.Pop:
	// 			return this.opPop();
	// 		case Opcode.Add:
	// 			return this.opAdd();
	// 		case Opcode.Sub:
	// 			return this.opSub();
	// 		case Opcode.Mul:
	// 			return this.opMul();
	// 		case Opcode.Div:
	// 			return this.opDiv();
	// 		case Opcode.Equal:
	// 			return this.opEqual();
	// 		case Opcode.BitOr:
	// 			return this.opBitOr();
	// 		case Opcode.BitXor:
	// 			return this.opBitXor();
	// 		case Opcode.ShiftLeft:
	// 			return this.opShiftLeft();
	// 		case Opcode.ShiftRightUnsigned:
	// 			return this.opShiftRightUnsigned();
	// 		case Opcode.LessThan:
	// 			return this.opLessThan();
	// 		case Opcode.GreaterThan:
	// 			return this.opGreaterThan();
	// 		case Opcode.GreaterThanOrEqual:
	// 			return this.opGreaterThanOrEqual();
	// 		case Opcode.LessThanOrEqual:
	// 			return this.opLessThanOrEqual();
	// 		case Opcode.Jmp:
	// 			return this.opJmp();
	// 		case Opcode.JmpIf:
	// 			return this.opJmpIf();
	// 		case Opcode.Store:
	// 			return this.opStore();
	// 		case Opcode.Load:
	// 			return this.opLoad();
	// 		case Opcode.LoadMeta:
	// 			return this.opLoadMeta();
	// 		case Opcode.Apply: {
	// 			return this.opApply();
	// 		}
	// 		case Opcode.Await:
	// 			return this.opAwait();
	// 		case Opcode.Construct:
	// 			return this.opConstruct();
	// 		case Opcode.Dependency:
	// 			return this.opDependency();
	// 		case Opcode.Property:
	// 			return this.opProperty();
	// 		case Opcode.SetProperty:
	// 			return this.opSetProperty();
	// 		case Opcode.GetElement:
	// 			return this.opGetElement();
	// 		case Opcode.SetElement:
	// 			return this.opSetElement();
	// 		case Opcode.PushFrame:
	// 			return this.opPushFrame();
	// 		case Opcode.PopFrame:
	// 			return this.opPopFrame();
	// 		case Opcode.BuildArray:
	// 			return this.opBuildArray();
	// 		case Opcode.BuildObject:
	// 			return this.opBuildObject();
	// 		case Opcode.LoadParameter:
	// 			return this.opLoadParameter();
	// 		// ── 闭包扩展 ──────────────────────────────────────────────────
	// 		case Opcode.MakeClosure:
	// 			return this.opMakeClosure();
	// 		case Opcode.LoadCapture:
	// 			return this.opLoadCapture();
	// 		case Opcode.InvokeValue:
	// 			return this.opInvokeValue();
	// 		case Opcode.Debugger:
	// 			return this.opDebugger();
	// 		case Opcode.Not:
	// 			return this.opNot();
	// 		case Opcode.Halt:
	// 			return;
	// 	}
	// }

	private opPush() {
		this.context.frame.stack.push(this.reader.read());
	}

	private opPushNull() {
		this.context.frame.stack.push(null);
	}

	private opPop() {
		this.context.frame.stack.pop();
	}

	private opAdd() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(a + b);
		} else if (typeof a === "string" || typeof b === "string") {
			this.context.frame.stack.push(String(b) + String(a));
		} else {
			throw new Error("Invalid operands for Add");
		}
	}

	private opSub() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(b - a);
		} else {
			throw new Error("Invalid operands for Sub");
		}
	}

	private opMul() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(a * b);
		} else {
			throw new Error("Invalid operands for Mul");
		}
	}

	private opDiv() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(b / a);
		} else {
			throw new Error("Invalid operands for Div");
		}
	}

	private opEqual() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		this.context.frame.stack.push(a === b);
	}

	private opBitOr() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(b | a);
		} else {
			throw new Error("Invalid operands for BitOr");
		}
	}

	private opBitXor() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(b ^ a);
		} else {
			throw new Error("Invalid operands for BitXor");
		}
	}

	private opShiftLeft() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(b << a);
		} else {
			throw new Error("Invalid operands for ShiftLeft");
		}
	}

	private opShiftRightUnsigned() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		if (typeof a === "number" && typeof b === "number") {
			this.context.frame.stack.push(b >>> a);
		} else {
			throw new Error("Invalid operands for ShiftRightUnsigned");
		}
	}

	private opLessThan() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		this.context.frame.stack.push(b < a);
	}

	private opGreaterThan() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		this.context.frame.stack.push(b > a);
	}

	private opGreaterThanOrEqual() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		this.context.frame.stack.push(b >= a);
	}

	private opLessThanOrEqual() {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		this.context.frame.stack.push(b <= a);
	}

	private opJmp() {
		const target = this.reader.read();
		this.reader.jump(target);
	}

	private opJmpIf() {
		const condition = this.context.frame.stack.pop();
		const target = this.reader.read();
		if (condition) {
			this.reader.jump(target);
		}
	}

	private opStore() {
		const value = this.context.frame.stack.pop();
		const index = this.reader.read();
		this.context.frame.variables.set(index, value);
	}

	private opLoad() {
		const index = this.reader.read();
		const value = this.context.frame.variables.get(index);
		this.context.frame.stack.push(value);
	}

	private opLoadMeta() {
		const index = this.reader.read();
		const value = this.meta[index];
		this.context.frame.stack.push(value);
	}

	private async opApply() {
		const func = this.context.frame.stack.pop();
		const thisVal = this.context.frame.stack.pop();
		const args = this.context.frame.stack.pop() as unknown[];
		if (isClosure(func)) {
			// 闭包作为 method 被调用（如 window.fetch = function(...){}），忽略 this
			const returnPc = this.reader.getPc();
			const frame = new Frame(returnPc, args, func.$caps);
			this.context.pushFrame(frame);
			this.reader.jump(func.$pc);
		} else {
			const ret = await Promise.resolve((func as Function).apply(thisVal, args));
			this.context.frame.stack.push(ret);
		}
	}

	private async opAwait() {
		const value = this.context.frame.stack.pop();
		const awaited = await Promise.resolve(value);
		this.context.frame.stack.push(awaited);
	}

	private opConstruct() {
		const ctor = this.context.frame.stack.pop();
		const args = this.context.frame.stack.pop();
		const instance = Reflect.construct(ctor as Function, args as unknown[]);
		this.context.frame.stack.push(instance);
	}

	private opDependency() {
		const index = this.reader.read();
		const dependency = this.dependencies[index];
		console.log("🤖 Dependency index: %s, dependency: %s", index);
		this.context.frame.stack.push(dependency);
	}

	private opProperty() {
		const dependency = this.context.frame.stack.pop() as Record<string, unknown>;
		const propertyIndex = this.reader.read();
		const property = this.meta[propertyIndex];
		console.log("🤖 Property: %s", property);
		this.context.frame.stack.push(dependency[property]);
	}

	private opSetProperty() {
		const value = this.context.frame.stack.pop();
		const object = this.context.frame.stack.pop() as Record<string, unknown>;
		const propertyIndex = this.reader.read();
		const property = this.meta[propertyIndex];
		object[property] = value;
		this.context.frame.stack.push(value);
	}

	private opGetElement() {
		const key = this.context.frame.stack.pop() as string | number | symbol;
		const object = this.context.frame.stack.pop() as Record<string | number | symbol, unknown>;
		this.context.frame.stack.push(object[key]);
	}

	private opSetElement() {
		const value = this.context.frame.stack.pop();
		const key = this.context.frame.stack.pop() as string | number | symbol;
		const object = this.context.frame.stack.pop() as Record<string | number | symbol, unknown>;
		object[key] = value;
		this.context.frame.stack.push(value);
	}

	private opPushFrame() {
		// 调用约定：PushFrame 后紧跟 Jmp target（共 2 字节）。
		// 返回地址 = getPc() + 2，即 Jmp 指令整体之后的首字节。
		const args = this.context.frame.stack.pop();
		const returnPc = this.reader.getPc() + 2;
		const frame = new Frame(returnPc, args);
		this.context.pushFrame(frame);
	}

	private opPopFrame() {
		const frame = this.context.popFrame();
		this.reader.jump(frame.getTracebackPc());
		this.context.frame.stack.push(frame.stack.pop());
	}

	private opBuildArray() {
		const length = this.reader.read();
		console.log("🤖 BuildArray: %s", length);
		const array = [];
		for (let i = 0; i < length; i++) {
			array.unshift(this.context.frame.stack.pop());
		}
		this.context.frame.stack.push(array);
	}

	private opBuildObject() {
		const length = this.reader.read();
		console.log("🤖 BuildObject: %s", length);
		const object: Record<string, unknown> = {};
		for (let i = 0; i < length; i++) {
			const value = this.context.frame.stack.pop();
			const key = this.context.frame.stack.pop() as string;
			object[key] = value;
		}
		this.context.frame.stack.push(object);
	}

	private opLoadParameter() {
		const index = this.reader.read();
		const parameter = this.context.frame.getParameter(index);
		this.context.frame.stack.push(parameter);
	}

	private opMakeClosure() {
		// 格式：MakeClosure <entryPc> <numCaptures> [slot0 slot1 ...]
		// 生成真正的 async 函数：VM 内部可通过 $pc/$caps 直接调度，
		// 外部 JS 调用时创建子 VM 实例执行闭包体，两者均正确工作。
		const entryPc = this.reader.read();
		const numCaptures = this.reader.read();
		const caps: unknown[] = [];
		for (let i = 0; i < numCaptures; i++) {
			const slot = this.reader.read();
			caps.push(this.context.frame.variables.get(slot));
		}
		const bytecode = this._bytecode;
		const meta = this.meta;
		const deps = this.dependencies;
		const fn = async (...args: unknown[]) => {
			// 每次外部调用都使用独立的 VM 实例，避免并发污染
			const subVm = new VM(bytecode, meta, deps);
			return subVm.executeClosure(entryPc, caps, args);
		};
		// 挂载标记供 VM 内部 isClosure 检测和直接调度
		(fn as any).$pc = entryPc;
		(fn as any).$caps = caps;
		this.context.frame.stack.push(fn);
	}

	private opLoadCapture() {
		// 从当前帧的 captures 数组按下标加载捕获值
		const index = this.reader.read();
		this.context.frame.stack.push(this.context.frame.captures[index]);
	}

	private async opInvokeValue() {
		// 调用栈上的函数值（闭包或原生函数），无 this
		// 栈序：args(下) func(上)
		const func = this.context.frame.stack.pop();
		const args = this.context.frame.stack.pop() as unknown[];
		if (isClosure(func)) {
			// 闭包：建帧、带入捕获、跳入函数体
			const returnPc = this.reader.getPc();
			const frame = new Frame(returnPc, args, func.$caps);
			this.context.pushFrame(frame);
			this.reader.jump(func.$pc);
		} else {
			// 原生函数
			const ret = await Promise.resolve((func as Function).apply(undefined, args));
			this.context.frame.stack.push(ret);
		}
	}

	private opDebugger() {
		// debugger;
	}

	private opNot() {
		const val = this.context.frame.stack.pop();
		this.context.frame.stack.push(!val);
	}

	private opHalt() {
		return;
	}
}
export default VM;
