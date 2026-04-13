export { Value } from "./value.js";

export { RegValue } from "./reg.js";
export { ArgValue } from "./argument.js";
export { BasicBlock } from "./block.js";

export type { Literal } from "./constant/const.js";

export { Constant, ConstValue, IrFunction } from "./constant/index.js";

export {
	Instruction,
	BinaryInstruction,
	LoadInstruction,
	StoreInstruction,
	CallInstruction,
	PhiInstruction,
} from "./instruction/index.js";

export {
	Terminator,
	BranchTerminator,
	JmpTerminator,
	ReturnTerminator,
	UnreachableTerminator,
} from "./instruction/terminator/index.js";
