# Twisted

简体中文 | [English](docs/README.en.md)

面向**浏览器与 Node** 的实验性 **JavaScript → 自定义字节码** 工具链：将子集 JS 编译为栈式虚拟机字节码，可选 IR 混淆与浏览器端打包。适合学习编译器/虚拟机、研究前端脚本保护与对抗成本，**不提供商业级加固承诺**。

---

## 特性

| 模块 | 说明 |
|------|------|
| **Compiler** | Babel 解析 AST → 线性 `Instruction[]`（IR） |
| **Assembler** | IR → `{ bytecode: number[], meta: string[] }` |
| **VM** | 解释执行 bytecode（依赖注入、`async`/`await`、闭包、调用约定等） |
| **Obfuscator** | IR 级混淆 Pass 可串联 |
| **Builder** | esbuild 打包浏览器 runtime，可选 `javascript-obfuscator` |
| **CLI** | `build` / `runtime` / `all` 一条命令走完流水线 |

---

## 环境要求

- **Node.js** ≥ 18（使用 `node:test`、原生 `fetch` 等）

---

## 安装

```bash
git clone <repository-url>
cd twisted
npm install
```

---

## 快速开始

### 类型检查

```bash
npm run typecheck
```

### 运行测试

```bash
npm test
```

### 一键生成浏览器产物（示例）

```bash
npm run build:all
```

默认使用 `example/fingerprint.js` → 输出 `dist/browser/bundle.json` 与 `dist/browser/runtime.js`（含混淆）。  
不需要外层混淆时：

```bash
npm run build:all:plain
```

### 开发时直接跑调试入口

```bash
npm run debugger
```

---

## CLI（`npm run cli -- …`）

安装并 `npm run build` 生成 `dist/` 后，可使用包内 CLI（见 `package.json` 的 `bin`）：

```text
twisted build   <input.js> <bundle.json> [--obfuscate]
twisted runtime <bundle.json> <runtime.js> [--obfuscate]
twisted all     <input.js> <bundle.json> <runtime.js> [--obfuscate]
twisted help
twisted version
```

开发阶段等价于：

```bash
npm run cli -- all example/fingerprint.js dist/browser/bundle.json dist/browser/runtime.js --obfuscate
```

---

## npm scripts

| 脚本 | 作用 |
|------|------|
| `npm test` | Node 内置测试（`tests/*.test.ts`） |
| `npm run test:watch` | 监听模式跑测试 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm run build:ts` | 编译 TypeScript → `dist/` |
| `npm run build:bundle` | 仅编译输入 → `bundle.json` |
| `npm run build:runtime` | 由 bundle 生成浏览器 `runtime.js` |
| `npm run build:all` | bundle + runtime（默认混淆） |
| `npm run build:all:plain` | 同上，不启用 builder 侧混淆选项 |
| `npm run format` | Prettier 格式化 `src/` |

---

## 仓库结构（核心）

```text
src/
  assembler/       # IR → bytecode / meta
  builder/         # bundle 与浏览器 runtime 构建
  cli.ts           # 命令行入口
  compiler/        # JS → IR
  obfuscator/      # IR 混淆 Pass
  vm/              # 字节码解释器
  constant.ts      # Opcode 等
  instruction.ts   # IR 定义
example/           # 示例输入（如 fingerprint）
tests/             # compiler / vm / obfuscator 单测
docs/              # IR 说明等
dev/               # 开发笔记、流程与防护分级（非 API 文档）
dist/              # 构建输出（gitignore）
```

---

## 语法支持

以下根据当前 `src/compiler/compiler.ts` 实际分支整理，分为「已支持」与「TODO（未完成 / 有约束）」两部分。

### 已支持

#### Statement

| 语法 | 状态 | 未完全支持原因 |
|------|:----:|----------------|
| `ExpressionStatement` | ✅ | - |
| `VariableDeclaration` | ⚠️ | 声明必须有初值；仅支持 `Identifier` 绑定（不支持解构） |
| `IfStatement` | ✅ | - |
| `ForStatement` | ✅ | - |
| `BlockStatement` | ✅ | - |
| `FunctionDeclaration` | ⚠️ | 形参仅支持 `Identifier`（不支持默认值、解构、`RestElement`） |
| `ReturnStatement` | ⚠️ | 当前必须带返回值，不支持空 `return;` |
| `TryStatement` | ⚠️ | 仅支持 `try + catch`，不支持 `finally` |
| `DebuggerStatement` | ✅ | - |

#### Expression

| 语法 | 状态 | 未完全支持原因 |
|------|:----:|----------------|
| `Identifier` | ✅ | - |
| `NumericLiteral` / `StringLiteral` / `BooleanLiteral` / `NullLiteral` | ✅ | - |
| `CallExpression` | ⚠️ | `callee` 仅支持 `Identifier` / `MemberExpression` / `CallExpression` |
| `MemberExpression` | ⚠️ | `object` 侧类型受限；非 `computed` 分支仅支持 `Identifier` 属性名 |
| `NewExpression` | ⚠️ | 构造器 `callee` 类型受限（不支持全部表达式） |
| `AwaitExpression` | ✅ | - |
| `BinaryExpression` | ⚠️ | 仅支持 `+ - * / == === | ^ << >>> < > <= >=` |
| `UnaryExpression` | ⚠️ | 仅支持 `!` 与负数字面量折叠 |
| `AssignmentExpression` | ⚠️ | `Identifier` 仅 `= += -= ^=`；`MemberExpression` 仅 `=` |
| `UpdateExpression` | ⚠️ | 仅支持 `Identifier` 上 `++/--` |
| `FunctionExpression` | ⚠️ | 形参与声明函数一致，仅支持 `Identifier` 参数 |
| `ArrayExpression` | ⚠️ | 不支持稀疏数组（如 `[,]`） |
| `ObjectExpression` | ⚠️ | 仅支持 `ObjectProperty`，不支持 `computed key`、对象方法简写等 |

### TODO（未完成 / 有约束）

#### IR
- [ ] LLVM风格IR
- [ ] CFG
- [ ] SSA
- [ ] Lowering
- [ ] Pass 修改

#### 语法
- [ ] `WhileStatement` / `DoWhileStatement`
- [ ] `SwitchStatement`
- [ ] `BreakStatement` / `ContinueStatement`
- [ ] `ThrowStatement`
- [ ] `EmptyStatement`
- [ ] `LabeledStatement`
- [ ] `ClassDeclaration` / `ClassExpression`
- [ ] `TemplateLiteral`
- [ ] `LogicalExpression`（`&&` `||` `??`）
- [ ] `ConditionalExpression`（`?:`）
- [ ] `SequenceExpression`（`,`）
- [ ] `ThisExpression`
- [ ] `MetaProperty` / `ImportExpression` / `Super`
- [ ] `ImportDeclaration` / `ExportDeclaration`

### 运行时与构建相关

| 能力 | 状态 | 说明 |
|------|:----:|------|
| 依赖注入表 | ✅ | 默认 `window`、`console`（`Compiler` 内 `dependencies`） |
| `async` 函数与 `await`（编译目标） | ✅ | 与 `Await` 等配合 |
| 浏览器 `runtime.js` 打包 | ✅ | 见 `npm run build:runtime` / `build:all` |
| IR 混淆 Pass | ✅ | 如 `ArithmeticDeformationPass`，可串联，完成grhpa后再完善 |

**图例：** ✅ 已支持　⚠️ 部分支持 / 有约束　❌ 未实现  

更细的 IR / Opcode 说明见 **[docs/ir.md](docs/ir.md)**。

---

## 浏览器中运行

构建得到的 `runtime.js` 为 **IIFE**，加载后会在页面上下文执行 VM（默认依赖 `[window, console]`，与编译期依赖表一致）。**不包含** `TwistedRuntime.run` 这类全局 API——与旧文档描述不一致处以当前构建产物为准。

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/README.en.md](docs/README.en.md) | 本说明的英文版（English translation） |
| [docs/ir.md](docs/ir.md) | IR / Opcode 约定 |

---

## TODO


## 参与贡献

Issues / PR 欢迎。建议：

1. 新功能或修复请附带或更新 **`npm test`** 能通过的单测。  
2. 提交信息清晰说明动机与行为变更（中文或英文均可）。  
3. 大改动请先开 issue 简述方案，避免与维护方向冲突。

---

## 致谢

[KProtect](https://github.com/yang-zhongtian/KProtect)（`yang-zhongtian/KProtect`）
