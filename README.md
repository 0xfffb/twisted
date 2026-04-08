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

## JS 语法与功能对照

以下为 **Compiler**（`src/compiler/compiler.ts`）当前实现与 **VM**（`src/vm/vm.ts`）执行能力对照，按「是否已接入」标记。未列出或标记为未完成的语法会 **`throw new Error('Unsupported …')`** 或无法通过编译。细节以源码为准。

### 语句（Statement）

| 语法 | 状态 | 说明 |
|------|:----:|------|
| `ExpressionStatement` | ✅ | 表达式语句 |
| `VariableDeclaration`（`let` / `const`） | ⚠️ | 每个声明**必须有初值**；绑定仅限 **`Identifier`**，无解构 / 无 `var` 单独路径 |
| `IfStatement` | ✅ | 含 `else` 与不含 `else` |
| `ForStatement` | ✅ | 经典三段式 `for (init; test; update) body`；`init` 可为变量声明或表达式 |
| `BlockStatement` | ✅ | |
| `FunctionDeclaration` | ⚠️ | 形参仅限 **`Identifier`**，不支持 `RestElement` / 默认参数 / 解构 |
| `ReturnStatement` | ⚠️ | **必须**带表达式，不支持空 `return;` |
| `TryStatement` | ⚠️ | 需带 **`catch`**；**无 `finally`**；异常进入 `catch` 依赖 VM 与运行时约定 |
| `DebuggerStatement` | ✅ | 生成 `Debugger` 指令 |
| `WhileStatement` / `DoWhileStatement` | ❌ | |
| `SwitchStatement` | ❌ | |
| `BreakStatement` / `ContinueStatement` | ❌ | |
| `ThrowStatement` | ❌ | |
| `EmptyStatement` | ❌ | |
| `LabeledStatement` | ❌ | |
| `ClassDeclaration` / `ClassExpression` | ❌ | |
| `ImportDeclaration` / `ExportDeclaration` | ❌ | 源码按 `module` 解析，但未编译模块语法 |

### 表达式（Expression）

| 语法 | 状态 | 说明 |
|------|:----:|------|
| `Identifier` | ✅ | 含闭包捕获路径下的 `Load` / `LoadCapture` |
| 字面量 `NumericLiteral` / `StringLiteral` / `BooleanLiteral` / `NullLiteral` | ✅ | 布尔在 IR 中用 `0`/`1` 表示 |
| `CallExpression` | ⚠️ | `callee` 支持 `Identifier`（含函数声明名 / 闭包）、`MemberExpression`、`CallExpression`（部分链式） |
| `MemberExpression` | ⚠️ | `obj.prop` 时 `property` 仅 **`Identifier`**；`obj[key]`（`computed`）走 `GetElement`；`object` 侧类型受限（如字面量、`this` 等会报错），见 `compileMemberExpression` |
| `NewExpression` | ⚠️ | `Construct`，`callee` 类型受限 |
| `AwaitExpression` | ✅ | 生成 `Await`，需异步执行环境 |
| `BinaryExpression` | ⚠️ | 支持 `+ - * /`、`==` `===`、`| ^`、移位 `<<` `>>>`（**无**有符号 `>>`）、比较 `< > <= >=`；**不支持** `&&` `||`（其为 `LogicalExpression`）、`%`、`**`、`&` 等 |
| `UnaryExpression` | ⚠️ | 支持 `!`；负数字面量折叠（如 `-1`）；**一般一元** `+`、`typeof` 等未支持 |
| `AssignmentExpression` | ⚠️ | 左侧为 `Identifier`：`=`、`+=`、`-=`、`^=`；左侧为 `MemberExpression`：**仅 `=`** |
| `UpdateExpression` | ⚠️ | 仅 `Identifier` 上的 `++` / `--` |
| `FunctionExpression` | ✅ | 闭包、`MakeClosure` |
| `ArrayExpression` | ⚠️ | **不支持**稀疏数组（`[,]`） |
| `ObjectExpression` | ⚠️ | 仅 `ObjectProperty`；**不支持**计算属性名、对象方法简写等扩展 |
| `TemplateLiteral` | ❌ | |
| `LogicalExpression`（`&&` `||` `??`） | ❌ | |
| `ConditionalExpression`（`?:`） | ❌ | |
| `SequenceExpression`（`,`） | ❌ | |
| `ThisExpression` | ❌ | |
| `MetaProperty` / `ImportExpression` / `Super` | ❌ | |

### 运行时与构建相关

| 能力 | 状态 | 说明 |
|------|:----:|------|
| 依赖注入表 | ✅ | 默认 `window`、`console`（`Compiler` 内 `dependencies`） |
| `async` 函数与 `await`（编译目标） | ✅ | 与 `Await` 等配合 |
| 浏览器 `runtime.js` 打包 | ✅ | 见 `npm run build:runtime` / `build:all` |
| IR 混淆 Pass | ✅ | 如 `ArithmeticDeformationPass`、`DeadCodePass` 等，可串联 |

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
| [dev/workflow.md](dev/workflow.md) | 构建与运行流程说明 |

---

## 参与贡献

Issues / PR 欢迎。建议：

1. 新功能或修复请附带或更新 **`npm test`** 能通过的单测。  
2. 提交信息清晰说明动机与行为变更（中文或英文均可）。  
3. 大改动请先开 issue 简述方案，避免与维护方向冲突。

---

## 致谢

[KProtect](https://github.com/yang-zhongtian/KProtect)（`yang-zhongtian/KProtect`）
