/**
 * Hyperion ES5 生产语法白名单（以 Babel 降级后的 AST 为准）。
 */
import { CompileError, CompileErrorCode } from "./error.js";

const SUPPORTED_STATEMENTS = new Set<string>([
	"VariableDeclaration",
	"BlockStatement",
	"ExpressionStatement",
	"FunctionDeclaration",
	"ReturnStatement",
	"TryStatement",
	"IfStatement",
	"WhileStatement",
	"ForStatement",
	"BreakStatement",
	"ContinueStatement",
	"DoWhileStatement",
	"ForInStatement",
	"SwitchStatement",
	"ThrowStatement",
	"EmptyStatement",
	"DebuggerStatement",
]);

const SUPPORTED_EXPRESSIONS = new Set<string>([
	"BinaryExpression",
	"NumericLiteral",
	"StringLiteral",
	"BooleanLiteral",
	"NullLiteral",
	"Identifier",
	"CallExpression",
	"FunctionExpression",
	"UnaryExpression",
	"UpdateExpression",
	"ArrayExpression",
	"ObjectExpression",
	"AssignmentExpression",
	"LogicalExpression",
	"ConditionalExpression",
	"SequenceExpression",
	"NewExpression",
	"MemberExpression",
	"ThisExpression",
]);

type LocNode = {
	type: string;
	loc?: { start: { line: number; column: number } } | null;
};

function assertSupportedStatement(node: LocNode): void {
	if (!SUPPORTED_STATEMENTS.has(node.type)) {
		throw CompileError.fromNode(
			CompileErrorCode.UNSUPPORTED_STATEMENT,
			`${node.type} is not in the ES5 whitelist`,
			node,
		);
	}
}

function assertSupportedExpression(node: LocNode): void {
	if (!SUPPORTED_EXPRESSIONS.has(node.type)) {
		throw CompileError.fromNode(
			CompileErrorCode.UNSUPPORTED_EXPRESSION,
			`${node.type} is not in the ES5 whitelist`,
			node,
		);
	}
}

/** UpdateExpression 仅允许 Identifier（拒绝 arr[i]++ / obj.x++） */
function assertSupportedUpdateArgument(node: {
	type: string;
	argument: LocNode;
	loc?: LocNode["loc"];
}): void {
	if (node.argument.type !== "Identifier") {
		throw CompileError.fromNode(
			CompileErrorCode.UNSUPPORTED_UPDATE,
			`UpdateExpression on ${node.argument.type} is not supported; only Identifier is allowed`,
			node,
		);
	}
}

/** 函数形参仅 Identifier */
function assertSupportedParams(params: LocNode[], owner: LocNode): void {
	for (const param of params) {
		if (param.type !== "Identifier") {
			throw CompileError.fromNode(
				CompileErrorCode.UNSUPPORTED_PARAM,
				`Function parameter type ${param.type} is not supported; only Identifier is allowed`,
				param.loc ? param : owner,
			);
		}
	}
}

/** 赋值左值仅 Identifier | MemberExpression */
function assertSupportedAssignmentTarget(left: LocNode): void {
	if (left.type !== "Identifier" && left.type !== "MemberExpression") {
		throw CompileError.fromNode(
			CompileErrorCode.UNSUPPORTED_ASSIGN_TARGET,
			`Assignment left-hand side ${left.type} is not supported`,
			left,
		);
	}
}

/** 变量声明绑定仅 Identifier */
function assertSupportedBinding(id: LocNode): void {
	if (id.type !== "Identifier") {
		throw CompileError.fromNode(
			CompileErrorCode.UNSUPPORTED_BINDING,
			`Variable binding type ${id.type} is not supported; only Identifier is allowed`,
			id,
		);
	}
}

export {
	SUPPORTED_STATEMENTS,
	SUPPORTED_EXPRESSIONS,
	assertSupportedStatement,
	assertSupportedExpression,
	assertSupportedUpdateArgument,
	assertSupportedParams,
	assertSupportedAssignmentTarget,
	assertSupportedBinding,
};
