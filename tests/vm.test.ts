import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { HyperionAssembler } from "../src/assembler/index.js";
import { HyperionCompiler } from "../src/compiler/index.js";
import VM from "../src/vm/vm.js";

/**
 * Hyperion __main__ 结束不向 execute() 暴露返回值。
 * 测试通过写入 window.__twisted_result 观测结果。
 */
function run(exprOrBody: string): unknown {
	const source = exprOrBody.includes("__twisted_result")
		? exprOrBody
		: `window.__twisted_result = (${exprOrBody});`;
	const compiler = new HyperionCompiler(source);
	const ir = compiler.compile();
	const bundle = new HyperionAssembler().assemble(ir);
	const dom = new JSDOM();
	const win = dom.window as unknown as { __twisted_result?: unknown; console: Console };
	new VM(bundle.bytecode, bundle.meta, [win, win.console]).execute();
	return win.__twisted_result;
}

describe("VM / 算术", () => {
	it("1 + 2 === 3", () => {
		assert.strictEqual(run("1 + 2"), 3);
	});

	it("局部变量加法", () => {
		assert.strictEqual(
			run(`
				var a = 1;
				var b = 2;
				window.__twisted_result = a + b;
			`),
			3,
		);
	});

	it("减法 10 - 3", () => {
		assert.strictEqual(run("10 - 3"), 7);
	});

	it("乘法 4 * 5", () => {
		assert.strictEqual(run("4 * 5"), 20);
	});

	it("除法 20 / 4", () => {
		assert.strictEqual(run("20 / 4"), 5);
	});
});

describe("VM / 比较与布尔", () => {
	it("1 === 1", () => {
		assert.strictEqual(run("1 === 1"), true);
	});

	it("1 < 2", () => {
		assert.strictEqual(run("1 < 2"), true);
	});

	it("!false", () => {
		assert.strictEqual(run("!false"), true);
	});
});

describe("VM / 位运算", () => {
	it("1 | 2", () => {
		assert.strictEqual(run("1 | 2"), 3);
	});

	it("1 << 3", () => {
		assert.strictEqual(run("1 << 3"), 8);
	});
});

describe("VM / 字符串与字面量", () => {
	it('"a" + "b"', () => {
		assert.strictEqual(run('"a" + "b"'), "ab");
	});

	it("null", () => {
		assert.strictEqual(run("null"), null);
	});
});

describe("VM / 分支与赋值", () => {
	it("if (true) 分支", () => {
		assert.strictEqual(
			run(`
				if (true) {
					window.__twisted_result = 2;
				} else {
					window.__twisted_result = 0;
				}
			`),
			2,
		);
	});

	it("赋值与 +=", () => {
		assert.strictEqual(
			run(`
				var x = 1;
				x = 2;
				x += 1;
				window.__twisted_result = x;
			`),
			3,
		);
	});
});

describe("VM / 函数", () => {
	it("函数声明与调用", () => {
		assert.strictEqual(
			run(`
				function add(a, b) {
					return a + b;
				}
				window.__twisted_result = add(3, 4);
			`),
			7,
		);
	});
});
