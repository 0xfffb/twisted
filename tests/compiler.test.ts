import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CompileError,
	CompileErrorCode,
	HyperionCompiler,
} from "../src/compiler/index.js";

function compile(source: string): { ir: string; dump: string } {
	const compiler = new HyperionCompiler(source);
	const ir = compiler.compile();
	return { ir, dump: compiler.dump() };
}

describe("HyperionCompiler / 基础", () => {
	it("空程序生成 __main__", () => {
		const { dump } = compile("");
		assert.match(dump, /define @__main__/);
	});

	it("简单加法出现在 dump 中", () => {
		const { dump } = compile("1 + 2;");
		assert.match(dump, /add /);
	});

	it("函数声明可编译", () => {
		const { dump } = compile(`
			function add(a, b) {
				return a + b;
			}
			add(1, 2);
		`);
		assert.match(dump, /define @add/);
		assert.match(dump, /call @add/);
	});
});

describe("HyperionCompiler / 白名单拒绝", () => {
	it("class 抛 TWISTED_UNSUPPORTED_STATEMENT", () => {
		assert.throws(
			() => compile("class A {}"),
			(err: unknown) => {
				assert.ok(err instanceof CompileError);
				assert.strictEqual(err.code, CompileErrorCode.UNSUPPORTED_STATEMENT);
				assert.match(err.message, /ClassDeclaration is not in the ES5 whitelist/);
				return true;
			},
		);
	});

	it("标签语句抛 TWISTED_UNSUPPORTED_STATEMENT", () => {
		assert.throws(
			() => compile("label: while (false) { break label; }"),
			(err: unknown) => {
				assert.ok(err instanceof CompileError);
				assert.strictEqual(err.code, CompileErrorCode.UNSUPPORTED_STATEMENT);
				assert.match(err.message, /LabeledStatement is not in the ES5 whitelist/);
				return true;
			},
		);
	});

	it("arr[i]++ 抛 TWISTED_UNSUPPORTED_UPDATE", () => {
		assert.throws(
			() => compile("var a = [0]; a[0]++;"),
			(err: unknown) => {
				assert.ok(err instanceof CompileError);
				assert.strictEqual(err.code, CompileErrorCode.UNSUPPORTED_UPDATE);
				assert.match(err.message, /UpdateExpression on MemberExpression/);
				return true;
			},
		);
	});
});
