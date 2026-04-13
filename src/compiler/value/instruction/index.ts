export { Instruction } from "./instruction.js";
export { BinaryInstruction } from "./binary.js";
export { LoadInstruction } from "./load.js";
export { StoreInstruction } from "./store.js";
export { CallInstruction } from "./call.js";
export { PhiInstruction } from "./phi.js";
export {
	Terminator,
	BranchTerminator,
	JmpTerminator,
	ReturnTerminator,
	UnreachableTerminator,
} from "./terminator/index.js";
