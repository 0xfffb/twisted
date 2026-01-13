import { ArgKind, Instruction } from "../instruction.js";

class Bulldozer {
	private marks: Map<number, number>;

	constructor() {
		this.marks = new Map();
	}

	public mark(irIndex: number, bytecodeIndex: number) {
		this.marks.set(irIndex, bytecodeIndex);
	}

	public backpatch(bytecode: number[], ir: Instruction[]) {
		ir.forEach((instruction, index) => {
			let bytecodeIndex = this.marks.get(index);
			if (bytecodeIndex === undefined) {
				throw new Error(`Bytecode index not found for IR index: ${index}`);
			}
			instruction.args.forEach((arg, argIndex) => {
				if (arg.kind === ArgKind.DynAddr && arg.value !== undefined) {
					// bytecode index plus arg index plus 1 for opcode
					const position = bytecodeIndex + argIndex + 1;
					const targetBytecodeIndex = this.marks.get(arg.value);
					if (targetBytecodeIndex === undefined) {
						throw new Error(
							`Bytecode index not found for IR index: ${arg.value} at index: ${index}`,
						);
					}
					// backpatch dyn addr
					bytecode[position] = targetBytecodeIndex;
					console.log(
						`Backpatch: bytecode[${position}]: IR[${arg.value}] -> bytecode[${targetBytecodeIndex}]`,
					);
				}
			});
		});
	}
}

export { Bulldozer };
