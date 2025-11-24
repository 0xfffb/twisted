import Compiler from './compiler.js'

function main() {
    // const args = process.argv.slice(2)
    // const inputFile = args[0]
    const code = `
let a = 10 + 20
    `
    const compiler = new Compiler(code)
    const bytecode = compiler.compile()
    console.log(bytecode)
}

main()