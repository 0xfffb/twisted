import { BytecodeLayout } from "../layout.js";
import { Pass } from "../obfuscator.js";
import type { Seed } from "../seed.js";
import type { WorkingBundle } from "../types.js";

class OpcodeRemapPass extends Pass {
	readonly name = "opcode-remap";
	readonly feature = "opcodeRemap" as const;

	obfuscate(bundle: WorkingBundle, seed: Seed): WorkingBundle {
		return {
			bytecode: BytecodeLayout.remap(bundle.bytecode, seed.opcodeMap()),
			meta: bundle.meta,
		};
	}
}

export { OpcodeRemapPass };
