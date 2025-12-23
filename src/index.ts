import Compiler from "./compiler/compiler.js";
import Assembler from "./assembler/assembler.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";

function main() {
	const code = `
const a = 1;
const b = a + 2;
window.console.log(123 + 2, b)
    `;
	const compiler = new Compiler(code);
	const ir = compiler.compile();
	const assembler = new Assembler();
	const bytecode = assembler.assemble(ir);
	console.dir(ir, { depth: null });
	console.dir(bytecode, { depth: null });
	const dom = new JSDOM();
	const dependencies = [dom.window, dom.window.console];
	const vm = new VM(dependencies);
	const result = vm.execute(bytecode);
	console.log(result);
}

main();
