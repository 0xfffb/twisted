import { HyperionCompiler } from "./compiler/index.js";

async function main() {
	const code = `
var obj = { x: 1, arr: [10, 20] };
var a = obj.x;
var b = obj.arr[0];
obj.x = 99;
obj.arr[1] = 30;

function Foo() {
  this.val = 42;
}
	`;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.log(module.dump());
}

void main();
