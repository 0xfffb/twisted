import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import JavaScriptObfuscator from "javascript-obfuscator";
import { transformSync } from "@babel/core";
import { dirname } from "node:path";

interface Bundle {
	bytecode: number[];
	meta: string[];
}
interface RuntimeBuildOptions {
	obfuscate?: boolean;
}

const obfuscatorOptions: JavaScriptObfuscator.ObfuscatorOptions = {
	compact: true,
	identifierNamesGenerator: "mangled",
	renameGlobals: true,
	domainLock: [],
	renameProperties: true,
	renamePropertiesMode: "unsafe",
	numbersToExpressions: true,
	stringArray: true,
	stringArrayThreshold: 1,
	stringArrayEncoding: ["rc4"],
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
	// disableConsoleOutput: true,
	selfDefending: true,
	// debugProtection: true,
	// debugProtectionInterval: 2000,
	// reservedNames: ["^TwistedRuntimeBundle$", "^TwistedRuntime$"],
	stringArrayCallsTransform: true,
	stringArrayCallsTransformThreshold: 1,
	stringArrayIndexesType: ["hexadecimal-number"],
};

function createRuntimeEntry(bundle: Bundle): string {
	const bytecode = JSON.stringify(bundle.bytecode);
	const meta = JSON.stringify(bundle.meta);

	return `
import VM from "./src/vm/vm.ts";

const bytecode = ${bytecode};
const meta = ${meta};

const vm = new VM(bytecode, meta, [window, console]);
vm.execute();
`;
}

function downlevelToEs5(source: string): string {
	const result = transformSync(source, {
		babelrc: false,
		configFile: false,
		comments: false,
		compact: false,
		presets: [
		  [
			"@babel/preset-env",
			{
			  targets: { ie: "11" },
			  modules: false,
			  bugfixes: true
			}
		  ]
		]
	  });

	if (!result?.code) {
		throw new Error("HyperionBuilder: Babel downlevel to ES5 failed");
	}

	return result.code;
}

async function buildRuntime(
	bundlePath: string,
	outFile: string,
	options: RuntimeBuildOptions = {},
): Promise<void> {
	const bundleRaw = await readFile(bundlePath, "utf-8");
	const bundle = JSON.parse(bundleRaw) as Bundle;
	const obfuscate = options.obfuscate ?? false;

	const entry = createRuntimeEntry(bundle);
	await mkdir(dirname(outFile), { recursive: true });

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
		outfile: outFile,
	});

	if (obfuscate) {
		const iifeSource = await readFile(outFile, "utf-8");
		const es5Entry = downlevelToEs5(iifeSource);
		const iifeObfResult = JavaScriptObfuscator.obfuscate(es5Entry, obfuscatorOptions);
		await writeFile(outFile, iifeObfResult.getObfuscatedCode(), "utf-8");
	}

	console.log(`Runtime bundles written to: ${outFile}`);
}

export { buildRuntime };
