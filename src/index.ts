import Compiler from "./compiler/compiler.js";
import Assembler from "./assembler/assembler.js";
import VM from "./vm/vm.js";

function main() {
	const code = `
console.log(10)
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
