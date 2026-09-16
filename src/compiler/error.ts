/**
 * 编译期统一错误：带错误码、阶段与可选行列号。
 * 消息格式固定，便于 CLI/测试断言：
 * CompileError[CODE]: message (line N, column M)
 */

type CompilePhase = "babel" | "compile";

interface CompileErrorOptions {
	code: string;
	message: string;
	phase?: CompilePhase;
	loc?: { line: number; column: number } | null;
	nodeType?: string;
}

class CompileError extends Error {
	readonly code: string;
	readonly phase: CompilePhase;
	readonly loc?: { line: number; column: number };
	readonly nodeType?: string;

	constructor(options: CompileErrorOptions) {
		const phase = options.phase ?? "compile";
		const locPart =
			options.loc != null
				? ` (line ${options.loc.line}, column ${options.loc.column})`
				: "";
		super(`CompileError[${options.code}]: ${options.message}${locPart}`);
		this.name = "CompileError";
		this.code = options.code;
		this.phase = phase;
		this.nodeType = options.nodeType;
		if (options.loc != null) {
			this.loc = { line: options.loc.line, column: options.loc.column };
		}
	}

	static fromNode(
		code: string,
		message: string,
		node: { type?: string; loc?: { start: { line: number; column: number } } | null },
		phase: CompilePhase = "compile",
	): CompileError {
		const start = node.loc?.start;
		return new CompileError({
			code,
			message,
			phase,
			nodeType: node.type,
			loc: start ? { line: start.line, column: start.column } : null,
		});
	}
}

const CompileErrorCode = {
	UNSUPPORTED_STATEMENT: "TWISTED_UNSUPPORTED_STATEMENT",
	UNSUPPORTED_EXPRESSION: "TWISTED_UNSUPPORTED_EXPRESSION",
	UNSUPPORTED_OPERATOR: "TWISTED_UNSUPPORTED_OPERATOR",
	UNSUPPORTED_PARAM: "TWISTED_UNSUPPORTED_PARAM",
	UNSUPPORTED_UPDATE: "TWISTED_UNSUPPORTED_UPDATE",
	UNSUPPORTED_ASSIGN_TARGET: "TWISTED_UNSUPPORTED_ASSIGN_TARGET",
	UNSUPPORTED_BINDING: "TWISTED_UNSUPPORTED_BINDING",
	SEMANTIC: "TWISTED_SEMANTIC",
	BABEL_FAILED: "TWISTED_BABEL_FAILED",
	UNDEFINED_VARIABLE: "TWISTED_UNDEFINED_VARIABLE",
} as const;

export { CompileError, CompileErrorCode };
export type { CompilePhase, CompileErrorOptions };
