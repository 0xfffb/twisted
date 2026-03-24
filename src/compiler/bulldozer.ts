import { LabelType } from "../constant.js";
import { ArgKind, Instruction } from "../instruction.js";

class Bulldozer {
	private labels: Map<number, Label>;
	private counter: number;

	constructor() {
		this.labels = new Map();
		this.counter = 0;
	}

	public label(name: string | undefined, type: LabelType): Label {
		if (name === undefined) {
			name = `L_${this.counter}`;
		}
		const label = new Label(this.counter, name, type, undefined);
		this.labels.set(this.counter, label);
		this.counter++;
		return label;
	}

	public record(id: number, position: number) {
		const label = this.labels.get(id);
		if (!label) {
			throw new Error(`Label ${id} not found`);
		}
		label.position = position;
	}

	public hasLabelById(id: number): boolean {
		return this.labels.has(id);
	}

	public getLabelById(id: number): Label {
		const label = this.labels.get(id);
		if (!label) {
			throw new Error(`Label ${id} not found`);
		}
		return label;
	}

	public hasLabelByName(name: string): boolean {
		return this.labels.values().some((label) => label.name === name);
	}

	public getLabelByName(name: string): Label {
		const label = this.labels.values().find((label) => label.name === name);
		if (!label) {
			throw new Error(`Label ${name} not found`);
		}
		return label;
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
	public name: string | undefined;
	public type: LabelType;
	public position: number | undefined;

	constructor(
		id: number,
		name: string | undefined,
		type: LabelType,
		position: number | undefined,
	) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.position = position;
	}
}

export { Bulldozer, Label };
