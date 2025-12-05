function decimalToBytecode(code) {
	return code.map((c) => parseInt(c, 16));
}

function hexToBytecode(code) {
	return code.map((c) => "0x" + c.toString(16).padStart(2, "0"));
}

export { decimalToBytecode, hexToBytecode };
