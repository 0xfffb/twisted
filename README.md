# OLLVM - JavaScript 代码混淆器

一个基于 Babel AST 的 JavaScript 代码混淆工具，实现了类似 OLLVM 的混淆技术。

## 🚀 特性

- **字符串混淆**：将字符串转换为字符数组拼接
- **标识符混淆**：将变量名替换为随机字符串
- **控制流平坦化**：添加假的条件判断
- **死代码注入**：插入不会执行的代码
- **模块化设计**：可扩展的变换器架构
- **AST 操作**：基于 Babel 的精确代码转换

## 📦 安装

```bash
# 克隆项目
git clone <repository-url>
cd ollvm

# 安装依赖
npm install
```

## 🛠️ 使用方法

### 基本用法

```bash
# 混淆单个文件
npm run start -- <输入文件>

# 示例
npm run start -- files/test.js
```

### 编程接口

```javascript
import OLLVMObfuscator from './src/obfuscator/ollvm.js'
import StringTransformer from './src/transformers/string.js'

// 创建混淆器
const obfuscator = new OLLVMObfuscator(code, [
    new StringTransformer()
])

// 执行混淆
const obfuscatedCode = obfuscator.obfuscate()
```

## 🏗️ 项目结构

```
src/
├── index.js                 # 主入口文件
├── obfuscator/             # 混淆器模块
│   ├── base.js            # 基础混淆器类
│   └── ollvm.js           # OLLVM 混淆器实现
├── transformers/          # 变换器模块
│   ├── base.js            # 基础变换器类
│   └── string.js          # 字符串混淆变换器
└── utils/                 # 工具模块
    └── file.js            # 文件操作工具
```

## 🔧 混淆技术

### 1. 字符串混淆

将字符串字面量转换为字符数组拼接：

```javascript
// 原始代码
const message = "Hello World"

// 混淆后
const message = ["H","e","l","l","o"," ","W","o","r","l","d"].join("")
```

### 2. 标识符混淆

将变量名替换为随机字符串：

```javascript
// 原始代码
function calculateSum(a, b) {
    return a + b
}

// 混淆后
function xKj8mN2p(a, b) {
    return a + b
}
```

### 3. 控制流平坦化

添加假的条件判断：

```javascript
// 原始代码
if (condition) {
    doSomething()
}

// 混淆后
if (123 === 456 && condition) {
    doSomething()
}
```

## 🎯 自定义变换器

创建自定义变换器：

```javascript
// src/transformers/custom.js
import Transformer from './base.js'
import traverse from '@babel/traverse'
import * as t from '@babel/types'

class CustomTransformer extends Transformer {
    transform(ast) {
        traverse(ast, {
            // 你的变换逻辑
            Identifier(path) {
                // 处理标识符
            }
        })
        return ast
    }
}

export default CustomTransformer
```

## 📋 API 文档

### Obfuscator 基类

```javascript
class Obfuscator {
    constructor(code, transformers)
    parse()                    // 解析代码为 AST
    generate()                 // 生成混淆后的代码
    obfuscate()               // 执行混淆（子类实现）
}
```

### Transformer 基类

```javascript
class Transformer {
    transform(ast)             // 变换 AST（子类实现）
}
```

## 🚀 开发

### 运行测试

```bash
# 运行示例
npm run start -- files/test.js
```

### 添加新的混淆技术

1. 在 `src/transformers/` 中创建新的变换器
2. 继承 `Transformer` 基类
3. 实现 `transform(ast)` 方法
4. 在主文件中注册变换器

## 📝 示例

### 输入文件 (test.js)

```javascript
function greet(name) {
    const message = "Hello, " + name
    console.log(message)
    return message
}

greet("World")
```

### 输出文件 (test.ollvm.js)

```javascript
function greet(name) {
    const message = ["H","e","l","l","o",","," "].join("") + name
    console.log(message)
    return message
}

greet(["W","o","r","l","d"].join(""))
```

## 🔧 依赖

- `@babel/core` - Babel 核心库
- `@babel/parser` - JavaScript 解析器
- `@babel/generator` - 代码生成器
- `@babel/traverse` - AST 遍历器
- `@babel/types` - AST 节点类型

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC License