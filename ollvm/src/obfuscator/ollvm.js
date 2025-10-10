import Obfuscator from './base.js'


class OLLVMObfuscator extends Obfuscator {
    constructor(code, transformers) {
        super(code, transformers)
    }

    obfuscate() {
        this.transformers.forEach(transformer => {
            this.ast = transformer.transform(this.ast)
        })
    }
}

export default OLLVMObfuscator