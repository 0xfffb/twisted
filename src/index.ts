import Compiler from "./compiler/compiler.js";
import { OPCODE } from "./constant.js";

function main() {
	const code = `
let a = 10 + 20
console.log(a)
    `;
	const compiler = new Compiler(code, OPCODE);
	const ir = compiler.compile();
	console.dir(ir, { depth: null });
}

main();
