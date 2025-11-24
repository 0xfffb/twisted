

class AbstractTransformer {
    constructor() {
    }

    transform(ast) {
        throw new Error("Transformer must implement transform method");
    }
}

export default AbstractTransformer