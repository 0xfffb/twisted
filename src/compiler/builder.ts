import { IRModule } from "./module.js";
import { IRFunction, GlobalVariable } from "./value/constant/global/index.js";
import { BasicBlock } from "./value/block.js";
import { Value } from "./value/value.js";
import {
	BinaryInstruction,
	BinaryInstructionKind,
	LoadInstruction,
	StoreInstruction,
	CallInstruction,
	PhiInstruction,
	BranchTerminator,
	JmpTerminator,
	ReturnTerminator,
	UnreachableTerminator,
} from "./value/instruction/index.js";

class IRBuilder {
	private readonly _module: IRModule;
	private _currentFn: IRFunction | null = null;
	private _currentBlock: BasicBlock | null = null;

	constructor(module: IRModule) {
		this._module = module;
	}

	get module(): IRModule {
		return this._module;
	}

	setInsertPoint(fn: IRFunction, block: BasicBlock): void {
		this._currentFn = fn;
		this._currentBlock = block;
	}

	buildFunction(name: string, params: string[]): IRFunction {
		const fn = new IRFunction(name, params);
		this._module.addFunction(fn);
		return fn;
	}

	buildGlobal(name: string, value: Value): GlobalVariable {
		const global = new GlobalVariable(name, value);
		this._module.addGlobal(global.name, global.value);
		return global;
	}

	buildBinary(kind: BinaryInstructionKind, lhs: Value, rhs: Value): BinaryInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new BinaryInstruction(fn.allocReg(), kind, lhs, rhs);
		block.emit(instr);
		return instr;
	}

	buildAdd(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Add", lhs, rhs);
	}

	buildSub(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Sub", lhs, rhs);
	}

	buildMul(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Mul", lhs, rhs);
	}

	buildDiv(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Div", lhs, rhs);
	}

	buildEqual(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Equal", lhs, rhs);
	}

	buildLoad(slot: number): LoadInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new LoadInstruction(fn.allocReg(), slot);
		block.emit(instr);
		return instr;
	}

	buildStore(slot: number, value: Value): StoreInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new StoreInstruction(fn.allocReg(), slot, value);
		block.emit(instr);
		return instr;
	}

	buildCall(callee: Value, args: Value[]): CallInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new CallInstruction(fn.allocReg(), callee, args);
		block.emit(instr);
		return instr;
	}

	buildPhi(incoming: { block: number; value: Value }[]): PhiInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new PhiInstruction(fn.allocReg(), incoming);
		block.emit(instr);
		return instr;
	}

	buildCondBr(cond: Value, ifTrue: BasicBlock, ifFalse: BasicBlock): void {
		const { block } = this.insertPoint();
		block.terminate(new BranchTerminator(cond, ifTrue.id, ifFalse.id));
	}

	buildBr(dest: BasicBlock): void {
		const { block } = this.insertPoint();
		block.terminate(new JmpTerminator(dest.id));
	}

	buildReturn(value: Value): void {
		const { block } = this.insertPoint();
		block.terminate(new ReturnTerminator(value));
	}

	buildUnreachable(): void {
		const { block } = this.insertPoint();
		block.terminate(new UnreachableTerminator());
	}

	private insertPoint(): { fn: IRFunction; block: BasicBlock } {
		if (!this._currentFn || !this._currentBlock) {
			throw new Error("IRBuilder: no insert point set, call setInsertPoint() first");
		}
		return { fn: this._currentFn, block: this._currentBlock };
	}
}

export { IRBuilder };
