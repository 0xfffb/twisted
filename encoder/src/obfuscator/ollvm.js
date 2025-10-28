import AbstractObfuscator from './base.js'


class OLLVMObfuscator extends AbstractObfuscator {
    constructor(code, transformers) {
        super(code, transformers)
    }

    obfuscate() {
        this.transformers.forEach(transformer => {
            if (!this.ast || typeof this.ast !== 'object') {
                throw new Error('Invalid AST: expected object, got ' + typeof this.ast)
            }
            this.ast = transformer.transform(this.ast)
            console.log("✅ Transformer applied: " + transformer.constructor.name)
        })
    }
}

export default OLLVMObfuscator