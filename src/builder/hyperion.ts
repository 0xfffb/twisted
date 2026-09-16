import { mkdir, readFile, writeFile } from "node:fs/promises";
import { HyperionCompiler } from "../compiler/index.js";
import { HyperionAssembler } from "../assembler/index.js";
import { dirname, join } from "node:path";

interface Bundle {
	bytecode: number[];
	meta: string[];
}
interface BundleBuildOptions {
	obfuscate?: boolean;
}

/** 输入须为 ES5 语法；不再 Babel 降级。 */
async function HyperionDump(inputPath: string, outDir = "."): Promise<void> {
	const source = await readFile(inputPath, "utf-8");
	const compiler = new HyperionCompiler(source);
	compiler.compile();
	await mkdir(outDir, { recursive: true });
	await writeFile(join(outDir, "dump"), compiler.dump(), "utf-8");
	console.log(`🔍 Dump written to ${outDir}/dump`);
}

async function HyperionBuildBundle(
	inputPath: string,
	outputPath: string,
	_options: BundleBuildOptions = {},
): Promise<Bundle> {
	const source = await readFile(inputPath, "utf-8");
	const compiler = new HyperionCompiler(source);
	const ir = compiler.compile();

	const assembler = new HyperionAssembler();
	const bundle = assembler.assemble(ir);

	await mkdir(dirname(outputPath), { recursive: true });

	await writeFile(outputPath, JSON.stringify(bundle), "utf-8");
	console.log(`Compiled bundle written to: ${outputPath}`);
	return bundle;
}

export { HyperionBuildBundle, HyperionDump };
