/**
 * 字节码布局：按表扫指令，只改写操作码槽。
 */
import { Opcode } from "../constant.js";
import { LOGICAL_OPCODES } from "./seed.js";

const VAR_MAKE_CLOSURE = -1;

const ARITY: Record<number, number> = {
	[Opcode.Push]: 1,
	[Opcode.Pop]: 0,
	[Opcode.Add]: 0,
	[Opcode.Sub]: 0,
	[Opcode.Mul]: 0,
	[Opcode.Div]: 0,
	[Opcode.Equal]: 0,
	[Opcode.Jmp]: 1,
	[Opcode.JmpIf]: 1,
	[Opcode.Store]: 1,
	[Opcode.Load]: 1,
	[Opcode.Apply]: 0,
	[Opcode.Dependency]: 1,
	[Opcode.Property]: 1,
	[Opcode.PushFrame]: 0,
	[Opcode.PopFrame]: 0,
	[Opcode.Halt]: 0,
	[Opcode.BuildArray]: 1,
	[Opcode.BuildObject]: 1,
	[Opcode.LoadParameter]: 1,
	[Opcode.Await]: 0,
	[Opcode.Construct]: 0,
	[Opcode.LoadMeta]: 1,
	[Opcode.BitOr]: 0,
	[Opcode.ShiftLeft]: 0,
	[Opcode.ShiftRightUnsigned]: 0,
	[Opcode.LessThan]: 0,
	[Opcode.GreaterThan]: 0,
	[Opcode.GreaterThanOrEqual]: 0,
	[Opcode.LessThanOrEqual]: 0,
	[Opcode.BitXor]: 0,
	[Opcode.SetProperty]: 1,
	[Opcode.GetElement]: 0,
	[Opcode.SetElement]: 0,
	[Opcode.MakeClosure]: VAR_MAKE_CLOSURE,
	[Opcode.LoadCapture]: 1,
	[Opcode.InvokeValue]: 0,
	[Opcode.Not]: 0,
	[Opcode.PushNull]: 0,
	[Opcode.Debugger]: 0,
	[Opcode.Typeof]: 0,
	[Opcode.Mod]: 0,
	[Opcode.BitAnd]: 0,
	[Opcode.ShiftRight]: 0,
	[Opcode.Instanceof]: 0,
	[Opcode.In]: 0,
	[Opcode.UnaryPlus]: 0,
	[Opcode.BitNot]: 0,
	[Opcode.Void]: 0,
	[Opcode.Arguments]: 0,
	[Opcode.ForInInit]: 0,
	[Opcode.ForInHas]: 0,
	[Opcode.ForInNext]: 0,
	[Opcode.DeleteProp]: 1,
	[Opcode.DeleteElem]: 0,
	[Opcode.Throw]: 0,
	[Opcode.LandingPad]: 0,
	[Opcode.LoadThis]: 0,
};

for (const op of LOGICAL_OPCODES) {
	if (ARITY[op] === undefined) {
		throw new Error(`BytecodeLayout: missing arity for 0x${op.toString(16)}`);
	}
}

class BytecodeLayout {
	/** 按 map 改写操作码；操作数不动 */
	static remap(bytecode: number[], map: Record<number, number>): number[] {
		const out = bytecode.slice();
		let i = 0;
		while (i < out.length) {
			const logical = out[i]!;
			const n = BytecodeLayout.operandCount(logical, out, i);
			const wire = map[logical];
			if (wire === undefined) {
				throw new Error(`BytecodeLayout: no remap for 0x${logical.toString(16)}`);
			}
			out[i] = wire;
			i += 1 + n;
		}
		if (i !== out.length) {
			throw new Error(`BytecodeLayout: length mismatch pc=${i} len=${out.length}`);
		}
		return out;
	}

	private static operandCount(op: number, bc: number[], at: number): number {
		const arity = ARITY[op];
		if (arity === undefined) {
			throw new Error(`BytecodeLayout: unknown opcode 0x${op.toString(16)} @${at}`);
		}
		if (arity !== VAR_MAKE_CLOSURE) return arity;
		const n = bc[at + 2];
		if (typeof n !== "number" || n < 0 || !Number.isInteger(n)) {
			throw new Error(`BytecodeLayout: bad MakeClosure arity @${at}`);
		}
		return 2 + n;
	}
}

export { BytecodeLayout };
