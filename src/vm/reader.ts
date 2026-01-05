class BytecodeReader {

    private bytecode: number[];
    private pc: number;

    constructor(bytecode: number[]) {
        this.bytecode = bytecode;
        this.pc = 0;
    }

    public read(): number {
        if (this.pc >= this.bytecode.length) {
            throw new Error("🤖 Bytecode index out of bounds");
        }
        return this.bytecode[this.pc++]
    }

    public jump(position: number): void {
        if (position < 0 || position > this.bytecode.length) {
            throw new Error(`🤖 Invalid jump position: ${position}`);
        }
        this.pc = position;
    }

    public peek(): number {
        if (this.pc >= this.bytecode.length) {
            throw new Error(`🤖 Unexpected end of bytecode at PC: ${this.pc}`);
        }
        return this.bytecode[this.pc];
    }

    public hasNext(): boolean {
        return this.pc < this.bytecode.length;
    }
}

export default BytecodeReader;