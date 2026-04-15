import { HyperionCompiler } from "./compiler/index.js";


async function main() {
	const code = `
var x = [1, 2, 3];
var neg = -5;
var yes = !false;

if (x) {
  var a = 1;
} else {
  var a = 2;
}

var i = 0;
while (i < 3) {
  i++;
}

for (var j = 0; j < 5; j++) {
  if (j == 2) break;
}
    `;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.log(module.dump());
}

void main();
