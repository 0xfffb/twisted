import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Compiler from "../src/compiler/compiler.js";
import { Opcode, OPCODE_NAMES } from "../src/constant.js";
import { ArgKind, type Instruction } from "../src/instruction.js";

function compile(source: string): Instruction[] {
	return new Compiler(source).compile();
}

/** 最后一条须为 Halt（compile 末尾固定追加） */
function expectEndsWithHalt(ir: Instruction[]) {
	assert.ok(ir.length > 0);
	const last = ir[ir.length - 1];
	assert.strictEqual(last.opcode, Opcode.Halt);
	assert.deepStrictEqual(last.args, []);
}

describe("Compiler / 基础", () => {
	it("空程序仍生成 Halt", () => {
		const ir = compile("");
		expectEndsWithHalt(ir);
		assert.strictEqual(ir.length, 1);
	});

	it("不支持的语句类型会抛错", () => {
		assert.throws(() => compile("class A {}"), /Unsupported statement type/);
	});
});

describe("Compiler / 字面量与表达式", () => {
	it("数字字面量 1 + 2 生成 Push, Push, Add", () => {
		const ir = compile("1 + 2;");
		assert.strictEqual(ir[0].opcode, Opcode.Push);
		assert.strictEqual(ir[0].args[0].kind, ArgKind.Number);
		assert.strictEqual(ir[0].args[0].value, 1);
		assert.strictEqual(ir[1].opcode, Opcode.Push);
		assert.strictEqual(ir[1].args[0].value, 2);
		assert.strictEqual(ir[2].opcode, Opcode.Add);
		expectEndsWithHalt(ir);
	});

	it("字符串字面量 Push(String)", () => {
		const ir = compile(`("hello");`);
		assert.strictEqual(ir[0].opcode, Opcode.Push);
		assert.strictEqual(ir[0].args[0].kind, ArgKind.String);
		assert.strictEqual(ir[0].args[0].value, "hello");
		expectEndsWithHalt(ir);
	});

	it("布尔字面量", () => {
		const ir = compile("true;");
		assert.strictEqual(ir[0].opcode, Opcode.Push);
		assert.strictEqual(ir[0].args[0].kind, ArgKind.Number);
		assert.strictEqual(ir[0].args[0].value, 1);
		expectEndsWithHalt(ir);
	});

	it("null 为 PushNull", () => {
		const ir = compile("null;");
		assert.strictEqual(ir[0].opcode, Opcode.PushNull);
		assert.deepStrictEqual(ir[0].args, []);
		expectEndsWithHalt(ir);
	});

	it("一元 ! 生成 Not", () => {
		const ir = compile("!false;");
		assert.strictEqual(ir[0].opcode, Opcode.Push);
		assert.strictEqual(ir[1].opcode, Opcode.Not);
		expectEndsWithHalt(ir);
	});

	it("一元负数字面量 -1 为单条 Push(-1)", () => {
		const ir = compile("-1;");
		assert.strictEqual(ir[0].opcode, Opcode.Push);
		assert.strictEqual(ir[0].args[0].kind, ArgKind.Number);
		assert.strictEqual(ir[0].args[0].value, -1);
		expectEndsWithHalt(ir);
	});
});

describe("Compiler / 二元运算 opcode", () => {
	const cases: { code: string; expected: number }[] = [
		{ code: "1 - 2;", expected: Opcode.Sub },
		{ code: "2 * 3;", expected: Opcode.Mul },
		{ code: "8 / 2;", expected: Opcode.Div },
		{ code: "1 === 1;", expected: Opcode.Equal },
		{ code: "1 < 2;", expected: Opcode.LessThan },
		{ code: "2 <= 2;", expected: Opcode.LessThanOrEqual },
		{ code: "1 | 2;", expected: Opcode.BitOr },
		{ code: "3 ^ 3;", expected: Opcode.BitXor },
		{ code: "1 << 2;", expected: Opcode.ShiftLeft },
		{ code: "8 >>> 2;", expected: Opcode.ShiftRightUnsigned },
	];

	for (const { code, expected } of cases) {
		it(`\`${code.trim()}\` → ${OPCODE_NAMES[expected] ?? expected}`, () => {
			const ir = compile(code);
			assert.strictEqual(ir[2].opcode, expected);
			expectEndsWithHalt(ir);
		});
	}
});

describe("Compiler / 变量", () => {
	it("const 声明与 Load", () => {
		const ir = compile(`
			const a = 1;
			a;
		`);
		const push = ir.findIndex((i) => i.opcode === Opcode.Push && i.args[0]?.value === 1);
		assert.ok(push >= 0);
		assert.strictEqual(ir[push + 1].opcode, Opcode.Store);
		assert.strictEqual(ir[push + 1].args[0].kind, ArgKind.Variable);
		const loadIdx = ir.findIndex((i) => i.opcode === Opcode.Load);
		assert.ok(loadIdx > 0);
		assert.strictEqual(ir[loadIdx].args[0].kind, ArgKind.Variable);
		expectEndsWithHalt(ir);
	});
});

describe("Compiler / 控制流", () => {
	it("if (true) 分支含 JmpIf 与 Jmp", () => {
		const ir = compile(`
			if (true) {
				1;
			}
		`);
		const opcodes = ir.map((i) => i.opcode);
		assert.ok(opcodes.includes(Opcode.JmpIf));
		assert.ok(opcodes.includes(Opcode.Jmp));
		assert.ok(opcodes.filter((o) => o === Opcode.Jmp).length >= 1);
		expectEndsWithHalt(ir);
	});

	it("DynAddr 回填为 IR 下标（数字）", () => {
		const ir = compile(`
			if (true) {
				1;
			}
		`);
		const dyn = ir.flatMap((i) => i.args).filter((a) => a.kind === ArgKind.DynAddr);
		assert.ok(dyn.length > 0);
		for (const a of dyn) {
			assert.strictEqual(typeof a.value, "number");
			assert.ok(a.value >= 0);
			assert.ok(a.value < ir.length);
		}
	});
});

describe("Compiler / 函数声明", () => {
	it("含 function 时存在 Jmp 跳过函数体", () => {
		const ir = compile(`
			function f() {
				return 1;
			}
			2;
		`);
		const opcodes = ir.map((i) => i.opcode);
		assert.ok(opcodes.includes(Opcode.Jmp));
		assert.ok(opcodes.includes(Opcode.PopFrame));
		expectEndsWithHalt(ir);
	});
});

describe("Compiler / Debugger", () => {
	it("debugger 语句生成 Debugger", () => {
		const ir = compile("debugger;");
		assert.strictEqual(ir[0].opcode, Opcode.Debugger);
		expectEndsWithHalt(ir);
	});
});
