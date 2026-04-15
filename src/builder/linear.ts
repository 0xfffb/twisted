import { mkdir, readFile, writeFile } from "node:fs/promises";
import { LinearCompiler } from "../compiler/index.js";
import { LinearAssembler } from "../assembler/index.js";
import { dirname } from "node:path";
import Obfuscator from "../obfuscator/obfuscator.js";
import { ArithmeticDeformationPass } from "../obfuscator/passes/arithmetic.js";

interface Bundle {
	bytecode: number[];
	meta: string[];
}
interface BundleBuildOptions {
	obfuscate?: boolean;
}

async function LinearBuildBundle(
	inputPath: string,
	outputPath: string,
	options: BundleBuildOptions = {},
): Promise<Bundle> {
	const source = await readFile(inputPath, "utf-8");
	const compiler = new LinearCompiler(source);
	let ir = compiler.compile();
	if (options.obfuscate) {
		const obfuscator = new Obfuscator([new ArithmeticDeformationPass()]);
		ir = obfuscator.obfuscate(ir);
	}
	const assembler = new LinearAssembler();
	const bundle = assembler.assemble(ir) as Bundle;

	await mkdir(dirname(outputPath), { recursive: true });

	await writeFile(outputPath, JSON.stringify(bundle), "utf-8");
	console.log(`Compiled bundle written to: ${outputPath}`);
	return bundle;
}

export { LinearBuildBundle };
