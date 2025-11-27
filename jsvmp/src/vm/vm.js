

class VM {

    constructor() {
        this.stack = []
        this.locals = []
        this.globals = []
        this.pc = 0
        this.opcodes = {
            Push: 0x00,
            Pop: 0x01,
            Add: 0x02,
            Sub: 0x03,
            Mul: 0x04,
            Div: 0x05,
            Jmp: 0x06,
            JmpIf: 0x07,
            LocalStore: 0x08,
            LocalLoad: 0x09,
            GlobalStore: 0x0A,
            GlobalLoad: 0x0B,
            Call: 0x0C,
        }
        this.functions = {
            0: (v) => console.log("console.log: ", v)
        }
    }
    
    execute(bytecode) {
        this.stack = []
        this.locals = []
        this.globals = []
        this.pc = 0
        while (this.pc < bytecode.length) {
            const opcode = bytecode[this.pc]
            this.pc++
            switch (opcode) {
                // stack commands
                case this.opcodes.Push:
                    this.stack.push(bytecode[this.pc])
                    this.pc += 1
                    break
                case this.opcodes.Pop:
                    this.stack.pop()
                    break
                
                // arithmetic commands
                case this.opcodes.Add:
                    const a = this.stack.pop()
                    const b = this.stack.pop()
                    if (typeof a === 'number' && typeof b === 'number') {   
                        this.stack.push(a + b)
                    } else {
                        throw new Error('Invalid operands for Add')
                    }
                    break
                case this.opcodes.Sub: {
                    const a = this.stack.pop()
                    const b = this.stack.pop()
                    if (typeof a === 'number' && typeof b === 'number') {   
                        this.stack.push(a - b)
                    } else {
                        throw new Error('Invalid operands for Sub')
                    }
                    break
                }   
                case this.opcodes.Mul: {
                    const a = this.stack.pop()
                    const b = this.stack.pop()
                    if (typeof a === 'number' && typeof b === 'number') {   
                        this.stack.push(a * b)
                    } else {
                        throw new Error('Invalid operands for Mul')
                    }
                    break
                }
                case this.opcodes.Div: {
                    const a = this.stack.pop()
                    const b = this.stack.pop()
                    if (typeof a === 'number' && typeof b === 'number') {   
                        this.stack.push(a / b)
                    } else {
                        throw new Error('Invalid operands for Div')
                    }
                    break
                }
                // control flow commands
                case this.opcodes.Jmp: {
                    const target = bytecode[this.pc]
                    this.pc = target
                    break
                }
                case this.opcodes.JmpIf: {
                    const condition = this.stack.pop()
                    const target = bytecode[this.pc]
                    if (condition) {
                        this.pc = target
                    } else {
                        this.pc += 1
                    }
                    break
                }
                // local commands
                case this.opcodes.LocalStore: {
                    const value = this.stack.pop()
                    const index = bytecode[this.pc]
                    this.locals[index] = value
                    this.pc += 1
                    break
                }
                case this.opcodes.LocalLoad: {
                    const index = bytecode[this.pc]
                    const value = this.locals[index]
                    this.stack.push(value)
                    this.pc += 1
                    break
                }
                
                // global commands
                case this.opcodes.GlobalStore: {
                    const value = this.stack.pop()
                    const index = bytecode[this.pc]
                    this.globals[index] = value
                    this.pc += 1
                    break
                }
                case this.opcodes.GlobalLoad: {
                    const index = bytecode[this.pc]
                    const value = this.globals[index]
                    this.stack.push(value)
                    this.pc += 1
                    break
                }
                case this.opcodes.Call: {
                    const functionIndex = bytecode[this.pc]
                    this.pc += 1
                    const args = this.stack.pop()
                    const func = this.functions[functionIndex]
                    if (!func) {
                        throw new Error(`Function not found: ${functionIndex}`)
                    }
                    const result = func(args)
                    if (result) {
                        this.stack.push(result)
                    }
                    break
                }
            }
        }
        return this.stack[this.stack.length - 1]
    }
}

export default VM