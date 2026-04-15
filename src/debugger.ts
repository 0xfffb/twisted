import { HyperionCompiler } from "./compiler/index.js";

async function main() {
	const code = `
var i = 0;
do {
  i++;
} while (i < 3);

var obj = { a: 1, b: 2 };
for (var key in obj) {
  var val = key;
}

switch (i) {
  case 1: var r = "one"; break;
  case 3: var r = "three"; break;
  default: var r = "other";
}

throw new Error("done");
	`;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.log(module.dump());
}

void main();
