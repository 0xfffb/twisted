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

function main() {
	const code = `
const a = 1;
const b = a + 2;
const c = 1 + a + b;
console.log(a, b);

if (b == c) {
    const d = 3;
    window.console.log(d);
} else {
	const e = 4;
	window.console.log(e);
}

function test(a) {
	window.console.log(a);
}
test(123456789)

function test1(a) {
	return a + 1;
}
console.log(test1(4))

try {
	console.log("test")
} catch (error) {
	console.error(error);
}
    `;
	const compiler = new Compiler(code);
	const ir = compiler.compile();
	const assembler = new Assembler();
	const bytecode = assembler.assemble(ir);
	debugInstruction(ir);
	console.dir(bytecode, { depth: null });
	const dom = new JSDOM();
	const dependencies = [dom.window, dom.window.console];
	const vm = new VM(bytecode, dependencies);
	const result = vm.execute();
	console.log(result);
}

main();
