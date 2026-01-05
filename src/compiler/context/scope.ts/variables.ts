class Variables {
    private variables: Map<string, number>;
    private counter: number;

    constructor() {
        this.variables = new Map();
        this.counter = 0;
    }

    public declare(name: string): void {
        this.variables.set(name, this.counter);
        this.counter++;
    }
    
    public resolve(name: string): number {
        const index = this.variables.get(name);
        if (index === undefined) {
            throw new Error(`Variable name not found for name: ${name}`);
        }
        return index as number;
    }
}

export default Variables;