import { LabelType } from "../constant.js";

class LabelManager {
	private labels: Map<string, Label>;
	private counter: number;

	constructor() {
		this.labels = new Map();
		this.counter = 0;
	}

	public createLabel(type: LabelType, position: number) {
		const label = new Label(`LABEL_${type}_${this.counter}`,type, position);
		this.labels.set(label.name, label);
		this.counter++;
	}

}

class Label {

	public readonly name: string;
	public readonly type: LabelType;
	public readonly position: number;

	constructor(name: string, type: LabelType, position: number) {
		this.name = name;
		this.type = type;
		this.position = position;
	}

}
