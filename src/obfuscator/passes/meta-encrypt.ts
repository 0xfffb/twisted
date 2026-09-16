import { MetaCipher } from "../crypto.js";
import { Pass } from "../obfuscator.js";
import type { Seed } from "../seed.js";
import type { WorkingBundle } from "../types.js";

class MetaEncryptPass extends Pass {
	readonly name = "meta-encrypt";
	readonly feature = "metaEncrypt" as const;

	obfuscate(bundle: WorkingBundle, seed: Seed): WorkingBundle {
		if (bundle.meta.length > 0 && typeof bundle.meta[0] !== "string") {
			throw new Error("MetaEncryptPass: meta already encrypted");
		}
		return {
			bytecode: bundle.bytecode,
			meta: new MetaCipher(seed).encryptAll(bundle.meta as string[]),
		};
	}
}

export { MetaEncryptPass };
