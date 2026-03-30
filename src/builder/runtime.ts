import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import JavaScriptObfuscator from "javascript-obfuscator";

interface Bundle {
	bytecode: number[];
	meta: string[];
}

const obfuscatorOptions: JavaScriptObfuscator.ObfuscatorOptions = {
	compact: true,
	identifierNamesGenerator: "hexadecimal",
	renameGlobals: true,
	renameProperties: true,
	renamePropertiesMode: "safe",
	numbersToExpressions: true,
	stringArray: true,
	stringArrayThreshold: 1,
	stringArrayEncoding: ["base64"],
	stringArrayRotate: true,
	stringArrayShuffle: true,
	stringArrayWrappersCount: 4,
	stringArrayWrappersType: "function",
	stringArrayWrappersChainedCalls: true,
	stringArrayWrappersParametersMaxCount: 5,
	splitStrings: true,
	splitStringsChunkLength: 5,
	unicodeEscapeSequence: true,
	transformObjectKeys: true,
	controlFlowFlattening: true,
	controlFlowFlatteningThreshold: 1,
	deadCodeInjection: true,
	deadCodeInjectionThreshold: 0.4,
	simplify: true,
	disableConsoleOutput: true,
	selfDefending: true,
	debugProtection: true,
	debugProtectionInterval: 2000,
	reservedNames: ["^TwistedRuntimeBundle$", "^TwistedRuntime$"],
};

function createRuntimeEntry(bundle: Bundle): string {
	const bytecode = JSON.stringify(bundle.bytecode);
	const meta = JSON.stringify(bundle.meta);

	return `
import VM from "./src/vm/vm.ts";

const bytecode = ${bytecode};
const meta = ${meta};

(async () => {
    const vm = new VM(bytecode, meta, [window, console]);
    await vm.execute();
})();
`;
}

async function main() {
	const bundlePath = process.argv[2] ?? "dist/runtime/bundle.json";
	const outFile = process.argv[3] ?? "dist/browser/runtime.js";
	const outFileEsm = process.argv[4] ?? "dist/browser/runtime.esm.js";

	const bundleRaw = await readFile(bundlePath, "utf-8");
	const bundle = JSON.parse(bundleRaw) as Bundle;

	await mkdir("dist/browser", { recursive: true });
	const entry = createRuntimeEntry(bundle);

	await build({
		stdin: {
			contents: entry,
			resolveDir: process.cwd(),
			sourcefile: "runtime-entry.ts",
			loader: "ts",
		},
		bundle: true,
		minify: true,
		legalComments: "none",
		drop: ["console"],
		format: "iife",
		platform: "browser",
		globalName: "TwistedRuntimeBundle",
		outfile: outFile,
	});

	await build({
		stdin: {
			contents: entry,
			resolveDir: process.cwd(),
			sourcefile: "runtime-entry.ts",
			loader: "ts",
		},
		bundle: true,
		minify: true,
		legalComments: "none",
		drop: ["console"],
		format: "esm",
		platform: "browser",
		outfile: outFileEsm,
	});

	const iifeSource = await readFile(outFile, "utf-8");
	const iifeObfResult = JavaScriptObfuscator.obfuscate(iifeSource, obfuscatorOptions);
	await writeFile(outFile, iifeObfResult.getObfuscatedCode(), "utf-8");

	const esmSource = await readFile(outFileEsm, "utf-8");
	const esmObfResult = JavaScriptObfuscator.obfuscate(esmSource, obfuscatorOptions);
	await writeFile(outFileEsm, esmObfResult.getObfuscatedCode(), "utf-8");

	console.log(`Runtime bundles written to: ${outFile}, ${outFileEsm}`);
}

void main();
