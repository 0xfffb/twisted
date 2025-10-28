import { parse } from '@babel/parser'
import { generate as _generate } from '@babel/generator'

class AbstractObfuscator {
    constructor(code, transformers) {
        this.code = code
        this.transformers = transformers
        this.ast = this.parse()
    }

    obfuscate() {
        throw new Error("Obfuscator must implement obfuscate method");
    }

    parse() {
        try {
            const ast = parse(this.code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            })
            return ast
        } catch (error) {
            console.error(`Error parsing code: ${error}`)
            process.exit(1)
        }
    }

    generate() {
        try {
            const result = _generate(this.ast, {})
            return result.code
        } catch (error) {
            console.error(`Error generating code: ${error}`)
            process.exit(1)
        }
    }
}

export default AbstractObfuscator