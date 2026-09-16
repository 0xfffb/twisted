/**
 * 可复现 Seed：派生 Opcode 置换表与 meta 密钥。
 */
import { OPCODE_NAMES } from "../constant.js";

const LOGICAL_OPCODES: number[] = Object.keys(OPCODE_NAMES)
	.map(Number)
	.sort((a, b) => a - b);

class Seed {
	readonly hex: string;
	readonly bytes: Uint8Array;

	private constructor(hex: string, bytes: Uint8Array) {
		this.hex = hex;
		this.bytes = bytes;
	}

	static random(byteLength = 16): Seed {
		const bytes = new Uint8Array(byteLength);
		crypto.getRandomValues(bytes);
		return new Seed(Seed.bytesToHex(bytes), bytes);
	}

	static fromHex(hex: string): Seed {
		const clean = hex.replace(/^0x/i, "").replace(/\s+/g, "");
		if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
			throw new Error(`obfuscator: invalid seed hex: ${hex}`);
		}
		const bytes = new Uint8Array(clean.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
		}
		return new Seed(clean.toLowerCase(), bytes);
	}

	/** 逻辑 Opcode → 线上乱码 */
	opcodeMap(): Record<number, number> {
		const prng = this.prng(0x01);
		const pool = LOGICAL_OPCODES.slice();
		for (let i = pool.length - 1; i > 0; i--) {
			const j = prng() % (i + 1);
			[pool[i], pool[j]] = [pool[j]!, pool[i]!];
		}
		const map: Record<number, number> = {};
		for (let i = 0; i < LOGICAL_OPCODES.length; i++) {
			map[LOGICAL_OPCODES[i]!] = pool[i]!;
		}
		return map;
	}

	/** meta XOR key（1..255） */
	metaKey(): number {
		let key = this.prng(0x02)() & 0xff;
		return key === 0 ? 0x5a : key;
	}

	private prng(domain: number): () => number {
		const mixed = new Uint8Array(this.bytes.length + 1);
		mixed.set(this.bytes);
		mixed[this.bytes.length] = domain;
		let state = 0x9e3779b9;
		for (let i = 0; i < mixed.length; i++) {
			state = Math.imul(state ^ mixed[i]!, 0x85ebca6b) >>> 0;
			state = (state ^ (state >>> 13)) >>> 0;
		}
		if (state === 0) state = 1;
		return () => {
			state ^= state << 13;
			state >>>= 0;
			state ^= state >>> 17;
			state ^= state << 5;
			state >>>= 0;
			return state;
		};
	}

	private static bytesToHex(bytes: Uint8Array): string {
		return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	}
}

export { LOGICAL_OPCODES, Seed };
