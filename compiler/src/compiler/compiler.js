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
            Call: 0x0C,
        }
        this.variables = new Map()
        this.varIndex = 0
    }

    compile() {
        const ast = parse(this.code, { sourceType: 'module' })

        const visitor = {
            CallExpression: {
                exit: (path) => {
                    const callee = path.node.callee
                    if (
                        types.isMemberExpression(callee) &&
                        types.isIdentifier(callee.object, { name: 'console' }) &&
                        types.isIdentifier(callee.property, { name: 'log' })
                      ) {
                        this.bytecode.push(this.opcodes.Call, 0)
                      }
                }
            },
            Identifier: {
                enter: (path) => {
                    if (!path.isReferencedIdentifier()) return

                    const varName = path.node.name
                    if (this.variables.has(varName)) {
                        const index = this.variables.get(varName)
                        this.bytecode.push(this.opcodes.LocalLoad, index)
                    }
                }
            },
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
            },
            VariableDeclaration: {
                exit: (path) => {
                    const varName = path.node.declarations[0].id.name
                    if (this.variables.has(varName)) {
                        const index = this.variables.get(varName)
                        this.bytecode.push(this.opcodes.LocalStore, index)
                    } else {
                        const index = this.varIndex++
                        this.variables.set(varName, index)
                        this.bytecode.push(this.opcodes.LocalStore, index)
                    }
                }
            }
        }
        
        traverse.default(ast, visitor)
        console.log("🤖 compiled bytecode.")
        return this.bytecode
    }

}

export default Compiler