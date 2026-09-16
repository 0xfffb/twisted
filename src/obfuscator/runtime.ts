/**
 * 运行时：根据 Protection 还原 Opcode 表与 meta 解析。
 */
import { MetaCipher } from "./crypto.js";
import { Seed } from "./seed.js";
import type { EncryptedMeta, Protection } from "./types.js";

class RuntimeProtection {
	readonly opcodeMap: Record<number, number> | null;
	private readonly resolve: (index: number) => string;

	constructor(meta: string[] | EncryptedMeta, protection: Protection | null = null) {
		if (!protection) {
			this.opcodeMap = null;
			const plain = meta as string[];
			this.resolve = (i) => {
				const v = plain[i];
				if (v === undefined) throw new Error(`VM: meta index out of range: ${i}`);
				return v;
			};
			return;
		}

		const seed = Seed.fromHex(protection.seed);
		this.opcodeMap = protection.features.opcodeRemap ? seed.opcodeMap() : null;

		if (!protection.features.metaEncrypt) {
			const plain = meta as string[];
			this.resolve = (i) => {
				const v = plain[i];
				if (v === undefined) throw new Error(`VM: meta index out of range: ${i}`);
				return v;
			};
			return;
		}

		if (meta.length > 0 && !Array.isArray(meta[0])) {
			throw new Error("RuntimeProtection: metaEncrypt set but meta is plain");
		}
		const cipher = new MetaCipher(seed);
		const enc = meta as EncryptedMeta;
		const cache: (string | undefined)[] = new Array(enc.length);
		this.resolve = (i) => {
			const hit = cache[i];
			if (hit !== undefined) return hit;
			const row = enc[i];
			if (row === undefined) throw new Error(`VM: meta index out of range: ${i}`);
			const s = cipher.decrypt(row, i);
			cache[i] = s;
			return s;
		};
	}

	meta(index: number): string {
		return this.resolve(index);
	}
}

export { RuntimeProtection };
