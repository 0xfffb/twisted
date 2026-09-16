/**
 * Hyperion 字节码加固类型。
 */

type EncryptedMeta = number[][];

interface PlainBundle {
	bytecode: number[];
	meta: string[];
}

interface ProtectionFeatures {
	opcodeRemap: boolean;
	metaEncrypt: boolean;
}

/** 只落盘 seed + 特性；派生材料两端用 Seed 重算 */
interface Protection {
	version: 1;
	seed: string;
	features: ProtectionFeatures;
}

interface HardenedBundle {
	bytecode: number[];
	meta: string[] | EncryptedMeta;
	protection: Protection;
}

/** Pass 工作态 */
interface WorkingBundle {
	bytecode: number[];
	meta: string[] | EncryptedMeta;
}

export type {
	EncryptedMeta,
	HardenedBundle,
	PlainBundle,
	Protection,
	ProtectionFeatures,
	WorkingBundle,
};
