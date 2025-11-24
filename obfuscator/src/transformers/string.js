import AbstractTransformer from './base.js'
import traverse from '@babel/traverse'

class StringTransformer extends AbstractTransformer {
    constructor() {
        super()
    }

    transform(ast) {
        traverse.default(ast, {
            StringLiteral(path) {
                path.node.value = "Hello world."
            }
        })
        return ast
    }
}

export default StringTransformer