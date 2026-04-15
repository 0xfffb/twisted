import * as parser from "@babel/parser";
import type {
	Expression,
	Statement,
	VariableDeclaration,
	VariableDeclarator,
	BlockStatement,
	BinaryExpression,
	NumericLiteral,
	StringLiteral,
	BooleanLiteral,
	Identifier,
	FunctionDeclaration,
	ReturnStatement,
	CallExpression,
	TryStatement,
} from "@babel/types";
import { BaseCompiler } from "./base.js";
import { IRBuilder } from "./builder.js";
import { IRModule } from "./module.js";
import { ConstValue } from "./value/constant/const.js";
import { Value } from "./value/value.js";


class SSAScope {
	private bindings = new Map<string, Value>();

	constructor(public readonly parent?: SSAScope) {}

	define(name: string, val: Value): void {
		this.bindings.set(name, val);
	}

	lookup(name: string): Value {
		const v = this.bindings.get(name);
		if (v !== undefined) return v;
		if (this.parent) return this.parent.lookup(name);
		throw new Error(`Undefined variable: ${name}`);
	}

	has(name: string): boolean {
		return this.bindings.has(name) || (this.parent?.has(name) ?? false);
	}
}

class HyperionCompiler extends BaseCompiler {
	readonly builder: IRBuilder;

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
			default:
				throw new Error(`HyperionCompiler: Unsupported statement type ${node.type}`);
		}
	}

	private compileFunctionDeclaration(node: FunctionDeclaration, scope: SSAScope): void {
		if (!node.id) throw new Error("Anonymous function declarations are not supported");

		const name = node.id.name;
		const paramNames = node.params.map((p) => {
			if (p.type !== "Identifier") throw new Error(`Unsupported parameter type: ${p.type}`);
			return (p as Identifier).name;
		});

		const prevFn    = this.builder.currentFn;
		const prevBlock = this.builder.currentBlock;

		const fn = this.builder.buildFunction(name, paramNames);
		this.builder.setInsertPoint(fn, fn.entry);

		const fnScope = new SSAScope(scope);
		for (const param of fn.params) {
			fnScope.define(param.name, param);
		}

		this.compileBlockStatement(node.body as BlockStatement, fnScope);

		if (!fn.entry.terminator) {
			this.builder.buildReturn(new ConstValue(null));
		}

		if (prevFn && prevBlock) {
			this.builder.setInsertPoint(prevFn, prevBlock);
		}

		scope.define(name, fn);
	}

	private compileTryStatement(node: TryStatement, scope: SSAScope): void {
		const fn = this.builder.currentFn!;
		const id = fn.blockCount;

		const tryBlock   = fn.createBlock(`try_body.${id}`);
		const catchBlock = fn.createBlock(`catch.${id}`);
		const afterBlock = fn.createBlock(`after.${id}`);

		// entry → try_body
		this.builder.buildBr(tryBlock);

		// compile try body — mark every block in try region with unwindTo = catchBlock
		this.builder.setInsertPoint(fn, tryBlock);
		this.builder.setUnwindTarget(tryBlock, catchBlock);
		this.compileBlockStatement(node.block, scope);
		if (!tryBlock.terminator) this.builder.buildBr(afterBlock);

		// compile catch body
		this.builder.setInsertPoint(fn, catchBlock);
		const exVal = this.builder.buildLandingPad();
		const catchScope = new SSAScope(scope);
		if (node.handler?.param?.type === "Identifier") {
			catchScope.define((node.handler.param as Identifier).name, exVal);
		}
		if (node.handler) {
			this.compileBlockStatement(node.handler.body, catchScope);
		}
		if (!catchBlock.terminator) this.builder.buildBr(afterBlock);

		// continue after
		this.builder.setInsertPoint(fn, afterBlock);
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
		const inner = new SSAScope(scope);
		for (const statement of node.body) {
			this.compileStatement(statement, inner);
		}
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

	private compileBinaryExpression(node: BinaryExpression, scope: SSAScope): Value {
		const lhs = this.compileExpression(node.left as Expression, scope);
		const rhs = this.compileExpression(node.right as Expression, scope);
		switch (node.operator) {
			case "+":   return this.builder.buildAdd(lhs, rhs);
			case "-":   return this.builder.buildSub(lhs, rhs);
			case "*":   return this.builder.buildMul(lhs, rhs);
			case "/":   return this.builder.buildDiv(lhs, rhs);
			case "==":
			case "===": return this.builder.buildEqual(lhs, rhs);
			default:
				throw new Error(`HyperionCompiler: Unsupported binary operator: ${node.operator}`);
		}
	}
}

export { HyperionCompiler };
