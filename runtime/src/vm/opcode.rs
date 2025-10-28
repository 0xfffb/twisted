#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Int(i64),
    String(String),
    Null,
}

#[derive(Debug, Clone, PartialEq)]
#[repr(u8)]
pub enum ValueType {
    Int = 0x01,
    String = 0x02,
    Null = 0x03,
}

impl From<ValueType> for u8 {
    fn from(value: ValueType) -> Self {
        value as u8
    }
}

impl From<u8> for ValueType {
    fn from(value: u8) -> Self {
        match value {
            0x01 => ValueType::Int,
            0x02 => ValueType::String,
            0x03 => ValueType::Null,
            _ => panic!("Invalid value type: {value}"),
        }
    }
}


#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
#[repr(u8)]
pub enum OpCode {
    // 常量指令
    Push = 0x00,
    Pop = 0x01,
    // 算术指令
    Add = 0x02,
    Sub = 0x03,

    // test
    Test = 0x04,
}

impl From<u8> for OpCode {
    fn from(value: u8) -> Self {
        match value {
            0x00 => OpCode::Push,
            0x01 => OpCode::Pop,
            0x02 => OpCode::Add,
            0x03 => OpCode::Sub,
            0x04 => OpCode::Test,
            _ => panic!("Invalid opcode: {value}"),
        }
    }
}

impl From<OpCode> for u8 {
    fn from(value: OpCode) -> Self {
        value as u8
    }
}
