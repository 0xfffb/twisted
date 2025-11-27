// encoder/src/compiler.js
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as types from '@babel/types'

class Compiler {
    constructor(code) {
        this.code = code
        this.bytecode = []
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
        }
        this.variables = new Map()
        this.varIndex = 0
    }

    compile() {
        const ast = parse(this.code, { sourceType: 'module' })

        const visitor = {
            NumericLiteral: (path) => {
                this.bytecode.push(this.opcodes.Push, path.node.value)
            },
            BinaryExpression: {
                exit: (path) => {
                    const operatorMap = {
                        '+': this.opcodes.Add,
                        '-': this.opcodes.Sub,
                        '*': this.opcodes.Mul,
                        '/': this.opcodes.Div,
                    }

                    const opcode = operatorMap[path.node.operator]
                    if (!opcode) {
                        throw new Error(`Unsupported operator: ${path.node.operator}`)
                    }
                    this.bytecode.push(opcode)
                }
            }
        }
        
        traverse.default(ast, visitor)
        console.log("🤖 compiled bytecode.")
        return this.bytecode
    }

}

export default Compiler