/**
 * Hyperion IR→bytecode 加固。
 */
export { Obfuscator, Pass } from "./obfuscator.js";
export { MetaEncryptPass, OpcodeRemapPass } from "./passes/index.js";
export { Seed } from "./seed.js";
export { MetaCipher } from "./crypto.js";
export { BytecodeLayout } from "./layout.js";
export { RuntimeProtection } from "./runtime.js";
export type {
	EncryptedMeta,
	HardenedBundle,
	PlainBundle,
	Protection,
	ProtectionFeatures,
	WorkingBundle,
} from "./types.js";
