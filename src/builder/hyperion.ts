import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { HyperionAssembler } from "../assembler/index.js";
import { HyperionCompiler } from "../compiler/index.js";
import {
	MetaEncryptPass,
	Obfuscator,
	OpcodeRemapPass,
} from "../obfuscator/index.js";
import type { HardenedBundle, Protection } from "../obfuscator/types.js";

interface Bundle {
	bytecode: number[];
	meta: string[];
	protection?: Protection;
}

interface BundleBuildOptions {
	obfuscate?: boolean;
	seed?: string;
}

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
	options: BundleBuildOptions = {},
): Promise<Bundle | HardenedBundle> {
	const source = await readFile(inputPath, "utf-8");
	const ir = new HyperionCompiler(source).compile();
	const assembled = new HyperionAssembler().assemble(ir);

	const bundle: Bundle | HardenedBundle = options.obfuscate
		? new Obfuscator([new OpcodeRemapPass(), new MetaEncryptPass()]).obfuscate(
				assembled,
				options.seed,
			)
		: assembled;

	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, JSON.stringify(bundle), "utf-8");
	console.log(`Compiled bundle written to: ${outputPath}`);
	return bundle;
}

export { HyperionBuildBundle, HyperionDump };
