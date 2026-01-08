import { LabelType } from "../constant.js";

class LabelManager {
    private labels: Map<LabelType, number>;

    constructor() {
        this.labels = new Map();
    }

    public set label(label: LabelType) {
        this.labels.set(label, this.labels.size + 1);
    }

}