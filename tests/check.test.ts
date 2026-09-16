import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { HyperionCheck } from "../src/builder/hyperion.js";
import { CompileError, CompileErrorCode } from "../src/compiler/index.js";

describe("HyperionCheck", () => {
	it("合法 ES5 通过", async () => {
		const dir = await mkdtemp(join(tmpdir(), "twisted-check-"));
		try {
			const file = join(dir, "ok.js");
			await writeFile(file, "var x = 1 + 2;");
			await HyperionCheck(file);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("白名单外语法拒绝", async () => {
		const dir = await mkdtemp(join(tmpdir(), "twisted-check-"));
		try {
			const file = join(dir, "bad.js");
			await writeFile(file, "let x = 1;");
			await assert.rejects(() => HyperionCheck(file), (err: unknown) => {
				assert.ok(err instanceof CompileError);
				assert.strictEqual(err.code, CompileErrorCode.UNSUPPORTED_VAR_KIND);
				return true;
			});
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("example/fingerprint.js 可通过 check", async () => {
		const source = await readFile("example/fingerprint.js", "utf-8");
		const dir = await mkdtemp(join(tmpdir(), "twisted-check-"));
		try {
			const file = join(dir, "fingerprint.js");
			await writeFile(file, source);
			await HyperionCheck(file);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
