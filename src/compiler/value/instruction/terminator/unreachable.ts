import { Terminator } from "./terminator.js";

export class UnreachableTerminator extends Terminator {
	readonly kind = "Unreachable" as const;
	toString(): string {
		return "unreachable";
	}
}
