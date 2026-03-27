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

async function test() {
	const dt = new window.Date();
	return dt.getUTCFullYear();
}


console.log(await test())

try {
	console.log(10);
} catch (error) {
	console.error(error);
}

const t_b = true;
console.log(t_b)

const t_s = "Hello World!";
console.log(t_s)
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
