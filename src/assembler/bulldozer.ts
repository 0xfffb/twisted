class Bulldozer {

	private marks: Map<number, number>;
	private patches: Map<number, number>;

	constructor() {
		this.marks = new Map();
		this.patches = new Map();
	}

	public mark(irIndex: number, bytecodeIndex: number) {
		this.marks.set(irIndex, bytecodeIndex);
	}


	public addPatch(bytecodeIndex: number, dynAddrIndex: number) {
		this.patches.set(bytecodeIndex, dynAddrIndex);
	}

	public backpatch(bytecode: number[]) {
		for (const [bytecodePos, targetIrIndex] of this.patches.entries()) {
			// 通过映射表找到目标 IR 索引对应的字节码位置
			const targetBytecodePos = this.marks.get(targetIrIndex);
			
			if (targetBytecodePos === undefined) {
				console.error(`❌ 回填失败:`);
				console.error(`  - 字节码位置: ${bytecodePos}`);
				console.error(`  - 目标 IR 索引: ${targetIrIndex}`);
				console.error(`  - marks Map 中的键:`, Array.from(this.marks.keys()));
				console.error(`  - marks Map 大小:`, this.marks.size);
				throw new Error(`Invalid IR index: ${targetIrIndex} (not found in marks map)`);
			}

			// 更新字节码：IR 索引 -> 字节码位置
			bytecode[bytecodePos] = targetBytecodePos;
			console.log(`🔧 字节码回填: 字节码[${bytecodePos}]: IR索引 ${targetIrIndex} -> 字节码位置 ${targetBytecodePos}`);
		}
	}
}

export { Bulldozer };