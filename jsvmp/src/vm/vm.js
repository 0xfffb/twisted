

class VM {

    constructor() {
        this.stack = [];
        this.opcodes = {
            Push: 0x00,
            Pop: 0x01,
            Add: 0x02,
            Sub: 0x03,
            Test: 0x04
        };
        this.pc = 0;
    }
    
    execute(code) {
        this.stack = [];
        this.pc = 0
        while (this.pc < code.length) {
            const opcode = code[this.pc]
            this.pc++
            switch (opcode) {
                case this.opcodes.Push:
                    this.stack.push(code[this.pc])
                    this.pc += 1
                    break
                case this.opcodes.Pop:
                    this.stack.pop()
                    break
                case this.opcodes.Add:
                    const a = this.stack.pop()
                    const b = this.stack.pop()
                    if (typeof a === 'number' && typeof b === 'number') {   
                        this.stack.push(a + b)
                    } else {
                        throw new Error('Invalid operands for Add')
                    }
                    break
            }
        }
        return this.stack[this.stack.length - 1]
    }
}

export default VM