/**
 * 本地体积 / VM 冷启动 benchmark（不进 CI gate）。
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { JSDOM } from "jsdom";
import { HyperionAssembler } from "../assembler/index.js";
import { HyperionCompiler } from "../compiler/index.js";
import {
	MetaEncryptPass,
	Obfuscator,
	OpcodeRemapPass,
} from "../obfuscator/index.js";
import type { HardenedBundle, PlainBundle } from "../obfuscator/types.js";
import VM from "../vm/vm.js";
import { buildRuntime } from "./runtime.js";

const EXEC_SNIPPET = "window.__twisted_result = 1 + 2;";

type Bundle = PlainBundle | HardenedBundle;

interface BenchExecStats {
	runs: number;
	p50: number;
	p95: number;
	min: number;
	max: number;
}

interface BenchVariantReport {
	bundleBytes: number;
	bundleGzip: number;
	runtimeBytes: number;
	runtimeGzip: number;
	executeSnippet: string;
	execute: BenchExecStats;
}

interface BenchReport {
	at: string;
	input: string;
	variants: Record<string, BenchVariantReport>;
}

interface BenchOptions {
	/** 默认 example/fingerprint.js */
	inputPath?: string;
	/** 只测 hardened，跳过 plain */
	hardenOnly?: boolean;
	/** vm.execute 采样次数，默认 30 */
	runs?: number;
	/** 临时产物目录，默认 bench/.out */
	outDir?: string;
	/** JSON 报告路径，默认 bench/latest.json */
	reportPath?: string;
	/** 项目根（esbuild resolveDir），默认 process.cwd() */
	cwd?: string;
}

function fmtBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function compileBundle(source: string, harden: boolean): Bundle {
	const plain = new HyperionAssembler().assemble(new HyperionCompiler(source).compile());
	if (!harden) return plain;
	return new Obfuscator([new OpcodeRemapPass(), new MetaEncryptPass()]).obfuscate(plain);
}

function benchVmExecute(bundle: Bundle, runs: number): BenchExecStats {
	const dom = new JSDOM();
	const win = dom.window;
	const deps = [win, win.console];
	const times: number[] = [];
	for (let i = 0; i < runs; i++) {
		const t0 = performance.now();
		new VM(bundle.bytecode, bundle.meta, deps, "protection" in bundle ? bundle.protection : null).execute();
		times.push(performance.now() - t0);
	}
	times.sort((a, b) => a - b);
	return {
		runs,
		p50: times[Math.floor(times.length * 0.5)] ?? 0,
		p95: times[Math.floor(times.length * 0.95)] ?? 0,
		min: times[0] ?? 0,
		max: times[times.length - 1] ?? 0,
	};
}

async function runBench(options: BenchOptions = {}): Promise<BenchReport> {
	const cwd = options.cwd ?? process.cwd();
	const inputPath = resolve(cwd, options.inputPath ?? "example/fingerprint.js");
	const outDir = resolve(cwd, options.outDir ?? "bench/.out");
	const reportPath = resolve(cwd, options.reportPath ?? "bench/latest.json");
	const runs = options.runs ?? 30;

	const source = await readFile(inputPath, "utf-8");
	const plain = compileBundle(source, false);
	const hardened = compileBundle(source, true);
	const execPlain = compileBundle(EXEC_SNIPPET, false);
	const execHardened = compileBundle(EXEC_SNIPPET, true);

	const variants: { name: string; bundle: Bundle; execBundle: Bundle }[] = options.hardenOnly
		? [{ name: "hardened", bundle: hardened, execBundle: execHardened }]
		: [
				{ name: "plain", bundle: plain, execBundle: execPlain },
				{ name: "hardened", bundle: hardened, execBundle: execHardened },
			];

	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });
	await mkdir(dirname(reportPath), { recursive: true });

	console.log(`\nTwisted bench — ${inputPath}\n${"=".repeat(56)}`);

	const report: BenchReport = {
		at: new Date().toISOString(),
		input: inputPath,
		variants: {},
	};

	for (const { name, bundle, execBundle } of variants) {
		const bundlePath = join(outDir, `${name}.bundle.json`);
		const runtimePath = join(outDir, `${name}.runtime.js`);
		await writeFile(bundlePath, JSON.stringify(bundle));
		await buildRuntime(bundlePath, runtimePath);

		const bundleBytes = Buffer.from(await readFile(bundlePath));
		const runtimeBytes = Buffer.from(await readFile(runtimePath));
		const exec = benchVmExecute(execBundle, runs);

		console.log(`\n[${name}]`);
		console.log(
			`  bundle.json     ${fmtBytes(bundleBytes.length)}  (gzip ${fmtBytes(gzipSync(bundleBytes).length)})`,
		);
		console.log(
			`  runtime.js      ${fmtBytes(runtimeBytes.length)}  (gzip ${fmtBytes(gzipSync(runtimeBytes).length)})`,
		);
		console.log(
			`  vm.execute()    p50 ${exec.p50.toFixed(2)} ms  p95 ${exec.p95.toFixed(2)} ms  (${exec.runs} runs, jsdom, 1+2 snippet)`,
		);

		report.variants[name] = {
			bundleBytes: bundleBytes.length,
			bundleGzip: gzipSync(bundleBytes).length,
			runtimeBytes: runtimeBytes.length,
			runtimeGzip: gzipSync(runtimeBytes).length,
			executeSnippet: EXEC_SNIPPET,
			execute: exec,
		};
	}

	await writeFile(reportPath, JSON.stringify(report, null, 2));
	console.log(`\nWrote ${reportPath}\n`);
	return report;
}

export { runBench, type BenchOptions, type BenchReport };
