import { Constant } from "./constant.js";
import { BasicBlock } from "../block.js";
import { ArgValue } from "../argument.js";

class IrFunction extends Constant {
	readonly kind = "Function" as const;
	readonly params: ArgValue[];
	readonly blocks: BasicBlock[];
	private nextBlockId: number = 0;
	private nextReg: number = 0;

	constructor(
		public readonly name: string,
		paramNames: string[],
	) {
		super();
		this.params = paramNames.map((n, i) => new ArgValue(i, n));
		this.blocks = [];
		this.createBlock("entry");
	}

	toString(): string {
		return `@${this.name}`;
	}

	allocReg(): number {
		return this.nextReg++;
	}

	createBlock(name?: string): BasicBlock {
		const id = this.nextBlockId++;
		const block = new BasicBlock(id, name ?? `block_${id}`);
		this.blocks.push(block);
		return block;
	}

	get entry(): BasicBlock {
		return this.blocks[0];
	}

	getBlock(id: number): BasicBlock | undefined {
		return this.blocks.find((b) => b.id === id);
	}

	dump(): string {
		const paramStr = this.params.map((p) => `${p}`).join(", ");
		const lines: string[] = [`define @${this.name}(${paramStr}) {`];
		for (const block of this.blocks) {
			lines.push(`  ${block.name}:`);
			for (const instr of block.instructions) {
				lines.push(`    ${instr.dump()}`);
			}
			if (block.terminator) {
				lines.push(`    ${block.terminator}`);
			}
		}
		lines.push("}");
		return lines.join("\n");
	}
}

export { IrFunction };
