class Scope {

    private variables: Map<string, number>
    private counter: number

    constructor() {
        this.variables = new Map();
        this.counter = 0;
    }
 
    public declare(name: string) {
        this.variables.set(name, this.counter);
        this.counter++;
    }
    
    public resolve(name: string) {
        const index = this.variables.get(name);
        if (index === undefined) {
            return null;
        }
        return index;
    }
}

export { Scope };
