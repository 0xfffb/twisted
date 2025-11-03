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
            Test: 0x04,
            StringEncrypt: 0x05,
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
        console.log('🔧 编译节点:', node.type)
        switch (node.type) {
            case "VariableDeclaration":
                console.log('📋 变量声明:', node.declarations.length, '个声明')
                this.compileVar(node)
                break
            case "ExpressionStatement":
                console.log('💭 表达式语句')
                this.compileExpr(node.expression)
                break
            default:
                console.log('❓ 未知节点类型:', node.type)
        }
    }

    compileVar(node) {
        node.declarations.forEach((decl, index) => {
            console.log(`📝 声明 ${index}:`, decl.id.name, '=', decl.init?.type)
            if (decl.init) {
                this.compileExpr(decl.init)  // 编译表达式
                const varIndex = this.allocateVar(decl.id.name)
                console.log(`💾 存储到变量索引: ${varIndex}`)
                this.emit(0x15, varIndex)       // Store
            }
        })
    }

    compileExpr(expr) {
        console.log('🔍 编译表达式:', expr.type)
        switch (expr.type) {
            case 'BinaryExpression':
                console.log('➕ 二元表达式:', expr.operator)
                this.compileExpr(expr.left)   // 左操作数
                this.compileExpr(expr.right)  // 右操作数
                this.emitOp(expr.operator)    // 操作符
                break
            case 'Literal':
            case 'NumericLiteral':  // 添加这个！
                console.log('🔢 字面量:', expr.value, typeof expr.value)
                this.emit(0x00)               // Push
                this.emit(0x01)               // Int type
                this.emitInt(expr.value)      // 8字节数值
                break
            case 'Identifier':
                const index = this.variables.get(expr.name)
                console.log('🏷️ 标识符:', expr.name, '索引:', index)
                this.emit(0x14, index)        // Load
                break
            default:
                console.log('❓ 未知表达式类型:', expr.type)
        }
    }

    emitOp(op) {
        const ops = {
            '+': 0x02, '-': 0x03, '*': 0x04, '/': 0x05,
            '==': 0x06, '!=': 0x0B, '<': 0x07, '>': 0x08
        }
        const opcode = ops[op] || 0x02
        console.log(`⚡ 操作符 ${op} -> 0x${opcode.toString(16)}`)
        this.emit(opcode)
    }

    emit(op, arg) {
        console.log(`📤 发射: 0x${op.toString(16)}${arg !== undefined ? `, ${arg}` : ''}`)
        this.bytecode.push(op)
        if (arg !== undefined) this.bytecode.push(arg)
    }

    emitInt(value) {
        console.log(`🔢 发射整数: ${value}`)
        // 修复：确保是64位整数
        const int64 = BigInt(value)
        for (let i = 0; i < 8; i++) {
            const byte = Number((int64 >> BigInt(i * 8)) & 0xFFn)
            this.bytecode.push(byte)
            console.log(`  📦 字节 ${i}: 0x${byte.toString(16)}`)
        }
    }

    allocateVar(name) {
        if (!this.variables.has(name)) {
            this.variables.set(name, this.varIndex++)
            console.log(`🆕 分配变量 ${name} -> 索引 ${this.varIndex - 1}`)
        }
        return this.variables.get(name)
    }
}

export default Compiler