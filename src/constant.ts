const enum Opcode {
	Push = 0x00,
	Pop = 0x01,
	Add = 0x02,
	Sub = 0x03,
	Mul = 0x04,
	Div = 0x05,
	Equal = 0x06,
	Jmp = 0x07,
	JmpIf = 0x08,
	Store = 0x09,
	Load = 0x0a,
	Call = 0x0b,
	Dependency = 0x0c,
	Property = 0x0d,
	PushFrame = 0x0e,
	PopFrame = 0x0f,
	Halt = 0x10,
}

const enum LabelType {
	IF_THEN = "IF_THEN",
	IF_END = "IF_END",
	FUNCTION_START = "FUNCTION_START",
	FUNCTION_END = "FUNCTION_END",
}

export { Opcode, LabelType };
