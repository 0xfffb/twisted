# Twisted - 反爬虫虚拟机系统

一个基于虚拟机字节码的反爬虫解决方案，通过将JavaScript代码编译成自定义字节码并在Rust虚拟机中执行，实现对代码逻辑的保护和反爬虫功能。

## 🎯 项目概述

Twisted 是一个完整的反爬虫系统，包含三个核心模块：

1. **Encoder (编译器)**: 将JavaScript代码编译成自定义字节码
2. **Runtime (虚拟机)**: Rust实现的栈式虚拟机，执行字节码
3. **OLLVM (混淆器)**: JavaScript代码混淆工具

## 🏗️ 项目结构

```
twisted/
├── encoder/              # JavaScript到字节码编译器
│   ├── src/
│   │   ├── compiler.js  # AST转字节码编译器
│   │   ├── index.js     # 主入口
│   │   ├── obfuscator/  # 混淆器模块
│   │   ├── transformers/# 代码变换器
│   │   └── utils/       # 工具函数
│   └── package.json
├── runtime/              # Rust虚拟机
│   ├── src/
│   │   ├── main.rs      # 主程序
│   │   ├── vm.rs       # 虚拟机实现
│   │   └── vm/
│   │       └── opcode.rs # 操作码定义
│   └── Cargo.toml
├── ollvm/                # JavaScript混淆器
│   ├── src/
│   │   ├── index.js     # 主入口
│   │   ├── obfuscator/  # 混淆器
│   │   └── transformers/# 变换器
│   └── package.json
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- Rust >= 1.70
- npm 或 yarn

### 安装依赖

#### Encoder (JavaScript编译器)

```bash
cd encoder
npm install
```

#### Runtime (Rust虚拟机)

```bash
cd runtime
cargo build
```

#### OLLVM (混淆器)

```bash
cd ollvm
npm install
```

## 📖 使用指南

### 1. 编译JavaScript到字节码

```bash
cd encoder
npm run start
```

这会编译 `files/test.js` 并生成字节码。

### 2. 执行字节码

```bash
cd runtime
cargo run
```

### 3. 混淆JavaScript代码

```bash
cd ollvm
npm run start -- files/test.js
```

## 🔧 核心功能

### Encoder (编译器)

**功能特性:**
- ✅ AST递归遍历
- ✅ 支持变量声明和表达式
- ✅ 支持局部和全局变量作用域
- ✅ 二进制操作（加减乘除）
- ✅ 字节码十六进制输出

**支持的语法:**
- 变量声明 (`const`, `let`, `var`)
- 二元表达式 (`+`, `-`, `*`, `/`)
- 字面量 (`数字`, `字符串`)
- 标识符引用

**字节码格式:**
```
[Opcode] [Type] [Value...]
例如: Push Int 10 → [0x00, 0x01, 0x0A, ...]
```

### Runtime (虚拟机)

**功能特性:**
- ✅ 栈式虚拟机
- ✅ 支持多种数据类型 (Int, String, Null)
- ✅ 程序计数器 (PC) 管理
- ✅ 栈操作 (Push/Pop)
- ✅ 算术运算 (Add/Sub)

**支持的操作码:**
- `0x00`: Push - 压栈
- `0x01`: Pop - 出栈
- `0x02`: Add - 加法
- `0x03`: Sub - 减法
- `0x04`: Test - 测试指令
- `0x05`: StringEncrypt - 字符串加密

### OLLVM (混淆器)

**功能特性:**
- ✅ 字符串混淆
- ✅ 控制流平坦化
- ✅ 标识符混淆
- ✅ 死代码注入

## 🛡️ 反爬虫特性

### 当前实现

- **字节码编译**: JavaScript逻辑被编译成字节码，隐藏源代码
- **栈式执行**: 代码在虚拟机中执行，难以静态分析
- **代码混淆**: 支持多种混淆技术

### 计划实现

- **动态Opcode映射**: 每次执行使用不同的操作码映射
- **字节码加密**: 部署时加密字节码
- **反调试检测**: 检测调试器和自动化工具
- **环境指纹**: 基于环境信息生成动态密钥
- **多层虚拟机**: 虚拟机嵌套执行

## 📚 开发指南

### 添加新的操作码

1. **在Runtime中定义操作码:**

```rust
// runtime/src/vm/opcode.rs
#[repr(u8)]
pub enum OpCode {
    // ... 现有操作码
    Mul = 0x06,  // 新增乘法
}
```

2. **在VM中实现处理逻辑:**

```rust
// runtime/src/vm.rs
OpCode::Mul => {
    // 实现乘法逻辑
}
```

3. **在Compiler中生成指令:**

```javascript
// encoder/src/compiler.js
emitOp(op) {
    const ops = {
        // ... 现有操作符
        '*': 0x06,  // 新增乘法
    }
}
```

### 扩展编译器功能

添加新的AST节点类型支持:

```javascript
// encoder/src/compiler.js
compileNode(node) {
    switch (node.type) {
        case "YourNewNodeType":
            this.compileYourNewNode(node)
            break
        // ...
    }
}
```

### 添加混淆技术

创建新的变换器:

```javascript
// ollvm/src/transformers/yourTransformer.js
import Transformer from './base.js'

class YourTransformer extends Transformer {
    transform(ast) {
        // 你的混淆逻辑
        return ast
    }
}
```

## 🧪 测试

### 测试编译器

```bash
cd encoder
npm run start
```

### 测试虚拟机

```bash
cd runtime
cargo test
```

### 测试混淆器

```bash
cd ollvm
npm run start -- files/test.js
```

## 📊 字节码格式说明

### Push指令格式

```
Push Int:    [0x00] [0x01] [8字节小端序整数]
Push String: [0x00] [0x02] [4字节长度] [字符串内容]
Push Null:   [0x00] [0x03]
```

### 操作指令格式

```
Add: [0x02]
Sub: [0x03]
```

### 变量操作格式

```
LoadLocal:  [0x10] [变量索引]
StoreLocal: [0x11] [变量索引]
LoadGlobal: [0x12] [变量索引]
StoreGlobal:[0x13] [变量索引]
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

ISC License

## 🔗 相关资源

- [Babel AST文档](https://babeljs.io/docs/en/babel-parser)
- [Rust文档](https://doc.rust-lang.org/)
- [虚拟机设计模式](https://craftinginterpreters.com/)

## 📝 更新日志

### v0.1.0
- ✅ 基础编译器实现
- ✅ Rust虚拟机实现
- ✅ 基础混淆器
- ✅ 支持变量和表达式编译