import type { Value } from "../value.js";
import { Instruction } from "./instruction.js";

export class MakeClosureInstruction extends Instruction {
	readonly kind = "MakeClosure" as const;
	constructor(id: number, public readonly fn: Value, public readonly captures: Value[]) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = make_closure ${this.fn}, [${this.captures.join(", ")}]`;
	}
}

export class LoadCaptureInstruction extends Instruction {
	readonly kind = "LoadCapture" as const;
	constructor(id: number, public readonly index: number) {
		super(id);
	}
	dump(): string {
		return `%${this.id} = load_capture ${this.index}`;
	}
}
