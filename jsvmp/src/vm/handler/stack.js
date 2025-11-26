class StackHandler {
    constructor() {
        this.stack = []
    }

    push(value) {
        this.stack.push(value)
    }

    pop() {
        return this.stack.pop()
    }
}