import { ArgKind, type Instruction } from "../instruction.js";
import { Opcode } from "../constant.js";
import { Bulldozer } from "./bulldozer.js";
import { BaseAssembler } from "./base.js";

interface AssemblerBundle {
	bytecode: number[];
	meta: string[];
}


class LinearAssembler extends BaseAssembler {
	protected constPoolMap: Map<string, number>;
	private bulldozer: Bulldozer;

	constructor() {
        super();
		this.constPoolMap = new Map();
		this.bulldozer = new Bulldozer();
	}

	assemble(ir: Instruction[]): AssemblerBundle {
		ir.forEach((instruction, index) => {
			this.bulldozer.mark(index, this.bytecode.length);
			this.push(instruction);
		});
		this.bulldozer.backpatch(this.bytecode, ir);
		return {
			bytecode: this.bytecode,
			meta: this.meta,
		};
	}

	protected push(instruction: Instruction): void {
		let opcode = instruction.opcode;
		if (instruction.opcode === Opcode.Push && instruction.args.length === 1) {
			const [arg] = instruction.args;
			if (arg.kind === ArgKind.String) {
				opcode = Opcode.LoadMeta;
			}
		}

		this.bytecode.push(opcode);
		instruction.args.forEach((arg) => {
			switch (arg.kind) {
				case ArgKind.Number:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.String:
					this.bytecode.push(this.getMetaIndex(arg.value));
					break;
				case ArgKind.Undefined:
					throw new Error(`Undefined arg kind: ${arg.kind}`);
				case ArgKind.Dependency:
					this.bytecode.push(arg.value);
					break;
				case ArgKind.Property:
					this.bytecode.push(this.getMetaIndex(arg.value));
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

	protected getMetaIndex(value: string): number {
		const index = this.constPoolMap.get(value);
		if (index !== undefined) {
			return index;
		}
		const nextIndex = this.meta.length;
		this.meta.push(value);
		this.constPoolMap.set(value, nextIndex);
		return nextIndex;
	}
}

export { LinearAssembler, type AssemblerBundle };
