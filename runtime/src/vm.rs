use crate::vm::opcode::{OpCode, Value, ValueType};

mod opcode;

#[derive(Debug, Clone)]
pub struct Vm {
    stack: Vec<Value>,
    pc: usize,
}

impl Vm {
    pub fn new() -> Self {
        Self {
            stack: Vec::new(),
            pc: 0,
        }
    }

    pub fn run(&mut self, program: &[u8]) -> Option<Value> {
        while self.pc < program.len() {
            let op = program[self.pc].into();
            match op {
                OpCode::Push => {
                    self.pc += 1;
                    let value_type = program[self.pc].into();
                    self.pc += 1;
                    match value_type {
                        ValueType::Int => {
                            if self.pc + 8 > program.len() {
                                return None;
                            }
                            let value = i64::from_le_bytes(program[self.pc..self.pc + 8].try_into().unwrap());
                            self.stack.push(Value::Int(value));
                            self.pc += 8;
                        }
                        ValueType::String => {
                            if self.pc + 8 > program.len() {
                                return None;
                            }
                            let value = String::from_utf8(program[self.pc..self.pc + 8].to_vec()).unwrap();
                            self.stack.push(Value::String(value));
                            self.pc += 8;
                        }
                        ValueType::Null => {
                            self.stack.push(Value::Null);
                            self.pc += 1;
                        }
                    };
                }
                OpCode::Pop => {
                    let _ = self.stack.pop().unwrap();
                    self.pc += 1;
                }
                OpCode::Add => {
                    let Some(Value::Int(value1)) = self.stack.pop() else {
                        return None;
                    };
                    let Some(Value::Int(value2)) = self.stack.pop() else {
                        return None;
                    };
                    self.stack.push(Value::Int(value1 + value2));
                    self.pc += 1;
                }
                OpCode::Sub => {
                    let Some(Value::Int(value1)) = self.stack.pop() else {
                        return None;
                    };
                    let Some(Value::Int(value2)) = self.stack.pop() else {
                        return None;
                    };
                    self.stack.push(Value::Int(value1 - value2));
                    self.pc += 1;
                }
                OpCode::Test => {
                    self.stack.push(Value::String("Hello, world!".to_string()));
                    self.pc += 1;
                }
            }
        }
        self.stack.last().cloned()
    }
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_vm() {
        let mut vm = Vm::new();
        let program = [
            OpCode::Push.into(),
            OpCode::Push.into(),
            OpCode::Add.into(),
        ];
        let stack = vm.run(&program);
        assert_eq!(stack, Some(Value::Int(3)));
    }

    #[test]
    fn test_vm_push_int() {
        let mut vm = Vm::new();
        let program = [
            OpCode::Push.into(),
            ValueType::Int.into(),
            0x7B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ];
        let stack = vm.run(&program);
        println!("stack: {:?}", stack);
        assert_eq!(stack, Some(Value::Int(123)));
    }
}
