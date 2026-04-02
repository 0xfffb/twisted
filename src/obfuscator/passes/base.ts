import type { Instruction } from "../../instruction.js";

export interface IrPass {
	readonly name: string;
	transform(ir: Instruction[]): Instruction[];
}

export abstract class BaseIrPass implements IrPass {
	abstract readonly name: string;
	abstract transform(ir: Instruction[]): Instruction[];

	protected cloneIr(ir: Instruction[]): Instruction[] {
		return structuredClone(ir) as Instruction[];
	}
}
