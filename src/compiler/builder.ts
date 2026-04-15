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
	LandingPadInstruction,
	UnaryInstruction,
	ArrayInstruction,
	ObjectInstruction,
	ObjectProp,
	NewInstruction,
	GlobalRefInstruction,
	ThisInstruction,
	ArgumentsInstruction,
	ForInInitInstruction,
	ForInHasInstruction,
	ForInNextInstruction,
	GetPropInstruction,
	GetElemInstruction,
	SetPropInstruction,
	SetElemInstruction,
	DeletePropInstruction,
	DeleteElemInstruction,
	MakeClosureInstruction,
	LoadCaptureInstruction,
	BranchTerminator,
	JmpTerminator,
	ReturnTerminator,
	UnreachableTerminator,
	ThrowTerminator,
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

	get currentFn(): IRFunction | null {
		return this._currentFn;
	}

	get currentBlock(): BasicBlock | null {
		return this._currentBlock;
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
	buildLt(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Lt", lhs, rhs);
	}
	buildLte(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Lte", lhs, rhs);
	}
	buildGt(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Gt", lhs, rhs);
	}
	buildGte(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Gte", lhs, rhs);
	}
	buildMod(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Mod", lhs, rhs);
	}
	buildBitAnd(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("BitAnd", lhs, rhs);
	}
	buildBitOr(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("BitOr", lhs, rhs);
	}
	buildBitXor(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("BitXor", lhs, rhs);
	}
	buildShl(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Shl", lhs, rhs);
	}
	buildShr(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Shr", lhs, rhs);
	}
	buildUShr(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("UShr", lhs, rhs);
	}
	buildInstanceof(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("Instanceof", lhs, rhs);
	}
	buildIn(lhs: Value, rhs: Value): BinaryInstruction {
		return this.buildBinary("In", lhs, rhs);
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

	buildPhi(incoming: Array<{ block: BasicBlock; value: Value }> = []): PhiInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new PhiInstruction(fn.allocReg(), incoming);
		block.emit(instr);
		return instr;
	}

	buildCondBr(cond: Value, ifTrue: BasicBlock, ifFalse: BasicBlock): void {
		const { block } = this.insertPoint();
		block.terminate(new BranchTerminator(cond, ifTrue, ifFalse));
	}

	buildBr(dest: BasicBlock): void {
		const { block } = this.insertPoint();
		block.terminate(new JmpTerminator(dest));
	}

	buildReturn(value: Value): void {
		const { block } = this.insertPoint();
		block.terminate(new ReturnTerminator(value));
	}

	buildUnreachable(): void {
		const { block } = this.insertPoint();
		block.terminate(new UnreachableTerminator());
	}

	buildThrow(value: Value): void {
		const { block } = this.insertPoint();
		block.terminate(new ThrowTerminator(value));
	}

	buildForInInit(obj: Value): ForInInitInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ForInInitInstruction(fn.allocReg(), obj);
		block.emit(instr);
		return instr;
	}

	buildForInHas(iter: Value): ForInHasInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ForInHasInstruction(fn.allocReg(), iter);
		block.emit(instr);
		return instr;
	}

	buildForInNext(iter: Value): ForInNextInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ForInNextInstruction(fn.allocReg(), iter);
		block.emit(instr);
		return instr;
	}

	buildUnary(op: string, operand: Value): UnaryInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new UnaryInstruction(fn.allocReg(), op, operand);
		block.emit(instr);
		return instr;
	}

	buildNot(operand: Value): UnaryInstruction {
		return this.buildUnary("!", operand);
	}
	buildNeg(operand: Value): UnaryInstruction {
		return this.buildUnary("-", operand);
	}
	buildTypeof(operand: Value): UnaryInstruction {
		return this.buildUnary("typeof", operand);
	}
	buildVoid(operand: Value): UnaryInstruction {
		return this.buildUnary("void", operand);
	}

	buildNotEqual(lhs: Value, rhs: Value): UnaryInstruction {
		return this.buildNot(this.buildEqual(lhs, rhs));
	}

	buildArray(elements: Value[]): ArrayInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ArrayInstruction(fn.allocReg(), elements);
		block.emit(instr);
		return instr;
	}

	buildObject(props: ObjectProp[]): ObjectInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ObjectInstruction(fn.allocReg(), props);
		block.emit(instr);
		return instr;
	}

	buildGlobalRef(name: string): GlobalRefInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new GlobalRefInstruction(fn.allocReg(), name);
		block.emit(instr);
		return instr;
	}

	buildThis(): ThisInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ThisInstruction(fn.allocReg());
		block.emit(instr);
		return instr;
	}

	buildArguments(): ArgumentsInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new ArgumentsInstruction(fn.allocReg());
		block.emit(instr);
		return instr;
	}

	buildDeleteProp(obj: Value, key: string): DeletePropInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new DeletePropInstruction(fn.allocReg(), obj, key);
		block.emit(instr);
		return instr;
	}

	buildMakeClosure(fn: Value, captures: Value[]): MakeClosureInstruction {
		const { fn: irFn, block } = this.insertPoint();
		const instr = new MakeClosureInstruction(irFn.allocReg(), fn, captures);
		block.emit(instr);
		return instr;
	}

	buildLoadCapture(index: number): LoadCaptureInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new LoadCaptureInstruction(fn.allocReg(), index);
		block.emit(instr);
		return instr;
	}

	buildDeleteElem(obj: Value, key: Value): DeleteElemInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new DeleteElemInstruction(fn.allocReg(), obj, key);
		block.emit(instr);
		return instr;
	}

	buildGetProp(obj: Value, key: string): GetPropInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new GetPropInstruction(fn.allocReg(), obj, key);
		block.emit(instr);
		return instr;
	}

	buildGetElem(obj: Value, key: Value): GetElemInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new GetElemInstruction(fn.allocReg(), obj, key);
		block.emit(instr);
		return instr;
	}

	buildSetProp(obj: Value, key: string, value: Value): SetPropInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new SetPropInstruction(fn.allocReg(), obj, key, value);
		block.emit(instr);
		return instr;
	}

	buildSetElem(obj: Value, key: Value, value: Value): SetElemInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new SetElemInstruction(fn.allocReg(), obj, key, value);
		block.emit(instr);
		return instr;
	}

	buildNew(callee: Value, args: Value[]): NewInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new NewInstruction(fn.allocReg(), callee, args);
		block.emit(instr);
		return instr;
	}

	buildLandingPad(): LandingPadInstruction {
		const { fn, block } = this.insertPoint();
		const instr = new LandingPadInstruction(fn.allocReg());
		block.emit(instr);
		return instr;
	}

	setUnwindTarget(block: BasicBlock, unwindTo: BasicBlock): void {
		block.unwindTo = unwindTo;
	}

	private insertPoint(): { fn: IRFunction; block: BasicBlock } {
		if (!this._currentFn || !this._currentBlock) {
			throw new Error("IRBuilder: no insert point set, call setInsertPoint() first");
		}
		return { fn: this._currentFn, block: this._currentBlock };
	}
}

export { IRBuilder };
