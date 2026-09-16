import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import Compiler from "../src/compiler/compiler.js";
import Assembler from "../src/assembler/assembler.js";
import VM from "../src/vm/vm.js";
import Obfuscator from "../src/obfuscator/obfuscator.js";
import { ArithmeticDeformationPass } from "../src/obfuscator/passes/arithmetic.js";
import { Opcode } from "../src/constant.js";

function runVm(source: string, obfuscate: boolean): Promise<unknown> {
	const ir = new Compiler(source).compile();
	const finalIr = obfuscate ? new Obfuscator([new ArithmeticDeformationPass()]).obfuscate(ir) : ir;
	const bundle = new Assembler().assemble(finalIr);
	const dom = new JSDOM();
	return new VM(bundle.bytecode, bundle.meta, [dom.window, dom.window.console]).execute();
}

describe("Obfuscator", () => {
	it("无 pass 时串联为空则输出与输入同长度", () => {
		const ir = new Compiler("1+2;").compile();
		const out = new Obfuscator([]).obfuscate(ir);
		assert.strictEqual(out.length, ir.length);
	});

	it("ArithmeticDeformationPass：Push 双常量 + Add 执行结果不变", async () => {
		const src = "1 + 2;";
		const plain = await runVm(src, false);
		for (let k = 0; k < 5; k++) {
			const obf = await runVm(src, true);
			assert.strictEqual(obf, plain);
			assert.strictEqual(obf, 3);
		}
	});

	it("ArithmeticDeformationPass：Load+Load+Add 展开后长度增加且结果正确", async () => {
		const src = `
			const a = 1;
			const b = 2;
			a + b;
		`;
		const ir = new Compiler(src).compile();
		const obfIr = new Obfuscator([new ArithmeticDeformationPass()]).obfuscate(ir);
		assert.ok(obfIr.length > ir.length);

		const plain = await runVm(src, false);
		const obf = await runVm(src, true);
		assert.strictEqual(obf, plain);
		assert.strictEqual(obf, 3);
	});

	it("ArithmeticDeformationPass：含分支时代码仍可执行", async () => {
		const src = `
			let x = 1;
			if (true) { x = x + 1; }
			x;
		`;
		const r = await runVm(src, true);
		assert.strictEqual(r, 2);
	});
});

describe("ArithmeticDeformationPass / IR", () => {
	it("双常量 Add：前两条仍为 Push，第三条 Add，两常量之和为 3", () => {
		const ir = new Compiler("1+2;").compile();
		const out = new ArithmeticDeformationPass().transform(ir);
		assert.strictEqual(out[0]!.opcode, Opcode.Push);
		assert.strictEqual(out[1]!.opcode, Opcode.Push);
		assert.strictEqual(out[2]!.opcode, Opcode.Add);
		const x = out[0]!.args[0]!.value as number;
		const y = out[1]!.args[0]!.value as number;
		assert.strictEqual(x + y, 3);
	});
});
