/**
 * Hyperion 字节码加固管线单测。
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { HyperionAssembler } from "../src/assembler/index.js";
import { HyperionCompiler } from "../src/compiler/index.js";
import { Opcode } from "../src/constant.js";
import {
	MetaCipher,
	MetaEncryptPass,
	Obfuscator,
	OpcodeRemapPass,
	Seed,
} from "../src/obfuscator/index.js";
import VM from "../src/vm/vm.js";

const FIXED_SEED = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const obfuscator = new Obfuscator([new OpcodeRemapPass(), new MetaEncryptPass()]);

function assemble(source: string) {
	return new HyperionAssembler().assemble(new HyperionCompiler(source).compile());
}

function harden(bundle: ReturnType<typeof assemble>, seed = FIXED_SEED) {
	return obfuscator.obfuscate(bundle, seed);
}

function runHardened(source: string): unknown {
	const body = source.includes("__twisted_result")
		? source
		: `window.__twisted_result = (${source});`;
	const hardened = harden(assemble(body));
	const dom = new JSDOM();
	const win = dom.window as unknown as { __twisted_result?: unknown; console: Console };
	new VM(hardened.bytecode, hardened.meta, [win, win.console], hardened.protection).execute();
	return win.__twisted_result;
}

describe("obfuscator / pipeline", () => {
	it("protection 只含 seed + features，同 seed 可复现", () => {
		const a = harden(assemble("window.__twisted_result = 1 + 2;"));
		const b = harden(assemble("window.__twisted_result = 1 + 2;"));
		assert.deepStrictEqual(a.protection, b.protection);
		assert.strictEqual(a.protection.seed, FIXED_SEED);
		assert.deepStrictEqual(a.protection.features, {
			opcodeRemap: true,
			metaEncrypt: true,
		});
		assert.deepStrictEqual(a.bytecode, b.bytecode);
	});

	it("加固后执行结果与明文一致：算术", () => {
		assert.strictEqual(runHardened("1 + 2"), 3);
	});

	it("加固后执行结果与明文一致：字符串", () => {
		assert.strictEqual(
			runHardened(`
				var s = "hi";
				window.__twisted_result = s + "!";
			`),
			"hi!",
		);
	});

	it("加固后方法 this 仍正确", () => {
		assert.strictEqual(
			runHardened(`
				window.__o = { v: 7 };
				window.__o.m = function () {
					window.__twisted_result = this.v;
				};
				window.__o.m();
			`),
			7,
		);
	});

	it("Add 被置换", () => {
		const plain = assemble("window.__twisted_result = 1 + 2;");
		const hardened = harden(plain);
		const wireAdd = Seed.fromHex(FIXED_SEED).opcodeMap()[Opcode.Add]!;
		assert.notStrictEqual(wireAdd, Opcode.Add);
		assert.ok(hardened.bytecode.includes(wireAdd));
	});

	it("meta 密文可用 Seed 还原", () => {
		const plain = assemble(`window.__twisted_result = "secret-token";`);
		const hardened = harden(plain);
		assert.ok(!JSON.stringify(hardened.meta).includes("secret-token"));
		const idx = plain.meta.indexOf("secret-token");
		const restored = new MetaCipher(Seed.fromHex(FIXED_SEED)).decrypt(
			hardened.meta[idx] as number[],
			idx,
		);
		assert.strictEqual(restored, "secret-token");
	});

	it("opcodeMap 为双射", () => {
		const wires = Object.values(Seed.fromHex(FIXED_SEED).opcodeMap());
		assert.strictEqual(new Set(wires).size, wires.length);
	});
});
