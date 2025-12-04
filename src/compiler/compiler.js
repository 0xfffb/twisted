// encoder/src/compiler.js
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'

class Compiler {
    constructor(source, opcode) {
        this.ast = this.parse(source)
        this.opcode = opcode
        this.ir = []
        this.variables = new Map()
        this.variableIndex = 0
        this.dependencies = ['console']
    }

    parse(source) {
        const ast = parse(source, { sourceType: 'module' })
        return ast
    }

    compile() {
        traverse.default(this.ast, this.visitor())
        console.log("🤖 Compiled intermediate representation.")
        return this.ir
    }

    visitor() {
        const visitor = {
            VariableDeclaration: {
                enter: (path) => {
                    console.log(`🤖 VariableDeclaration: ${path.node.type}`)
                }
                
            },
            BinaryExpression: {
                exit: (path) => {
                    const operatorMap = {
                        '+': this.opcode.Add,
                        '-': this.opcode.Sub,
                        '*': this.opcode.Mul,
                        '/': this.opcode.Div,
                    }
                    this.ir.push({
                        opcode: operatorMap[path.node.operator],
                    })
                }
            },
            NumericLiteral: {
                exit: (path) => {
                    this.ir.push({
                        opcode: this.opcode.Push,
                        args: [{ type: 0, value: path.node.value }]
                    })
                }
            },
            Identifier: {
                exit: (path) => {
                    if (this.dependencies.includes(path.node.name)) {
                        console.log(`🤖 Dependency found: ${path.node.name}`)
                        return
                    }
                    if (path.parent.type === 'MemberExpression' && path.parent.property === path.node && !path.parent.computed) {
                        console.log(`🤖 String for dependency found: ${path.node.name}`)
                        return
                    }
                    this.ir.push({
                        opcode: this.opcode.Push,
                        args: [{ type: 0, value: path.node.name }]
                    })
                }
            },
        }
        return visitor
    }
}

export default Compiler