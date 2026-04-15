#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { LinearBuildBundle } from "./builder/linear.js";
import { HyperionBuildBundle, HyperionDump } from "./builder/hyperion.js";
import { buildRuntime } from "./builder/runtime.js";

type CliCommand =
	| "build"
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

async function printVersion() {
	const text = await readFile("package.json", "utf-8");
	const pkg = JSON.parse(text) as { version?: string };
	console.log(pkg.version ?? "0.0.0");
}

async function main() {
	const [, , rawCommand, ...rest] = process.argv;
	const command = (rawCommand ?? "help") as CliCommand;

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
}

void main();
