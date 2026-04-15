import { HyperionCompiler } from "./compiler/index.js";

async function main() {
	const code = `
var a = 10 % 3;
var b = 5 & 3;
var c = 5 | 3;
var d = 5 ^ 3;
var e = 1 << 2;
var f = 8 >> 1;
var g = -1 >>> 0;

function Foo() { this.x = 1; }
var isFoo = new Foo() instanceof Foo;
var obj = { x: 1 };
var hasX = "x" in obj;

delete obj.x;
delete obj["y"];

function test() {
  return arguments[0];
}

try {
  throw new Error("boom");
} catch (e) {
  var msg = e;
} finally {
  var done = true;
}
	`;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.log(module.dump());
}

void main();
