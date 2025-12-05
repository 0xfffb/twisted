import Compiler from "./compiler/compiler.js";

function main() {
	const code = `
let a = 10 + 20
console.log(a)
function test() {
    let b = 30
    console.log(b)
}
test()
    `;
	const compiler = new Compiler(code);
	const ir = compiler.compile();
	console.dir(ir, { depth: null });
}

main();
