import { LabelType } from "../constant.js";
import { ArgKind, Instruction } from "../instruction.js";

class Bulldozer {
	private labels: Map<number, Label>;
	private counter: number;

	constructor() {
		this.labels = new Map();
		this.counter = 0;
	}

	public label(type: LabelType): number {
		const id = this.counter;
		this.labels.set(id, new Label(id, type, undefined));
		this.counter++;
		return id;
	}

	public record(id: number, position: number) {
		const label = this.labels.get(id);
		if (!label) {
			throw new Error(`Label ${id} not found`);
		}
		label.position = position;
	}

	public backpatch(ir: Instruction[]) {
		for (let i = 0; i < ir.length; i++) {
			const instruction = ir[i];

			for (const arg of instruction.args) {
				if (arg.kind === ArgKind.DynAddr && arg.value !== undefined) {
					const label = this.labels.get(arg.value);
					if (!label) {
						throw new Error(`Label ${arg.value} not found`);
					}
					if (label.position === undefined) {
						throw new Error(`Label ${arg.value} position not recorded`);
					}

					arg.value = label.position;
					console.log(
						`🤖 Backpatch: instruction[${i}] labelId ${arg.value} -> position ${label.position}`,
					);
				}
			}
		}
	}
}

class Label {
	public id: number;
	public type: LabelType;
	public position: number | undefined;

	constructor(id: number, type: LabelType, position: number | undefined) {
		this.id = id;
		this.type = type;
		this.position = position;
	}
}

export { Bulldozer, Label };
