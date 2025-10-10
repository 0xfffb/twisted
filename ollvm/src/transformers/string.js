import Transformer from './base.js'
import traverse from '@babel/traverse'

class StringTransformer extends Transformer {
    constructor() {
        super()
    }

    transform(ast) {
        if (!ast || typeof ast !== 'object') {
            throw new Error('Invalid AST: expected object, got ' + typeof ast)
        }
        traverse.default(ast, {
            StringLiteral(path) {
                path.node.value = "Hello world."
            }
        })
        return ast
    }
}

export default StringTransformer