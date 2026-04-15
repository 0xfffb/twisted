import { mkdir, readFile, writeFile } from "node:fs/promises";
import { HyperionCompiler } from "../compiler/index.js";
import { HyperionAssembler } from "../assembler/index.js";
import { dirname } from "node:path";
import { transformSync } from "@babel/core";

interface Bundle {
	bytecode: number[];
	meta: string[];
}
interface BundleBuildOptions {
	obfuscate?: boolean;
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

async function HyperionBuildBundle(
	inputPath: string,
	outputPath: string,
	options: BundleBuildOptions = {},
): Promise<Bundle> {
	const source = await readFile(inputPath, "utf-8");
	const es5Source = downlevelToEs5(source);

	await writeFile("es5.js", es5Source, "utf-8");

	const compiler = new HyperionCompiler(es5Source);
	const ir = compiler.compile();
	await writeFile("ir.json", JSON.stringify(ir), "utf-8");
	await writeFile("dump", JSON.stringify(compiler.dump()), "utf-8");
	const assembler = new HyperionAssembler();
	const bundle = assembler.assemble(ir);

	await mkdir(dirname(outputPath), { recursive: true });

	await writeFile(outputPath, JSON.stringify(bundle), "utf-8");
	console.log(`Compiled bundle written to: ${outputPath}`);
	return bundle;
}

export { HyperionBuildBundle };
