#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { runBench } from "./builder/bench.js";
import { HyperionBuildBundle, HyperionCheck, HyperionDump } from "./builder/hyperion.js";
import { buildRuntime } from "./builder/runtime.js";
import { CompileError } from "./compiler/error.js";

type CliCommand =
	| "bench"
	| "build"
	| "check"
	| "dump"
	| "runtime"
	| "all"
	| "help"
	| "version"
	| "-h"
	| "--help"
	| "-v"
	| "--version";

function printHelp() {
	console.log(
		`
Twisted CLI

Usage:
  twisted check <inputPath> [inputPath2 ...]
  twisted bench [inputPath] [--harden] [--runs N]
  twisted build <inputPath> <outputPath> [--obfuscate]
  twisted dump <inputPath> [outDir]
  twisted runtime <bundlePath> <outputPath> [--obfuscate]
  twisted all <inputPath> <bundlePath> <runtimePath> [--obfuscate]
  twisted help
  twisted version
`.trim(),
	);
}

function parseArgsWithObfuscate(args: string[]): { values: string[]; obfuscate: boolean } {
	const obfuscate = args.includes("--obfuscate");
	const values = args.filter((arg) => arg !== "--obfuscate");
	return { values, obfuscate };
}

function parseBenchArgs(args: string[]): {
	inputPath?: string;
	hardenOnly: boolean;
	runs?: number;
} {
	let inputPath: string | undefined;
	let hardenOnly = false;
	let runs: number | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]!;
		if (arg === "--harden") {
			hardenOnly = true;
		} else if (arg === "--runs") {
			const n = Number(args[++i]);
			if (!Number.isFinite(n) || n < 1) {
				throw new Error("bench: --runs requires a positive number");
			}
			runs = n;
		} else if (!arg.startsWith("-")) {
			inputPath = arg;
		} else {
			throw new Error(`bench: unknown flag ${arg}`);
		}
	}

	return { inputPath, hardenOnly, runs };
}

async function printVersion() {
	const text = await readFile("package.json", "utf-8");
	const pkg = JSON.parse(text) as { version?: string };
	console.log(pkg.version ?? "0.0.0");
}

async function main() {
	const [, , rawCommand, ...rest] = process.argv;
	const command = (rawCommand ?? "help") as CliCommand;

	try {
		switch (command) {
			case "help":
				printHelp();
				return;
			case "-h":
			case "--help":
				printHelp();
				return;
			case "version":
			case "-v":
			case "--version":
				await printVersion();
				return;
			case "bench": {
				const benchOpts = parseBenchArgs(rest);
				await runBench({
					inputPath: benchOpts.inputPath,
					hardenOnly: benchOpts.hardenOnly,
					runs: benchOpts.runs,
				});
				return;
			}
			case "check": {
				if (rest.length < 1) {
					console.error("check command requires: <inputPath> [inputPath2 ...]");
					printHelp();
					process.exitCode = 1;
					return;
				}
				for (const inputPath of rest) {
					await HyperionCheck(inputPath);
					console.log(`OK ${inputPath}`);
				}
				return;
			}
			case "build": {
				const { values, obfuscate } = parseArgsWithObfuscate(rest);
				if (values.length < 2) {
					console.error("build command requires: <inputPath> <outputPath>");
					printHelp();
					process.exitCode = 1;
					return;
				}
				const inputPath = values[0]!;
				const outputPath = values[1]!;
				await HyperionBuildBundle(inputPath, outputPath, { obfuscate });
				return;
			}
			case "dump": {
				if (rest.length < 1) {
					console.error("dump command requires: <inputPath> [outDir]");
					printHelp();
					process.exitCode = 1;
					return;
				}
				const inputPath = rest[0]!;
				const outDir = rest[1] ?? ".";
				await HyperionDump(inputPath, outDir);
				return;
			}
			case "runtime": {
				const { values, obfuscate } = parseArgsWithObfuscate(rest);
				if (values.length < 2) {
					console.error("runtime command requires: <bundlePath> <outputPath>");
					printHelp();
					process.exitCode = 1;
					return;
				}
				const bundlePath = values[0]!;
				const outputPath = values[1]!;
				await buildRuntime(bundlePath, outputPath, { obfuscate });
				return;
			}
			case "all": {
				const { values, obfuscate } = parseArgsWithObfuscate(rest);
				if (values.length < 3) {
					console.error("all command requires: <inputPath> <bundlePath> <runtimePath>");
					printHelp();
					process.exitCode = 1;
					return;
				}
				const inputPath = values[0]!;
				const bundlePath = values[1]!;
				const runtimePath = values[2]!;
				await HyperionBuildBundle(inputPath, bundlePath, { obfuscate });
				await buildRuntime(bundlePath, runtimePath, { obfuscate });
				return;
			}
			default:
				console.error(`Unknown command: ${rawCommand}`);
				printHelp();
				process.exitCode = 1;
		}
	} catch (err) {
		if (err instanceof CompileError) {
			console.error(err.message);
			process.exitCode = 1;
			return;
		}
		if (err instanceof Error) {
			console.error(err.message);
			process.exitCode = 1;
			return;
		}
		throw err;
	}
}

void main();
