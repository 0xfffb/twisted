import { HyperionCompiler } from "./compiler/index.js";

async function main() {
	const code = `
var x = 10;
var label = x > 5 ? "big" : "small";
var nested = x > 10 ? "a" : x > 5 ? "b" : "c";
var y = x > 0 ? x * 2 : -x;
	`;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.log(module.dump());
}

void main();
