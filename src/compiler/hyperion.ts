import * as parser from "@babel/parser";
import type {
	Expression,
	Statement,
	VariableDeclaration,
	VariableDeclarator,
	BlockStatement,
	BinaryExpression,
	UnaryExpression,
	NumericLiteral,
	StringLiteral,
	BooleanLiteral,
	Identifier,
	FunctionDeclaration,
	FunctionExpression,
	ReturnStatement,
	CallExpression,
	TryStatement,
	IfStatement,
	WhileStatement,
	ForStatement,
	UpdateExpression,
	ArrayExpression,
} from "@babel/types";
import type { BasicBlock } from "./value/block.js";
import { BaseCompiler } from "./base.js";
import { IRBuilder } from "./builder.js";
import { IRModule } from "./module.js";
import { ConstValue } from "./value/constant/const.js";
import { Value } from "./value/value.js";

interface LoopFrame { breakBlock: BasicBlock; continueBlock: BasicBlock; }


class SSAScope {
	private bindings = new Map<string, Value>();

	define(name: string, val: Value): void { this.bindings.set(name, val); }

	lookup(name: string): Value {
		const v = this.bindings.get(name);
		if (v === undefined) throw new Error(`Undefined variable: ${name}`);
		return v;
	}

	tryLookup(name: string): Value | undefined { return this.bindings.get(name); }

	has(name: string): boolean { return this.bindings.has(name); }

	snapshot(): Map<string, Value> { return new Map(this.bindings); }

	restore(snap: Map<string, Value>): void { this.bindings = new Map(snap); }
}

class HyperionCompiler extends BaseCompiler {
	readonly builder: IRBuilder;
	private anonCount = 0;
	private loopStack: LoopFrame[] = [];

	constructor(source: string) {
		super(source);
		this.builder = new IRBuilder(new IRModule("hyperion"));
	}

	compile(): IRModule {
		const program = parser.parse(this.source, { sourceType: "script" }).program;

		const fn = this.builder.buildFunction("__main__", []);
		this.builder.setInsertPoint(fn, fn.entry);

		const scope = new SSAScope();
		for (const statement of program.body) {
			this.compileStatement(statement, scope);
		}

		this.builder.buildUnreachable();
		return this.builder.module;
	}

	private compileStatement(node: Statement, scope: SSAScope): void {
		switch (node.type) {
			case "VariableDeclaration":
				this.compileVariableDeclaration(node as VariableDeclaration, scope);
				break;
			case "BlockStatement":
				this.compileBlockStatement(node as BlockStatement, scope);
				break;
			case "ExpressionStatement":
				this.compileExpression(node.expression as Expression, scope);
				break;
			case "FunctionDeclaration":
				this.compileFunctionDeclaration(node as FunctionDeclaration, scope);
				break;
			case "ReturnStatement":
				this.compileReturnStatement(node as ReturnStatement, scope);
				break;
			case "TryStatement":
				this.compileTryStatement(node as TryStatement, scope);
				break;
			case "IfStatement":
				this.compileIfStatement(node as IfStatement, scope);
				break;
			case "WhileStatement":
				this.compileWhileStatement(node as WhileStatement, scope);
				break;
			case "ForStatement":
				this.compileForStatement(node as ForStatement, scope);
				break;
			case "BreakStatement":
				this.compileBreakStatement();
				break;
			case "ContinueStatement":
				this.compileContinueStatement();
				break;
			default:
				throw new Error(`HyperionCompiler: Unsupported statement type ${node.type}`);
		}
	}

	private compileFunctionDeclaration(node: FunctionDeclaration, scope: SSAScope): void {
		if (!node.id) throw new Error("Anonymous function declarations are not supported");
		const fn = this.compileFunctionLike(node.id.name, node.params as Identifier[], node.body, scope);
		scope.define(node.id.name, fn);
	}

	private compileFunctionExpression(node: FunctionExpression, scope: SSAScope): Value {
		const name = node.id?.name ?? `__anon_${this.anonCount++}`;
		return this.compileFunctionLike(name, node.params as Identifier[], node.body, scope);
	}

	private collectWrittenVars(nodes: any | any[]): Set<string> {
		const vars = new Set<string>();
		const walk = (n: any): void => {
			if (!n || typeof n !== "object") return;
			if (Array.isArray(n)) { n.forEach(walk); return; }
			if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression") return;
			if (n.type === "UpdateExpression" && n.argument?.type === "Identifier") vars.add(n.argument.name);
			if (n.type === "AssignmentExpression" && n.left?.type === "Identifier") vars.add(n.left.name);
			for (const v of Object.values(n)) if (typeof v === "object") walk(v);
		};
		walk(nodes);
		return vars;
	}

	private insertLoopPhis(
		loopBody: any | any[],
		scope: SSAScope,
		entryBlock: BasicBlock,
	): Map<string, { phi: ReturnType<IRBuilder["buildPhi"]>; preVal: Value }> {
		const phis = new Map<string, { phi: ReturnType<IRBuilder["buildPhi"]>; preVal: Value }>();
		for (const name of this.collectWrittenVars(loopBody)) {
			const preVal = scope.tryLookup(name);
			if (preVal === undefined) continue;
			const phi = this.builder.buildPhi([{ block: entryBlock, value: preVal }]);
			phis.set(name, { phi, preVal });
			scope.define(name, phi);
		}
		return phis;
	}

	private backfillLoopPhis(
		phis: Map<string, { phi: ReturnType<IRBuilder["buildPhi"]>; preVal: Value }>,
		backBlock: BasicBlock,
		scope: SSAScope,
	): void {
		for (const [name, { phi, preVal }] of phis) {
			const bodyVal = scope.tryLookup(name) ?? preVal;
			phi.incoming.push({ block: backBlock, value: bodyVal });
			scope.define(name, phi);
		}
	}

	private compileFunctionLike(name: string, params: Identifier[], body: BlockStatement, scope: SSAScope): Value {
		const paramNames = params.map((p) => p.name);
		const prevFn    = this.builder.currentFn;
		const prevBlock = this.builder.currentBlock;

		const fn = this.builder.buildFunction(name, paramNames);
		this.builder.setInsertPoint(fn, fn.entry);

		const fnScope = new SSAScope();
		for (const param of fn.params) fnScope.define(param.name, param);

		this.compileBlockStatement(body, fnScope);

		if (!this.builder.currentBlock!.terminator) this.builder.buildReturn(new ConstValue(null));
		if (prevFn && prevBlock) this.builder.setInsertPoint(prevFn, prevBlock);

		return fn;
	}

	private compileTryStatement(node: TryStatement, scope: SSAScope): void {
		const fn = this.builder.currentFn!;
		const id = fn.blockCount;

		const tryBlock   = fn.createBlock(`try_body.${id}`);
		const catchBlock = fn.createBlock(`catch.${id}`);
		const afterBlock = fn.createBlock(`after.${id}`);

		this.builder.buildBr(tryBlock);
		this.builder.setInsertPoint(fn, tryBlock);
		this.builder.setUnwindTarget(tryBlock, catchBlock);
		this.compileBlockStatement(node.block, scope);
		if (!tryBlock.terminator) this.builder.buildBr(afterBlock);

		this.builder.setInsertPoint(fn, catchBlock);
		const exVal = this.builder.buildLandingPad();
		const catchScope = new SSAScope();
		for (const [k, v] of scope.snapshot()) catchScope.define(k, v);
		if (node.handler?.param?.type === "Identifier") {
			catchScope.define((node.handler.param as Identifier).name, exVal);
		}
		if (node.handler) {
			this.compileBlockStatement(node.handler.body, catchScope);
		}
		if (!catchBlock.terminator) this.builder.buildBr(afterBlock);
		this.builder.setInsertPoint(fn, afterBlock);
	}

	private compileIfStatement(node: IfStatement, scope: SSAScope): void {
		const fn  = this.builder.currentFn!;
		const id  = fn.blockCount;
		const then  = fn.createBlock(`then.${id}`);
		const els   = node.alternate ? fn.createBlock(`else.${id}`) : null;
		const after = fn.createBlock(`after.${id}`);
		const entryBlock = this.builder.currentBlock!;

		const cond = this.compileExpression(node.test as Expression, scope);
		this.builder.buildCondBr(cond, then, els ?? after);

		const snap0 = scope.snapshot();
		this.builder.setInsertPoint(fn, then);
		this.compileStatement(node.consequent, scope);
		const thenEnd = this.builder.currentBlock!;
		if (!thenEnd.terminator) this.builder.buildBr(after);
		const snap1 = scope.snapshot();
		scope.restore(snap0);
		let elseEnd = entryBlock;
		if (node.alternate && els) {
			this.builder.setInsertPoint(fn, els);
			this.compileStatement(node.alternate, scope);
			elseEnd = this.builder.currentBlock!;
			if (!elseEnd.terminator) this.builder.buildBr(after);
		}
		const snap2 = node.alternate ? scope.snapshot() : snap0;
		scope.restore(snap0);
		this.builder.setInsertPoint(fn, after);
		const allKeys = new Set([...snap1.keys(), ...snap2.keys()]);
		for (const name of allKeys) {
			const v1 = snap1.get(name);
			const v2 = snap2.get(name);
			if (v1 === undefined || v2 === undefined) {
				scope.define(name, (v1 ?? v2)!);
				continue;
			}
			if (v1 === v2) { scope.define(name, v1); continue; }
			const phi = this.builder.buildPhi([
				{ block: thenEnd, value: v1 },
				{ block: node.alternate ? elseEnd : entryBlock, value: v2 },
			]);
			scope.define(name, phi);
		}
	}

	private compileWhileStatement(node: WhileStatement, scope: SSAScope): void {
		const fn         = this.builder.currentFn!;
		const entryBlock = this.builder.currentBlock!;
		const id         = fn.blockCount;
		const condBlock  = fn.createBlock(`while_cond.${id}`);
		const bodyBlock  = fn.createBlock(`while_body.${id}`);
		const after      = fn.createBlock(`while_after.${id}`);

		this.builder.buildBr(condBlock);
		this.builder.setInsertPoint(fn, condBlock);
		const phis = this.insertLoopPhis(node.body, scope, entryBlock);

		const test = this.compileExpression(node.test as Expression, scope);
		this.builder.buildCondBr(test, bodyBlock, after);

		this.builder.setInsertPoint(fn, bodyBlock);
		this.loopStack.push({ breakBlock: after, continueBlock: condBlock });
		this.compileStatement(node.body, scope);
		const bodyEnd = this.builder.currentBlock!;
		if (!bodyEnd.terminator) this.builder.buildBr(condBlock);
		this.loopStack.pop();

		this.backfillLoopPhis(phis, bodyEnd, scope);
		this.builder.setInsertPoint(fn, after);
	}

	private compileForStatement(node: ForStatement, scope: SSAScope): void {
		const fn    = this.builder.currentFn!;
		const id    = fn.blockCount;
		const condBlock   = fn.createBlock(`for_cond.${id}`);
		const bodyBlock   = fn.createBlock(`for_body.${id}`);
		const updateBlock = node.update ? fn.createBlock(`for_update.${id}`) : null;
		const after       = fn.createBlock(`for_after.${id}`);
		const continueTarget = updateBlock ?? condBlock;

		if (node.init) {
			if (node.init.type === "VariableDeclaration") {
				this.compileVariableDeclaration(node.init as VariableDeclaration, scope);
			} else {
				this.compileExpression(node.init as Expression, scope);
			}
		}
		const preCondBlock = this.builder.currentBlock!;
		this.builder.buildBr(condBlock);
		this.builder.setInsertPoint(fn, condBlock);
		const writtenNodes: any[] = [node.body];
		if (node.update) writtenNodes.push(node.update);
		const phis = this.insertLoopPhis(writtenNodes, scope, preCondBlock);

		if (node.test) {
			const test = this.compileExpression(node.test as Expression, scope);
			this.builder.buildCondBr(test, bodyBlock, after);
		} else {
			this.builder.buildBr(bodyBlock);
		}

		this.builder.setInsertPoint(fn, bodyBlock);
		this.loopStack.push({ breakBlock: after, continueBlock: continueTarget });
		this.compileStatement(node.body, scope);
		if (!this.builder.currentBlock!.terminator) this.builder.buildBr(continueTarget);
		this.loopStack.pop();

		let backfillBlock = this.builder.currentBlock!;
		if (node.update && updateBlock) {
			this.builder.setInsertPoint(fn, updateBlock);
			this.compileExpression(node.update as Expression, scope);
			backfillBlock = this.builder.currentBlock!;
			if (!backfillBlock.terminator) this.builder.buildBr(condBlock);
		}

		this.backfillLoopPhis(phis, backfillBlock, scope);
		this.builder.setInsertPoint(fn, after);
	}

	private compileBreakStatement(): void {
		const frame = this.loopStack.at(-1);
		if (!frame) throw new Error("break outside of loop");
		this.builder.buildBr(frame.breakBlock);
	}

	private compileContinueStatement(): void {
		const frame = this.loopStack.at(-1);
		if (!frame) throw new Error("continue outside of loop");
		this.builder.buildBr(frame.continueBlock);
	}

	private compileReturnStatement(node: ReturnStatement, scope: SSAScope): void {
		const val = node.argument
			? this.compileExpression(node.argument as Expression, scope)
			: new ConstValue(null);
		this.builder.buildReturn(val);
	}

	private compileVariableDeclaration(node: VariableDeclaration, scope: SSAScope): void {
		for (const decl of node.declarations) {
			this.compileVariableDeclarator(decl as VariableDeclarator, scope);
		}
	}

	private compileVariableDeclarator(node: VariableDeclarator, scope: SSAScope): void {
		if (node.id.type !== "Identifier") {
			throw new Error(`Unsupported variable declaration left value type: ${node.id.type}`);
		}
		const name = (node.id as Identifier).name;
		const val = node.init
			? this.compileExpression(node.init as Expression, scope)
			: new ConstValue(null);
		scope.define(name, val);
	}

	private compileBlockStatement(node: BlockStatement, scope: SSAScope): void {
		for (const stmt of node.body) this.compileStatement(stmt, scope);
	}

	private compileExpression(node: Expression, scope: SSAScope): Value {
		switch (node.type) {
			case "BinaryExpression":
				return this.compileBinaryExpression(node as BinaryExpression, scope);
			case "NumericLiteral":
				return new ConstValue((node as NumericLiteral).value);
			case "StringLiteral":
				return new ConstValue((node as StringLiteral).value);
			case "BooleanLiteral":
				return new ConstValue((node as BooleanLiteral).value);
			case "NullLiteral":
				return new ConstValue(null);
			case "Identifier":
				return scope.lookup((node as Identifier).name);
			case "CallExpression":
				return this.compileCallExpression(node as CallExpression, scope);
			case "FunctionExpression":
				return this.compileFunctionExpression(node as FunctionExpression, scope);
			case "UnaryExpression":
				return this.compileUnaryExpression(node as UnaryExpression, scope);
			case "UpdateExpression":
				return this.compileUpdateExpression(node as UpdateExpression, scope);
			case "ArrayExpression":
				return this.compileArrayExpression(node as ArrayExpression, scope);
			default:
				throw new Error(`HyperionCompiler: Unsupported expression type ${node.type}`);
		}
	}

	private compileCallExpression(node: CallExpression, scope: SSAScope): Value {
		const callee = this.compileExpression(node.callee as Expression, scope);
		const args = node.arguments.map((arg) =>
			this.compileExpression(arg as Expression, scope),
		);
		return this.builder.buildCall(callee, args);
	}

	private compileUnaryExpression(node: UnaryExpression, scope: SSAScope): Value {
		const operand = this.compileExpression(node.argument as Expression, scope);
		switch (node.operator) {
			case "!":      return this.builder.buildNot(operand);
			case "-":      return this.builder.buildNeg(operand);
			case "typeof": return this.builder.buildTypeof(operand);
			case "void":   return this.builder.buildVoid(operand);
			default: throw new Error(`Unsupported unary operator: ${node.operator}`);
		}
	}

	private compileUpdateExpression(node: UpdateExpression, scope: SSAScope): Value {
		if (node.argument.type !== "Identifier") throw new Error("Only identifier update is supported");
		const name = (node.argument as Identifier).name;
		const old  = scope.lookup(name);
		const one  = new ConstValue(1);
		const updated = node.operator === "++"
			? this.builder.buildAdd(old, one)
			: this.builder.buildSub(old, one);
		scope.define(name, updated);
		return node.prefix ? updated : old;
	}

	private compileArrayExpression(node: ArrayExpression, scope: SSAScope): Value {
		const elements = node.elements.map((el) =>
			el ? this.compileExpression(el as Expression, scope) : new ConstValue(null),
		);
		return this.builder.buildArray(elements);
	}

	private compileBinaryExpression(node: BinaryExpression, scope: SSAScope): Value {
		const lhs = this.compileExpression(node.left as Expression, scope);
		const rhs = this.compileExpression(node.right as Expression, scope);
		switch (node.operator) {
			case "+":   return this.builder.buildAdd(lhs, rhs);
			case "-":   return this.builder.buildSub(lhs, rhs);
			case "*":   return this.builder.buildMul(lhs, rhs);
			case "/":   return this.builder.buildDiv(lhs, rhs);
			case "==":  return this.builder.buildEqual(lhs, rhs)
			case "===": return this.builder.buildEqual(lhs, rhs);
			case "!=":  return this.builder.buildNotEqual(lhs, rhs);
			case "!==": return this.builder.buildNotEqual(lhs, rhs);
			case "<":   return this.builder.buildLt(lhs, rhs);
			case "<=":  return this.builder.buildLte(lhs, rhs);
			case ">":   return this.builder.buildGt(lhs, rhs);
			case ">=":  return this.builder.buildGte(lhs, rhs); 
			default:
				throw new Error(`HyperionCompiler: Unsupported binary operator: ${node.operator}`);
		}
	}
}

export { HyperionCompiler };
