// encoder/src/compiler.js
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'

class Compiler {
    constructor(source, opcode) {
        this.ast = this.parse(source)
        this.opcode = opcode
    }

    parse(source) {
        const ast = parse(source, { sourceType: 'module' })
        return ast
    }

    compile() {
        traverse.default(this.ast, this.visitor())
        console.log("🤖 Compiled intermediate representation.")
        return this.bytecode
    }

    visitor() {
        const visitor = {
            VariableDeclaration: {
                enter: (path) => {
                    console.log(path.node.type)
                }
                
            },
            Identifier: {
                enter: (path) => {
                    console.log(path.node.name)
                }
            },
        }
        return visitor
    }
}

export default Compiler