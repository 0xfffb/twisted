import Compiler from "./compiler/compiler.js";
import Assembler from "./assembler/assembler.js";
import VM from "./vm/vm.js";

function main() {
	const code = `
let a = 10 + 20
console.log(a)
    `;
	const compiler = new Compiler(code);
	const ir = compiler.compile();
	const assembler = new Assembler();
	const bytecode = assembler.assemble(ir);
	console.dir(ir, { depth: null });
	console.dir(bytecode, { depth: null });
	const vm = new VM();
	const result = vm.execute(bytecode);
	console.log(result);
}

main();
