import { ArgKind, type Instruction } from "../instruction.js";
import { Bulldozer } from "./bulldozer.js";

class Assembler {
	private bytecode: number[];
	private bulldozer: Bulldozer;

	constructor() {
		this.bytecode = [];
		this.bulldozer = new Bulldozer();
	}

	assemble(ir: Instruction[]): number[] {
		ir.forEach((instruction, index) => {
			this.bulldozer.mark(index, this.bytecode.length);
			this.push(instruction);
		});
		this.bulldozer.backpatch(this.bytecode, ir);
		return this.bytecode;
	}

	private push(instruction: Instruction) {
		this.bytecode.push(instruction.opcode);
		instruction.args.forEach((arg) => {
			switch (arg.kind) {
				case ArgKind.Number:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.String:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.Undefined:
					throw new Error(`Undefined arg kind: ${arg.kind}`);
				case ArgKind.Dependency:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.Property:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.Parameter:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.Variable:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.DynAddr:
					this.bytecode.push(arg.value);
					break;
				default:
					throw new Error(`Unknown arg kind: ${arg.kind}`);
			}
		});
	}
}

export default Assembler;
