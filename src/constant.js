const opcode = {
    Push: 0x00,
    Pop: 0x01,
    Add: 0x02,
    Sub: 0x03,
    Mul: 0x04,
    Div: 0x05,
    Jmp: 0x06,
    JmpIf: 0x07,
    LocalStore: 0x08,
    LocalLoad: 0x09,
    GlobalStore: 0x0A,
    GlobalLoad: 0x0B,
    Call: 0x0C,
}

export { opcode }