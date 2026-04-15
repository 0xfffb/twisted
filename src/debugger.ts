import { HyperionAssembler } from "./assembler/hyperion.js";
import { HyperionCompiler } from "./compiler/index.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";

async function main() {
	const code = `

function getSign() {
    return "1234567890";
}

function hookFetch() {
    const nativeFetch = window.fetch;
    window.Object.defineProperty(window.window, "fetch", {
      value: function(url, options) {
          if (!options) {
            options = {};
          }
          let headers = options.headers;
          if (!headers) {
            headers = {};
          }
          headers["X-Twisted-Sign"] = getSign();
          options.headers = headers;
          return nativeFetch(url, options);
      }
    });

    window.Object.defineProperty(window.fetch, "toString", {
      value: function() {
        return "function fetch() { [native code] }"
      }
    });
}

hookFetch();

var c = 1 + 2 + 3
console.log(c)
	`;
	const compiler = new HyperionCompiler(code);
	const json = compiler.compile();
	console.log(json);

	console.log(compiler.dump());
	const assembler = new HyperionAssembler();
	const bundle = assembler.assemble(json);
	console.log(bundle);

	const dom = new JSDOM();
	const vm = new VM(bundle.bytecode, bundle.meta, [dom.window, dom.window.console]);
	const result = await vm.execute();
	console.log(result);
}


void main();
