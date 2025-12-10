import { ArgKind, type Instruction } from "../compiler/instruction.js";

class Assembler {
	private bytecode: number[] = [];
	constructor() {
		this.bytecode = [];
    }

	assemble(ir: Instruction[]): number[] {
        ir.forEach(instruction => {
            this.push(instruction);
        });
		return this.bytecode;
	}

    private push(instruction: Instruction) {
        this.bytecode.push(instruction.opcode);
        instruction.args.forEach(arg => {
            switch (arg.kind) {
                case ArgKind.Number:
                    this.bytecode.push(arg.value);
                    break;
                case ArgKind.String:
                    this.bytecode.push(arg.value);
                    break;
                case ArgKind.Undefined:
                    throw new Error(`Undefined arg kind: ${arg.kind}`);
                default:
                    throw new Error(`Unknown arg kind: ${arg.kind}`);
            }
        });
    }

    private toByteArray(number: number): number[] {
        return number.toString(16).padStart(2, "0").split("").map(char => parseInt(char, 16));
    }
}

export default Assembler;