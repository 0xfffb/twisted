/**
 * meta 字符串池加解密（构建 / 运行时共用）。
 */
import type { Seed } from "./seed.js";
import type { EncryptedMeta } from "./types.js";

class MetaCipher {
	private readonly key: number;
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder();

	constructor(seed: Seed) {
		this.key = seed.metaKey();
	}

	encryptAll(meta: string[]): EncryptedMeta {
		return meta.map((s, i) => this.encrypt(s, i));
	}

	encrypt(plain: string, index: number): number[] {
		const bytes = this.encoder.encode(plain);
		const out = new Array<number>(bytes.length);
		for (let j = 0; j < bytes.length; j++) {
			out[j] = this.xor(bytes[j]!, index, j);
		}
		return out;
	}

	decrypt(bytes: number[], index: number): string {
		const out = new Uint8Array(bytes.length);
		for (let j = 0; j < bytes.length; j++) {
			out[j] = this.xor(bytes[j]!, index, j);
		}
		return this.decoder.decode(out);
	}

	private xor(b: number, metaIndex: number, offset: number): number {
		return b ^ ((this.key + metaIndex * 31 + offset) & 0xff);
	}
}

export { MetaCipher };
