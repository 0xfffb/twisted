function sum(a, b) {
    return a + b
}

function test() {
    return "test1"
}

!function main() {
    const randomInt = Math.floor(Math.random() * 10)
    if (randomInt === 5) {
        console.log("randomInt is 5")
    } else {
        console.log("randomInt is not 5")
    }
    const a = sum(1, 2)
    const b = test()
    console.log(a)
    console.log(b)
}()