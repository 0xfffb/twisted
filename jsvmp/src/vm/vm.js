import opcodes from './opcode.js'

class VM {

    constructor() {
        this.stack = []
        this.locals = []
        this.globals = []
        this.pc = 0
        this.opcodes = opcodes
    }
    
    execute(code) {
        this.stack = []
        this.locals = []
        this.globals = []
        this.pc = 0
        while (this.pc < code.length) {
            const opcode = code[this.pc]
            this.pc++
            switch (opcode) {
                // stack commands
                case this.opcodes.Push:
                    this.stack.push(code[this.pc])
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
                    const target = code[this.pc]
                    this.pc = target
                    break
                }
                case this.opcodes.JmpIf: {
                    const condition = this.stack.pop()
                    const target = code[this.pc]
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
                    const index = code[this.pc]
                    this.locals[index] = value
                    this.pc += 1
                    break
                }
                case this.opcodes.LocalLoad: {
                    const index = code[this.pc]
                    const value = this.locals[index]
                    this.stack.push(value)
                    this.pc += 1
                    break
                }
                
                // global commands
                case this.opcodes.GlobalStore: {
                    const value = this.stack.pop()
                    const index = code[this.pc]
                    this.globals[index] = value
                    this.pc += 1
                    break
                }
                case this.opcodes.GlobalLoad: {
                    const index = code[this.pc]
                    const value = this.globals[index]
                    this.stack.push(value)
                    this.pc += 1
                    break
                }
            }
        }
        return this.stack[this.stack.length - 1]
    }
}

export default VM