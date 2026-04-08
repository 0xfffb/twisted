import type { Instruction } from "../../instruction.js";
import { ArgKind } from "../../instruction.js";

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

	/**
	 * IR 插入/删除指令后，将跳转目标 >= fromIndex 的 DynAddr 平移 delta（重定位）。
	 */
	protected bumpDynAddr(ir: Instruction[], fromIndex: number, delta: number): void {
		for (const ins of ir) {
			for (const arg of ins.args) {
				if (
					arg.kind === ArgKind.DynAddr &&
					typeof arg.value === "number" &&
					arg.value >= fromIndex
				) {
					arg.value += delta;
				}
			}
		}
	}
}
