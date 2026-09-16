/**
 * 本地调试：直接编译 example/fingerprint.js（须为 ES5），在 jsdom 中执行。
 */
import { readFile } from "node:fs/promises";
import { HyperionAssembler } from "./assembler/index.js";
import { HyperionCompiler } from "./compiler/index.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";

async function main() {
	const code = await readFile("example/fingerprint.js", "utf-8");
	const compiler = new HyperionCompiler(code);
	const ir = compiler.compile();
	console.log(compiler.dump());

	const assembler = new HyperionAssembler();
	const bundle = assembler.assemble(ir);
	console.log(bundle);

	const dom = new JSDOM("", { url: "https://example.com/" });
	const vm = new VM(bundle.bytecode, bundle.meta, [dom.window, dom.window.console]);
	const result = vm.execute();
	console.log(result);
}

void main();
