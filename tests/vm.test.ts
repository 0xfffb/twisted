import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import Compiler from "../src/compiler/compiler.js";
import Assembler from "../src/assembler/assembler.js";
import VM from "../src/vm/vm.js";

function createVm(source: string): VM {
	const ir = new Compiler(source).compile();
	const bundle = new Assembler().assemble(ir);
	const dom = new JSDOM();
	const deps = [dom.window, dom.window.console];
	return new VM(bundle.bytecode, bundle.meta, deps);
}

describe("VM / 算术", () => {
	it("表达式语句 1 + 2 执行后栈顶为 3", async () => {
		const code = `
			1 + 2
		`;
		const vm = createVm(code);
		const result = await vm.execute();
		assert.strictEqual(result, 3);
	});

	it("局部变量与加法: a=1, b=2, a+b", async () => {
		const code = `
			const a = 1;
			const b = 2;
			a + b;
		`;
		const vm = createVm(code);
		const result = await vm.execute();
		assert.strictEqual(result, 3);
	});

	it("减法 10 - 3", async () => {
		const code = `10 - 3;`;
		assert.strictEqual(await createVm(code).execute(), 7);
	});

	it("乘法 4 * 5", async () => {
		const code = `4 * 5;`;
		assert.strictEqual(await createVm(code).execute(), 20);
	});

	it("除法 20 / 4", async () => {
		const code = `20 / 4;`;
		assert.strictEqual(await createVm(code).execute(), 5);
	});

	it("除法 2 / 8", async () => {
		const code = `2 / 8;`;
		assert.strictEqual(await createVm(code).execute(), 0.25);
	});
});

describe("VM / 比较与布尔", () => {
	it("严格相等 1 === 1", async () => {
		const code = `1 === 1;`;
		assert.strictEqual(await createVm(code).execute(), true);
	});

	it("小于 1 < 2", async () => {
		const code = `1 < 2;`;
		assert.strictEqual(await createVm(code).execute(), true);
	});

	it("小于等于 2 <= 2", async () => {
		const code = `2 <= 2;`;
		assert.strictEqual(await createVm(code).execute(), true);
	});

	it("逻辑非 !false", async () => {
		const code = `!false;`;
		assert.strictEqual(await createVm(code).execute(), true);
	});
});

describe("VM / 位运算", () => {
	it("按位或 1 | 2", async () => {
		const code = `1 | 2;`;
		assert.strictEqual(await createVm(code).execute(), 3);
	});

	it("按位异或 15 ^ 15", async () => {
		const code = `15 ^ 15;`;
		assert.strictEqual(await createVm(code).execute(), 0);
	});

	it("左移 1 << 3", async () => {
		const code = `1 << 3;`;
		assert.strictEqual(await createVm(code).execute(), 8);
	});

	it("无符号右移 8 >>> 2", async () => {
		const code = `8 >>> 2;`;
		assert.strictEqual(await createVm(code).execute(), 2);
	});
});

describe("VM / 字符串与字面量", () => {
	it('字符串拼接 "a" + "b" 为 "ab"', async () => {
		const code = `"a" + "b";`;
		assert.strictEqual(await createVm(code).execute(), "ab");
	});

	it("null 字面量", async () => {
		const code = `null;`;
		assert.strictEqual(await createVm(code).execute(), null);
	});
});

describe("VM / 块与分支", () => {
	it("块语句 { 1 + 2; }", async () => {
		const code = `
			{
				1 + 2;
			}
		`;
		assert.strictEqual(await createVm(code).execute(), 3);
	});

	it("if (true) 分支执行", async () => {
		const code = `
			if (true) {
				1 + 1;
			}
		`;
		assert.strictEqual(await createVm(code).execute(), 2);
	});
});

describe("VM / 赋值", () => {
	it("简单赋值与读取", async () => {
		const code = `
			let x = 1;
			x = 2;
			x;
		`;
		assert.strictEqual(await createVm(code).execute(), 2);
	});

	it("+= 复合赋值", async () => {
		const code = `
			let x = 1;
			x += 2;
			x;
		`;
		assert.strictEqual(await createVm(code).execute(), 3);
	});
});

describe("VM / 函数", () => {
	it("函数声明与调用 return a + b", async () => {
		const code = `
			function add(a, b) {
				return a + b;
			}
			add(3, 4);
		`;
		assert.strictEqual(await createVm(code).execute(), 7);
	});
});
