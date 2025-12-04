import Compiler from './compiler/compiler.js'
import { OPCODE } from './constant.js'

!function main() {
    const code = `
let a = 10 + 20
console.log(a)
    `
    const compiler = new Compiler(code, OPCODE)
    const bytecode = compiler.compile()
    console.log(JSON.stringify(bytecode, null, 2))

    // const hexBytecode = bytecode.map(b => '0x' + b.toString(16).padStart(2, '0'))
    // console.log(hexBytecode) 
}()

