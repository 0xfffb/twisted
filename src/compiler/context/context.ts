import Scope from "./scope.ts/scope.js";

class Context {
    private scopes: Scope[]
    public scope: Scope

    constructor() {
        this.scopes = [];
        this.scope = new Scope();
        this.scopes.push(this.scope);
    }

    public enter() {
        const scope = new Scope();
        this.scopes.push(scope);
        this.scope = scope;
    }

    public exit() {
        if (this.scopes.length <= 1) {
            throw new Error("🤖 Cannot exit global scope");
        }
        this.scopes.pop();
        this.scope = this.scopes[this.scopes.length - 1];
    }
}

export default Context;