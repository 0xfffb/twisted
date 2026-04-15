import { HyperionCompiler } from "./compiler/index.js";


async function main() {
	const code = `
var a = 1 + 2 + 3;
    `;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.dir(module, { depth: null });
}

void main();
