import AbstractTransformer from './base.js'
import traverse from '@babel/traverse'
import * as t from '@babel/types'

class FLATransformer extends AbstractTransformer {
    constructor() {
        super()
    }

    transform(ast) {
        traverse.default(ast, {
            IfStatement(path) {
                path.node.test = t.binaryExpression('===', path.node.test, t.numericLiteral(123))
                path.node.consequent = t.blockStatement([
                    t.expressionStatement(t.callExpression(t.identifier('doSomething'), []))
                ])
                path.node.alternate = t.blockStatement([
                    t.expressionStatement(t.callExpression(t.identifier('doSomethingElse'), []))
                ])
            }
        })
        return ast
    }
}

export default FLATransformer