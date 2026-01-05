import Variables from "./variables.js";

class Scope {

    private variables: Variables

    constructor() {
        this.variables = new Variables();
    }

    public declare(name: string): void {
        this.variables.declare(name);
    }

    public resolve(name: string): number {
        return this.variables.resolve(name);
    }
}

export default Scope;
