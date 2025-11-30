// encoder/src/compiler.js
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as types from '@babel/types'
import { opcode } from '../constant.js'

class Compiler {
    constructor(source) {
        this.ast = this.parse(source)
        this.ir = []
        this.bytecode = []
        this.opcode = opcode
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

        const visitor = {
            CallExpression: {
                exit: (path) => {
                    const callee = path.node.callee
                    if (
                        types.isMemberExpression(callee) &&
                        types.isIdentifier(callee.object, { name: 'console' }) &&
                        types.isIdentifier(callee.property, { name: 'log' })
                      ) {
                        this.bytecode.push(this.opcode.Call, this.functions['console.log'])
                      }
                }
            },
            MemberExpression: {
                exit: (path) => {
                    // 当我们退出 MemberExpression 节点时，
                    // `console` 对象应该已经被 Identifier 访问器处理并加载到栈上了。
                    
                    // 在这里，我们需要生成获取属性的字节码。
                    // 假设我们有一个新的操作码叫做 GetProperty
                    
                    // 注意：这里的 property 可能不是一个简单的标识符，
                    // 比如 a[b]，所以需要更复杂的处理。
                    // 但对于 console.log，我们可以简化。
                    if (types.isIdentifier(path.node.property)) {
                        const propName = path.node.property.name
                        // 你需要一种方式将属性名 "log" 传递给虚拟机。
                        // 这通常通过一个常量池（constants pool）来完成。
                        // 比如：this.bytecode.push(this.opcodes.GetProperty, this.addConstant(propName))
                        console.log(`📝 准备获取属性: ${propName}`)
                    }
                }
            },
            Identifier: {
                enter: (path) => {
                    if (!path.isReferencedIdentifier()) return

                    const varName = path.node.name
                    if (this.variables.has(varName)) {
                        const index = this.variables.get(varName)
                        this.bytecode.push(this.opcode.LocalLoad, index)
                    }
                }
            },
            NumericLiteral: (path) => {
                this.bytecode.push(this.opcode.Push, path.node.value)
            },
            BinaryExpression: {
                exit: (path) => {
                    const operatorMap = {
                        '+': this.opcode.Add,
                        '-': this.opcode.Sub,
                        '*': this.opcode.Mul,
                        '/': this.opcode.Div,
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
                        this.bytecode.push(this.opcode.LocalStore, index)
                    } else {
                        const index = this.varIndex++
                        this.variables.set(varName, index)
                        this.bytecode.push(this.opcode.LocalStore, index)
                    }
                }
            }
        }
        
        traverse.default(ast, visitor)
        console.log("🤖 Compiled intermediate representation.")
        return this.bytecode
    }

}

export default Compiler