import { HyperionCompiler } from "./compiler/index.js";

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
	`;
	const compiler = new HyperionCompiler(code);
	const module = compiler.compile();
	console.log(module.dump());
}

void main();
