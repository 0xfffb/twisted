import { HyperionCompiler } from "./compiler/index.js";


async function main() {
	const code = `
var a = 1 + 2 + 3;
function test() {
    return 1 + 2 + 3;
}
test();

function outer() {
  // 外部函数变量
  var count = 0;

  // 内部函数
  function inner() {
    count++;
    console.log(count);
  }

  // 把内部函数返出去
  return inner;
}

var fn = outer();

fn(); // 1
fn(); // 2
fn(); // 3

    `;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.dir(module, { depth: null });
	console.log("---------------------")
	console.log(module.dump());
}

void main();
