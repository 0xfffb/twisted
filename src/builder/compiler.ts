import { mkdir, readFile, writeFile } from "node:fs/promises";
import Compiler from "../compiler/compiler.js";
import Assembler from "../assembler/assembler.js";

interface Bundle {
	bytecode: number[];
	meta: string[];
}

async function main() {
	const inputPath = process.argv[2] ?? "files/runtime_input.js";
	const outputPath = process.argv[3] ?? "dist/runtime/bundle.json";

	const source = await readFile(inputPath, "utf-8");
	const compiler = new Compiler(source);
	const ir = compiler.compile();
	const assembler = new Assembler();
	const bundle = assembler.assemble(ir) as Bundle;

	const outputDir = outputPath.split("/").slice(0, -1).join("/");
	if (outputDir.length > 0) {
		await mkdir(outputDir, { recursive: true });
	}

	await writeFile(outputPath, JSON.stringify(bundle), "utf-8");
	console.log(`Compiled bundle written to: ${outputPath}`);
}

void main();
