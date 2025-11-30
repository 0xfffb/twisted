// encoder/src/compiler.js
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as types from '@babel/types'
import { OPCODE } from '../constant.js'

class Compiler {
    constructor(source) {
        this.ast = this.parse(source)
        this.ir = []
        this.bytecode = []
        this.opcode = OPCODE
        this.variables = new Map()
        this.varIndex = 0
        this.functions = {
            'console.log': 0,
        }
    }

    parse(source) {
        const ast = parse(source, { sourceType: 'module' })
        return ast
    }

    compile() {
        
        traverse.default(ast, visitor)
        console.log("🤖 Compiled intermediate representation.")
        return this.bytecode
    }

}

export default Compiler