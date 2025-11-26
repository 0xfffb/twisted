import Compiler from './compiler/compiler.js'

!function main() {
    const code = `
let a = 10 + 20
    `
    const compiler = new Compiler(code)
    const bytecode = compiler.compile()
    console.log(bytecode)
}()

