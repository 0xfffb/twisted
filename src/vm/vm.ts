import { Opcode } from "../constant.js";
import { RuntimeProtection } from "../obfuscator/runtime.js";
import type { EncryptedMeta, Protection } from "../obfuscator/types.js";
import Context from "./context/context.js";
import Frame from "./context/frame/frame.js";
import BytecodeReader from "./reader.js";

/** 闭包值的运行时标记（同时适用于函数和普通对象） */
interface ClosureValue {
	$pc: number;
	$caps: unknown[];
}

interface ForInIteratorState {
	keys: string[];
	index: number;
}

function isClosure(v: unknown): v is ClosureValue {
	return v != null && typeof (v as any).$pc === "number";
}

class VM {
	private context: Context;
	private reader: BytecodeReader;
	private readonly _bytecode: number[];
	private dependencies: object[];
	private meta: string[] | EncryptedMeta;
	private readonly protection: Protection | null;
	private readonly runtime: RuntimeProtection;
	private readonly wireHalt: number;
	private readonly wirePopFrame: number;
	private handlers: Record<number, () => void>;

	constructor(
		bytecode: number[],
		meta: string[] | EncryptedMeta = [],
		dependencies: object[] = [window, console],
		protection: Protection | null = null,
	) {
		this._bytecode = bytecode;
		this.context = new Context();
		this.reader = new BytecodeReader(bytecode);
		this.dependencies = dependencies;
		this.meta = meta;
		this.protection = protection;
		this.runtime = new RuntimeProtection(meta, protection);
		const opcodeMap = this.runtime.opcodeMap;
		this.wireHalt = opcodeMap?.[Opcode.Halt] ?? Opcode.Halt;
		this.wirePopFrame = opcodeMap?.[Opcode.PopFrame] ?? Opcode.PopFrame;

		const logicalHandlers: Record<number, () => void> = {
			[Opcode.Push]: this.opPush.bind(this),
			[Opcode.PushNull]: this.opPushNull.bind(this),
			[Opcode.Pop]: this.opPop.bind(this),
			[Opcode.Add]: this.opAdd.bind(this),
			[Opcode.Sub]: this.opSub.bind(this),
			[Opcode.Mul]: this.opMul.bind(this),
			[Opcode.Div]: this.opDiv.bind(this),
			[Opcode.Equal]: this.opEqual.bind(this),
			[Opcode.BitOr]: this.opBitOr.bind(this),
			[Opcode.BitAnd]: this.opBitAnd.bind(this),
			[Opcode.BitXor]: this.opBitXor.bind(this),
			[Opcode.ShiftLeft]: this.opShiftLeft.bind(this),
			[Opcode.ShiftRight]: this.opShiftRight.bind(this),
			[Opcode.ShiftRightUnsigned]: this.opShiftRightUnsigned.bind(this),
			[Opcode.Mod]: this.opMod.bind(this),
			[Opcode.LessThan]: this.opLessThan.bind(this),
			[Opcode.GreaterThan]: this.opGreaterThan.bind(this),
			[Opcode.GreaterThanOrEqual]: this.opGreaterThanOrEqual.bind(this),
			[Opcode.LessThanOrEqual]: this.opLessThanOrEqual.bind(this),
			[Opcode.Instanceof]: this.opInstanceof.bind(this),
			[Opcode.In]: this.opIn.bind(this),
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
			// PopFrame / Halt 由 interpret 统一处理
			[Opcode.BuildArray]: this.opBuildArray.bind(this),
			[Opcode.BuildObject]: this.opBuildObject.bind(this),
			[Opcode.Arguments]: this.opArguments.bind(this),
			[Opcode.ForInInit]: this.opForInInit.bind(this),
			[Opcode.ForInHas]: this.opForInHas.bind(this),
			[Opcode.ForInNext]: this.opForInNext.bind(this),
			[Opcode.LoadParameter]: this.opLoadParameter.bind(this),
			[Opcode.DeleteProp]: this.opDeleteProp.bind(this),
			[Opcode.DeleteElem]: this.opDeleteElem.bind(this),
			[Opcode.MakeClosure]: this.opMakeClosure.bind(this),
			[Opcode.LoadCapture]: this.opLoadCapture.bind(this),
			[Opcode.InvokeValue]: this.opInvokeValue.bind(this),
			[Opcode.Debugger]: this.opDebugger.bind(this),
			[Opcode.Not]: this.opNot.bind(this),
			[Opcode.Typeof]: this.opTypeof.bind(this),
			[Opcode.UnaryPlus]: this.opUnaryPlus.bind(this),
			[Opcode.BitNot]: this.opBitNot.bind(this),
			[Opcode.Void]: this.opVoid.bind(this),
			[Opcode.Throw]: this.opThrow.bind(this),
			[Opcode.LandingPad]: this.opLandingPad.bind(this),
			[Opcode.LoadThis]: this.opLoadThis.bind(this),
		};

		if (opcodeMap) {
			this.handlers = {};
			for (const logical of Object.keys(logicalHandlers).map(Number)) {
				const wire = opcodeMap[logical];
				if (wire === undefined) {
					throw new Error(`VM: opcodeMap missing logical 0x${logical.toString(16)}`);
				}
				this.handlers[wire] = logicalHandlers[logical]!;
			}
		} else {
			this.handlers = logicalHandlers;
		}
	}

	/**
	 * 从外部直接调用一个闭包（同步）。
	 * @param thisArg 宿主调用时的 this（如 obj.method() / fn.call(obj)）
	 */
	public executeClosure(
		entryPc: number,
		caps: unknown[],
		args: unknown[],
		thisArg?: unknown,
	): unknown {
		this.reader.jump(entryPc);
		this.context.pushFrame(new Frame(undefined, args, caps, thisArg));
		return this.interpret({ returnOnNakedPopFrame: true });
	}

	public execute() {
		// 顶层脚本 this 对齐浏览器非模块脚本：指向注入的全局（通常为 window）
		if (this.context.frame.thisValue === undefined && this.dependencies[0] != null) {
			this.context.frame.thisValue = this.dependencies[0];
		}
		return this.interpret({ returnOnNakedPopFrame: false });
	}

	/**
	 * 统一主循环。Halt 结束；PopFrame 无 traceback 时仅在闭包模式作为返回值。
	 */
	private interpret(options: { returnOnNakedPopFrame: boolean }): unknown {
		while (this.reader.hasNext()) {
			const opcode = this.reader.read();
			if (opcode === this.wireHalt) {
				break;
			}
			if (opcode === this.wirePopFrame) {
				const popped = this.context.popFrame();
				let returnPc: number;
				try {
					returnPc = popped.getTracebackPc();
				} catch {
					if (options.returnOnNakedPopFrame) {
						return popped.stack.pop();
					}
					throw new Error("VM: PopFrame without traceback in script mode");
				}
				this.reader.jump(returnPc);
				this.context.frame.stack.push(popped.stack.pop());
				continue;
			}
			const handler = this.handlers[opcode];
			if (!handler) {
				throw new Error(`VM: unknown opcode 0x${opcode.toString(16)}`);
			}
			handler();
		}
		return options.returnOnNakedPopFrame ? undefined : this.context.frame.stack.peek();
	}

	private pop2(): [unknown, unknown] {
		const a = this.context.frame.stack.pop();
		const b = this.context.frame.stack.pop();
		return [a, b];
	}

	private push(v: unknown): void {
		this.context.frame.stack.push(v);
	}

	/** 栈序：先弹 a（右操作数），再弹 b（左操作数），计算 b ⊕ a */
	private binNum(op: (b: number, a: number) => number, name: string): void {
		const [a, b] = this.pop2();
		if (typeof a !== "number" || typeof b !== "number") {
			throw new Error(`Invalid operands for ${name}`);
		}
		this.push(op(b, a));
	}

	private binCmp(op: (b: unknown, a: unknown) => boolean): void {
		const [a, b] = this.pop2();
		this.push(op(b, a));
	}

	private opPush() {
		this.push(this.reader.read());
	}

	private opPushNull() {
		this.push(null);
	}

	private opPop() {
		this.context.frame.stack.pop();
	}

	private opAdd() {
		const [a, b] = this.pop2();
		if (typeof a === "number" && typeof b === "number") {
			this.push(a + b);
		} else if (typeof a === "string" || typeof b === "string") {
			this.push(String(b) + String(a));
		} else {
			throw new Error("Invalid operands for Add");
		}
	}

	private opSub() {
		this.binNum((b, a) => b - a, "Sub");
	}

	private opMul() {
		this.binNum((b, a) => b * a, "Mul");
	}

	private opDiv() {
		this.binNum((b, a) => b / a, "Div");
	}

	private opEqual() {
		this.binCmp((b, a) => b === a);
	}

	private opBitOr() {
		this.binNum((b, a) => b | a, "BitOr");
	}

	private opBitAnd() {
		this.binNum((b, a) => b & a, "BitAnd");
	}

	private opBitXor() {
		this.binNum((b, a) => b ^ a, "BitXor");
	}

	private opShiftLeft() {
		this.binNum((b, a) => b << a, "ShiftLeft");
	}

	private opShiftRight() {
		this.binNum((b, a) => b >> a, "ShiftRight");
	}

	private opShiftRightUnsigned() {
		this.binNum((b, a) => b >>> a, "ShiftRightUnsigned");
	}

	private opMod() {
		this.binNum((b, a) => b % a, "Mod");
	}

	private opLessThan() {
		this.binCmp((b, a) => (b as any) < (a as any));
	}

	private opGreaterThan() {
		this.binCmp((b, a) => (b as any) > (a as any));
	}

	private opGreaterThanOrEqual() {
		this.binCmp((b, a) => (b as any) >= (a as any));
	}

	private opLessThanOrEqual() {
		this.binCmp((b, a) => (b as any) <= (a as any));
	}

	private opInstanceof() {
		const [rhs, lhs] = this.pop2();
		this.push((lhs as any) instanceof (rhs as any));
	}

	private opIn() {
		const [rhs, lhs] = this.pop2();
		this.push((lhs as string | number | symbol) in (rhs as object));
	}

	private opJmp() {
		this.reader.jump(this.reader.read());
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
		this.context.frame.variables.set(this.reader.read(), value);
	}

	private opLoad() {
		this.push(this.context.frame.variables.get(this.reader.read()));
	}

	private opLoadMeta() {
		this.push(this.runtime.meta(this.reader.read()));
	}

	private opApply() {
		const func = this.context.frame.stack.pop();
		const thisVal = this.context.frame.stack.pop();
		const args = this.context.frame.stack.pop() as unknown[];
		if (isClosure(func)) {
			this.context.pushFrame(new Frame(this.reader.getPc(), args, func.$caps, thisVal));
			this.reader.jump(func.$pc);
		} else {
			this.push((func as Function).apply(thisVal, args));
		}
	}

	private opAwait() {
		throw new Error("Await is not supported: VM is synchronous");
	}

	private opConstruct() {
		const ctor = this.context.frame.stack.pop();
		const args = this.context.frame.stack.pop();
		this.push(Reflect.construct(ctor as Function, args as unknown[]));
	}

	private opDependency() {
		this.push(this.dependencies[this.reader.read()]);
	}

	private opProperty() {
		const obj = this.context.frame.stack.pop() as Record<string, unknown>;
		const key = this.runtime.meta(this.reader.read());
		this.push(obj[key]);
	}

	private opSetProperty() {
		const value = this.context.frame.stack.pop();
		const object = this.context.frame.stack.pop() as Record<string, unknown>;
		const key = this.runtime.meta(this.reader.read());
		object[key] = value;
		this.push(value);
	}

	private opGetElement() {
		const key = this.context.frame.stack.pop() as string | number | symbol;
		const object = this.context.frame.stack.pop() as Record<string | number | symbol, unknown>;
		this.push(object[key]);
	}

	private opSetElement() {
		const value = this.context.frame.stack.pop();
		const key = this.context.frame.stack.pop() as string | number | symbol;
		const object = this.context.frame.stack.pop() as Record<string | number | symbol, unknown>;
		object[key] = value;
		this.push(value);
	}

	private opPushFrame() {
		// 调用约定：PushFrame 后紧跟 Jmp target（共 2 槽）。
		// 返回地址 = getPc() + 2，即 Jmp 整体之后。
		const args = this.context.frame.stack.pop();
		this.context.pushFrame(new Frame(this.reader.getPc() + 2, args));
	}

	private opBuildArray() {
		const length = this.reader.read();
		const array = new Array(length);
		for (let i = length - 1; i >= 0; i--) {
			array[i] = this.context.frame.stack.pop();
		}
		this.push(array);
	}

	private opBuildObject() {
		const length = this.reader.read();
		const object: Record<string, unknown> = {};
		for (let i = 0; i < length; i++) {
			const value = this.context.frame.stack.pop();
			const key = this.context.frame.stack.pop() as string;
			object[key] = value;
		}
		this.push(object);
	}

	private opArguments() {
		this.push(this.context.frame.getParameters());
	}

	private opForInInit() {
		const obj = this.context.frame.stack.pop();
		const keys = obj == null ? [] : Object.keys(Object(obj));
		this.push({ keys, index: 0 } satisfies ForInIteratorState);
	}

	private opForInHas() {
		const state = this.context.frame.stack.pop() as ForInIteratorState;
		this.push(state.index < state.keys.length);
	}

	private opForInNext() {
		const state = this.context.frame.stack.pop() as ForInIteratorState;
		const key = state.keys[state.index];
		state.index += 1;
		this.push(key);
	}

	private opLoadParameter() {
		this.push(this.context.frame.getParameter(this.reader.read()));
	}

	private opDeleteProp() {
		const obj = this.context.frame.stack.pop() as Record<string, unknown>;
		const key = this.runtime.meta(this.reader.read());
		this.push(delete obj[key]);
	}

	private opDeleteElem() {
		const key = this.context.frame.stack.pop() as string | number | symbol;
		const obj = this.context.frame.stack.pop() as Record<string | number | symbol, unknown>;
		this.push(delete obj[key]);
	}

	private opMakeClosure() {
		const entryPc = this.reader.read();
		const numCaptures = this.reader.read();
		const caps: unknown[] = [];
		for (let i = 0; i < numCaptures; i++) {
			caps.push(this.context.frame.variables.get(this.reader.read()));
		}
		const bytecode = this._bytecode;
		const meta = this.meta;
		const deps = this.dependencies;
		const protection = this.protection;
		const fn = function (this: unknown, ...args: unknown[]) {
			const subVm = new VM(bytecode, meta, deps, protection);
			return subVm.executeClosure(entryPc, caps, args, this);
		};
		(fn as any).$pc = entryPc;
		(fn as any).$caps = caps;
		this.push(fn);
	}

	private opLoadCapture() {
		this.push(this.context.frame.captures[this.reader.read()]);
	}

	private opInvokeValue() {
		const func = this.context.frame.stack.pop();
		const args = this.context.frame.stack.pop() as unknown[];
		if (isClosure(func)) {
			this.context.pushFrame(new Frame(this.reader.getPc(), args, func.$caps, undefined));
			this.reader.jump(func.$pc);
		} else {
			this.push((func as Function).apply(undefined, args));
		}
	}

	private opLoadThis() {
		this.push(this.context.frame.thisValue);
	}

	private opDebugger() {}

	private opNot() {
		this.push(!this.context.frame.stack.pop());
	}

	private opTypeof() {
		this.push(typeof this.context.frame.stack.pop());
	}

	private opUnaryPlus() {
		this.push(+((this.context.frame.stack.pop() as any) ?? 0));
	}

	private opBitNot() {
		this.push(~(this.context.frame.stack.pop() as number));
	}

	private opVoid() {
		this.context.frame.stack.pop();
		this.push(undefined);
	}

	private opThrow() {
		throw this.context.frame.stack.pop();
	}

	private opLandingPad() {
		this.push(undefined);
	}
}

export default VM;
