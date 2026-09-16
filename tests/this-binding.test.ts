/**
 * 宿主回调与 this 约定（独立用例，便于单独跑）
 *
 *   npm test
 *   或：tsc -p tsconfig.test.json && node --test dist-test/tests/this-binding.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { HyperionAssembler } from "../src/assembler/index.js";
import { HyperionCompiler } from "../src/compiler/index.js";
import VM from "../src/vm/vm.js";

type TestWindow = Window &
	typeof globalThis & {
		__twisted_result?: unknown;
		__o?: { v: number; m: (a?: number) => unknown };
		__cb?: () => unknown;
		console: Console;
	};

function compileAndRun(source: string): { win: TestWindow } {
	const compiler = new HyperionCompiler(source);
	const ir = compiler.compile();
	const bundle = new HyperionAssembler().assemble(ir);
	const dom = new JSDOM();
	const win = dom.window as unknown as TestWindow;
	new VM(bundle.bytecode, bundle.meta, [win, win.console]).execute();
	return { win };
}

describe("this-binding / VM 内方法调用", () => {
	it("obj.m() 时 this 为 obj", () => {
		const { win } = compileAndRun(`
			window.__o = { v: 42 };
			window.__o.m = function () {
				window.__twisted_result = this.v;
			};
			window.__o.m();
		`);
		assert.strictEqual(win.__twisted_result, 42);
	});

	it("方法可读 this 上的其它字段并参与运算", () => {
		const { win } = compileAndRun(`
			window.__o = { v: 10 };
			window.__o.m = function (n) {
				window.__twisted_result = this.v + n;
			};
			window.__o.m(5);
		`);
		assert.strictEqual(win.__twisted_result, 15);
	});
});

describe("this-binding / 宿主再次回调", () => {
	it("execute 结束后宿主调用 obj.m()，this 仍为 obj", () => {
		const { win } = compileAndRun(`
			window.__o = { v: 99 };
			window.__o.m = function () {
				window.__twisted_result = this.v;
			};
		`);
		assert.strictEqual(win.__twisted_result, undefined);
		win.__o!.m();
		assert.strictEqual(win.__twisted_result, 99);
	});

	it("宿主用 call 指定 this", () => {
		const { win } = compileAndRun(`
			window.__cb = function () {
				window.__twisted_result = this.v;
			};
		`);
		const other = { v: 123 };
		win.__cb!.call(other);
		assert.strictEqual(win.__twisted_result, 123);
	});

	it("无 receiver 直接调用时 this 为 undefined", () => {
		const { win } = compileAndRun(`
			window.__cb = function () {
				window.__twisted_result = this;
			};
		`);
		// 必须先取出再裸调；win.__cb() 会把 this 绑成 window
		const cb = win.__cb!;
		cb();
		assert.strictEqual(win.__twisted_result, undefined);
	});
});

describe("this-binding / 顶层 this", () => {
	it("顶层脚本 this 指向注入的 window", () => {
		const { win } = compileAndRun(`
			window.__twisted_result = this === window;
		`);
		assert.strictEqual(win.__twisted_result, true);
	});
});
