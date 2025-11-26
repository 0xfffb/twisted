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

        traverse.default(ast, {
            Program: (path) => {
                path.node.body.forEach((node, index) => {
                    console.log(`📝 节点 ${index}:`, node.type)
                    this.compileNode(node)
                })
            }
        })
        
        console.log('🎯 最终字节码 (十进制):', this.bytecode)
        
        // 添加十六进制输出
        const hexBytes = this.bytecode.map(b => '0x' + b.toString(16).padStart(2, '0'))
        console.log('🎯 最终字节码 (十六进制):', hexBytes)
        console.log('🎯 十六进制字符串:', hexBytes.join(' '))
        
        return hexBytes
    }

    compileNode(node) {
        switch (node.type) {
            case "VariableDeclaration":
                this.compileVariableDeclaration(node)
                break
            default:
                throw new Error(`Unsupported node type: ${node.type}`)
        }
    }

    compileVariableDeclaration(node) {
        console.log('🔍 编译变量声明:', node)
        if (node.declarations) {
            node.declarations.forEach(declarator => {
                this.compileVariableDeclaration(declarator.id)
            })
        } else {
            
        }
    }

}

export default Compiler