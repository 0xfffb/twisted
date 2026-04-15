import { LinearIRCompiler } from "./compiler/compiler.js";
import Assembler from "./assembler/assembler.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";
import { Instruction } from "./instruction.js";
import { OPCODE_NAMES } from "./constant.js";
import { ArithmeticDeformationPass } from "./obfuscator/passes/arithmetic.js";
import Obfuscator from "./obfuscator/obfuscator.js";

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
const a = 1;
const b = 2;
const c = a + b;
console.log(c);

if (!window.tws) { console.log("hit"); } else { console.log("miss"); }
    `;
	const compiler = new LinearIRCompiler(code);
	const ir = compiler.compile();

	const passes = [new ArithmeticDeformationPass()];
	const obfuscator = new Obfuscator(passes);

	const obfuscatedIr = obfuscator.obfuscate(ir);
	const assembler = new Assembler();
	const bundle = assembler.assemble(obfuscatedIr);
	console.log("// --- 编译后 IR（未混淆）---");
	debugInstruction(ir);
	console.log("// --- ArithmeticDeformationPass 之后 ---");
	debugInstruction(obfuscatedIr);
	console.dir(bundle.meta, { depth: null });
	console.dir(bundle.bytecode, { depth: null });
	console.log("IR length:", obfuscatedIr.length);
	const dom = new JSDOM();
	const dependencies = [dom.window, dom.window.console];
	const vm = new VM(bundle.bytecode, bundle.meta, dependencies);
	const result = await vm.execute();
	console.log(result);
}

void main();
