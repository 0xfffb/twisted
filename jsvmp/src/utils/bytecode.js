

function toDecimalBytecode(code) {
    return code.map(c => parseInt(c, 16))
}

function toHexBytecode(code) {
    return code.map(c => '0x' + c.toString(16).padStart(2, '0'))
}

export { toDecimalBytecode, toHexBytecode }