import { mkdir, readFile, writeFile } from "node:fs/promises";
import { HyperionCompiler } from "../compiler/index.js";
import { HyperionAssembler } from "../assembler/index.js";
import { dirname } from "node:path";

interface Bundle {
	bytecode: number[];
	meta: string[];
}
interface BundleBuildOptions {
	obfuscate?: boolean;
}

async function buildBundle(
	inputPath: string,
	outputPath: string,
	options: BundleBuildOptions = {},
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

export { buildBundle };
