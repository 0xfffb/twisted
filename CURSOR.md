# Cursor IDE 配置文档

本文档为 Cursor IDE 提供项目特定的开发规则和提示。

## 项目概述

Twisted 是一个反爬虫虚拟机系统，包含三个核心模块：
- **Encoder**: JavaScript到字节码编译器
- **Runtime**: Rust栈式虚拟机
- **OLLVM**: JavaScript代码混淆器

## 开发规则

### JavaScript 代码规范 (Encoder/OLLVM)

1. **模块系统**: 使用 ES6+ 模块 (`import`/`export`)
2. **AST处理**: 使用 `@babel/types` 进行类型检查
3. **命名规范**:
   - 类名: PascalCase (`Compiler`)
   - 方法名: camelCase (`compileExpr`)
   - 常量: UPPER_SNAKE_CASE (`MAX_STACK_SIZE`)

4. **编译器开发**:
   - 使用递归下降遍历AST
   - 支持作用域管理（全局/局部变量）
   - 节点类型检查使用字符串比较: `node.type === "TypeName"`
   - 字节码生成格式: `[Opcode] [Type] [Value...]`

### Rust 代码规范 (Runtime)

1. **枚举定义**: 使用 `#[repr(u8)]` 支持字节转换
2. **错误处理**: 使用 `Option<Value>` 或 `Result` 类型
3. **操作码**: 定义为 `u8` 类型
4. **模块组织**: 操作码定义在 `vm/opcode.rs`，实现 logic 在 `vm.rs`

### 调试和日志

使用emoji前缀区分日志类型:
- 🔍 查找/搜索操作
- 📝 节点处理
- 🔧 编译操作
- ⚡ 指令生成
- 🎯 最终结果
- ❌ 错误信息

## 代码生成提示

### 添加新操作码

当需要添加新的VM操作码时：

1. **在 `runtime/src/vm/opcode.rs` 中定义**:
```rust
#[repr(u8)]
pub enum OpCode {
    // ... 现有操作码
    Mul = 0x06,  // 新增
}
```

2. **在 `runtime/src/vm.rs` 中实现**:
```rust
OpCode::Mul => {
    // 实现逻辑
}
```

3. **在 `encoder/src/compiler.js` 中生成**:
```javascript
emitOp(op) {
    const ops = {
        '*': 0x06,  // 新增
    }
}
```

### 扩展编译器语法支持

添加新的AST节点类型支持:

```javascript
compileNode(node) {
    switch (node.type) {
        case "YourNewNodeType":
            this.compileYourNewNode(node)
            break
    }
}
```

### 作用域管理

- 使用作用域栈 (`scopeStack`) 管理作用域层级
- 进入作用域: `enterScope()` - 创建新作用域并入栈
- 退出作用域: `exitScope()` - 弹出当前作用域
- 查找变量: `findVariable(name)` - 从当前作用域向上查找
- 全局变量判断: `currentScope === globalScope && scopeStack.length === 0`

## 字节码格式

### Push指令
```
Push Int:    [0x00] [0x01] [8字节小端序整数]
Push String: [0x00] [0x02] [4字节长度] [UTF-8字符串]
Push Null:   [0x00] [0x03]
```

### 操作指令
```
Add: [0x02]
Sub: [0x03]
Mul: [0x04]
Div: [0x05]
```

### 变量操作
```
LoadLocal:  [0x10] [变量索引]
StoreLocal: [0x11] [变量索引]
LoadGlobal: [0x12] [变量索引]
StoreGlobal:[0x13] [变量索引]
```

## 常见问题解决

### Q: 如何调试字节码生成？
A: 编译器会输出十六进制字节码，使用 `console.log` 查看生成的指令序列。

### Q: 作用域栈如何工作？
A: 
- 进入函数/块时调用 `enterScope()` push新作用域
- 退出时调用 `exitScope()` pop当前作用域
- 查找变量时从 `currentScope` 向上遍历 `parent` 链

### Q: 如何处理未定义的变量？
A: `findVariable()` 返回 `null` 时应输出错误并跳过该变量。

### Q: 如何确保编译器与VM操作码同步？
A: 操作码值定义在 `runtime/src/vm/opcode.rs`，编译器中的操作码映射必须与之匹配。

## 反爬虫特性开发指南

### 当前支持
- 字节码编译（隐藏源代码逻辑）
- 栈式执行（难以静态分析）

### 计划实现
- 动态Opcode映射（每次执行不同）
- 字节码加密（部署时加密）
- 反调试检测（检测调试器）
- 环境指纹（动态密钥生成）

### 开发原则
- 安全性优先，但不能影响性能过多
- 混淆不能破坏代码功能
- 虚拟机必须正确执行混淆后的字节码

## 文件结构提示

```
encoder/src/
├── compiler.js      # 主编译器类
├── index.js         # 入口文件
└── ...

runtime/src/
├── vm.rs           # VM实现
├── vm/
│   └── opcode.rs   # 操作码定义
└── main.rs        # 主程序

ollvm/src/
├── transformers/   # 混淆变换器
└── obfuscator/    # 混淆器实现
```

## 代码审查检查点

1. ✅ 操作码值是否唯一且连续？
2. ✅ 字节码格式是否符合规范？
3. ✅ 错误处理是否完善？
4. ✅ 作用域管理是否正确？
5. ✅ 调试日志是否清晰？
6. ✅ 代码注释是否充分？

## 测试指南

- 使用 `files/test.js` 作为测试用例
- 编译后检查字节码格式是否正确
- 在VM中执行验证结果
- 确保局部/全局变量正确处理

## 提交规范

提交信息格式: `<类型>: <简短描述>`

类型:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试相关

示例: `feat: 添加乘法操作码支持`
