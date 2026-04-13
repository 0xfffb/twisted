export abstract class Value {
	abstract readonly kind: string;
	abstract toString(): string;
}
