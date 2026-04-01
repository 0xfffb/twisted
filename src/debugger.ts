import Compiler from "./compiler/compiler.js";
import Assembler from "./assembler/assembler.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";
import { Instruction } from "./instruction.js";
import { OPCODE_NAMES } from "./constant.js";

function debugInstruction(ir: Instruction[]) {
	ir.forEach((instruction) => {
		console.log({ opcode: OPCODE_NAMES[instruction.opcode], args: instruction.args });
	});
}

async function main() {
	const code = `
// console.log(window.tws)
// if (window.tws) {
// 	console.log("find tws")
// }

if (!window.tws) { console.log("hit"); } else { console.log("miss"); }
    `;
	const compiler = new Compiler(code);
	const ir = compiler.compile();
	const assembler = new Assembler();
	const bundle = assembler.assemble(ir);
	debugInstruction(ir);
	console.dir(bundle.meta, { depth: null });
	console.dir(bundle.bytecode, { depth: null });
	const dom = new JSDOM();
	const dependencies = [dom.window, dom.window.console];
	const vm = new VM(bundle.bytecode, bundle.meta, dependencies);
	const result = await vm.execute();
	console.log(result);
}

void main();
