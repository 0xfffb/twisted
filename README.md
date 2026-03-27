# Twisted

Twisted 是一个面向浏览器运行时保护实验的 JavaScript VM 项目。  
当前主线是把输入脚本编译为 `bytecode + meta`，再将 VM 与产物打包为浏览器可执行的单文件 runtime。

## 当前能力（以仓库代码为准）

- `Compiler`：Babel AST -> 线性 `Instruction[]`
- `Assembler`：`Instruction[]` -> `{ bytecode: number[], meta: string[] }`
- `VM`：解释执行 bytecode（支持依赖注入、属性读写、函数调用、构造调用等）
- `Builder`：
  - `src/builder/compiler.ts` 生成 `dist/runtime/bundle.json`
  - `src/builder/runtime.ts` 读取 bundle 并打包 `dist/browser/runtime(.esm).js`
  - runtime 构建阶段支持 `esbuild + javascript-obfuscator`

## 目录结构（核心）

```text
src/
  assembler/            # IR -> bytecode/meta
  builder/              # build pipeline (compiler/runtime)
  compiler/             # JS -> IR
  vm/                   # bytecode VM
  constant.ts           # opcode 定义
  instruction.ts        # IR 指令结构
files/
  runtime_input.js      # runtime 编译输入
dist/
  runtime/              # bundle.json
  browser/              # runtime.js / runtime.esm.js
docs/
  ir.md
  workflow.md
```

## 快速开始

### 1) 安装

```bash
npm install
```

### 2) 构建 TypeScript

```bash
npm run build
```

### 3) 端到端构建 runtime

```bash
npm run build:runtime:all
```

该命令会依次执行：

1. `build:bundle`：将 `files/runtime_input.js` 编译为 `dist/runtime/bundle.json`
2. `build:runtime`：将 VM + bundle 打包为浏览器脚本

输出文件：

- `dist/runtime/bundle.json`
- `dist/browser/runtime.js`
- `dist/browser/runtime.esm.js`

## 浏览器侧执行

可直接在测试页中加载 `dist/browser/runtime.js`，调用：

```js
TwistedRuntime.run([window, console]);
```

依赖数组顺序需要和编译器依赖表一致（当前默认是 `window`, `console`）。

## 当前语法支持（简表）

- 语句：`ExpressionStatement`, `VariableDeclaration`, `IfStatement`, `BlockStatement`, `FunctionDeclaration`, `ReturnStatement`, `TryStatement`
- 表达式：`CallExpression`, `NewExpression`, `AwaitExpression`, `BinaryExpression`, `Identifier`, `MemberExpression`, `NumericLiteral`, `StringLiteral`, `BooleanLiteral`, `ObjectExpression`, `AssignmentExpression`

> 提示：项目处于迭代阶段，复杂 JS 语法不保证全部支持。遇到编译错误请以 `Unsupported ...` 报错为准，按需补 AST 节点。

## 构建脚本

- `npm run start`：运行调试入口
- `npm run build`：TypeScript 构建
- `npm run build:bundle`：生成 `bundle.json`
- `npm run build:runtime`：构建浏览器 runtime
- `npm run build:runtime:all`：完整流水线

## 相关文档

- `docs/ir.md`：当前 IR / opcode 说明
- `docs/workflow.md`：当前构建与运行流程

## License

ISC