import { LabelType } from "../constant.js";

class LabelManager {
	private labels: Map<string, Label>;

	constructor() {
		this.labels = new Map();
	}

	public set label(label: Label) {
		this.labels.set(label.name, label);
	}

}

class Label {

	public readonly name: string;
	public readonly type: LabelType;

	constructor(name: string, type: LabelType) {
		this.name = name;
		this.type = type;
	}

}
