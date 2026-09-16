/**
 * 字节码加固器：按 Pass 顺序执行。
 */
import { Seed } from "./seed.js";
import type {
	HardenedBundle,
	PlainBundle,
	ProtectionFeatures,
	WorkingBundle,
} from "./types.js";

abstract class Pass {
	abstract readonly name: string;
	/** 该 Pass 对应的 protection.features 位 */
	abstract readonly feature: keyof ProtectionFeatures;
	abstract obfuscate(bundle: WorkingBundle, seed: Seed): WorkingBundle;
}

class Obfuscator {
	constructor(private readonly passes: Pass[]) {}

	obfuscate(bundle: PlainBundle, seedOrHex?: string | Seed): HardenedBundle {
		const seed =
			seedOrHex instanceof Seed
				? seedOrHex
				: seedOrHex
					? Seed.fromHex(seedOrHex)
					: Seed.random();

		let current: WorkingBundle = {
			bytecode: bundle.bytecode.slice(),
			meta: bundle.meta.slice(),
		};

		const features: ProtectionFeatures = {
			opcodeRemap: false,
			metaEncrypt: false,
		};

		for (const pass of this.passes) {
			if (features[pass.feature]) {
				throw new Error(`obfuscator: pass "${pass.name}" already applied`);
			}
			current = pass.obfuscate(current, seed);
			features[pass.feature] = true;
		}

		return {
			bytecode: current.bytecode,
			meta: current.meta,
			protection: { version: 1, seed: seed.hex, features },
		};
	}
}

export { Obfuscator, Pass };
