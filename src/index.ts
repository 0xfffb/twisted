import Compiler from "./compiler/compiler.js";
import Assembler from "./assembler/assembler.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";

function main() {
	const code = `
const a = 1;
const b = a + 2;
const c = 1 + a + b;
window.console.log(a, b, c);

if (b == c) {
    const d = 3;
    window.console.log(d);
} else {
	const e = 4;
	window.console.log(e);
}

function test() {
	return 1
}
window.console.log(test());
    `;
	const compiler = new Compiler(code);
	const ir = compiler.compile();
	const assembler = new Assembler();
	const bytecode = assembler.assemble(ir);
	console.dir(ir, { depth: null });
	console.dir(bytecode, { depth: null });
	const dom = new JSDOM();
	const dependencies = [dom.window, dom.window.console];
	const vm = new VM(bytecode, dependencies);
	const result = vm.execute();
	console.log(result);
}

main();
