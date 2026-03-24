import Scope from "./scope.ts/scope.js";

class Context {
	private scopes: Scope[];

	constructor() {
		this.scopes = [];
		this.scopes.push(new Scope());
	}

	public enter() {
		const scope = new Scope();
		this.scopes.push(scope);
	}

	public exit() {
		if (this.scopes.length <= 1) {
			throw new Error("🤖 Cannot exit global scope");
		}
		this.scopes.pop();
	}

	public get scope(): Scope {
		return this.scopes[this.scopes.length - 1];
	}
}

export default Context;
