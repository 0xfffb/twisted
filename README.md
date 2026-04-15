# Twisted

简体中文 | [English](docs/README.en.md)

面向**浏览器与 Node** 的实验性 **JavaScript → 自定义字节码** 工具链：先用 Babel 将源码降为 **ES5（IE11 目标）**，再由 **HyperionCompiler** 生成 SSA 风格 IR，汇编为栈式虚拟机字节码；可选 IR 混淆与浏览器端打包。适合学习编译器/虚拟机、研究前端脚本保护与对抗成本，**不提供商业级加固承诺**。

---

## 特性


| 模块                     | 说明                                                                       |
| ---------------------- | ------------------------------------------------------------------------ |
| **Compiler（Hyperion）** | Babel 降级后的 AST → Hyperion IR（基本块、`Phi`、指令）                               |
| **Assembler**          | IR → `{ bytecode: number[], meta: string[] }`                            |
| **VM**                 | 解释执行 bytecode（依赖注入、闭包、`try/catch`、`throw`、调用约定等）                         |
| **Obfuscator**         | 面向线性 IR 的混淆 Pass（与 Hyperion 主路径并行存在）                                     |
| **Builder**            | `HyperionBuildBundle` + esbuild 打包浏览器 runtime，可选 `javascript-obfuscator` |
| **CLI**                | `build` / `dump` / `runtime` / `all`                                     |


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

### 导出 IR 调试产物（dump / ir.json / es5.js）

```bash
npm run dump
```

默认写入 `dist/browser/`（见 `package.json` 中 `dump` 脚本参数）。同目录还会生成 **`ir.json`**（JSON 序列化 IR）与 **`es5.js`**（Babel 降级结果）。

**`dump`**：`HyperionCompiler#dump()` 的可读 IR（与 `ir.json` 同源）。**源码与 dump 对照**（先 Babel 降 ES5 再编译）：

```js
function add(a, b) {
  return a + b;
}

var c = add(1, 2)
```

对应 **`dump`** 节选（由 `HyperionCompiler` 生成；`c` 未被读取时通常不会出现对它的 `Store`）：

```text
; Module: hyperion
define @__main__() {
  entry:
    %0 = call @add(1, 2)
    unreachable
}

define @add(%a, %b) {
  entry:
    %0 = add %a, %b
    ret %0
}
```

复杂控制流（循环、`phi`、`try` 等）在 **`dump`** 里会展开为更多基本块；详见 **[docs/ir.md](docs/ir.md)**。

### 开发时直接跑调试入口

```bash
npm run debugger
```

---

## CLI（`npm run cli -- …`）

安装并 `npm run build` 生成 `dist/` 后，可使用包内 CLI（见 `package.json` 的 `bin`）：

```text
twisted build   <input.js> <bundle.json> [--obfuscate]
twisted dump    <input.js> [outDir]
twisted runtime <bundle.json> <runtime.js> [--obfuscate]
twisted all     <input.js> <bundle.json> <runtime.js> [--obfuscate]
twisted help
twisted version
```

开发阶段可直接：

```bash
npm run cli -- all example/fingerprint.js dist/browser/bundle.json dist/browser/runtime.js --obfuscate
```

---

## npm scripts


| 脚本                                   | 作用                                                       |
| ------------------------------------ | -------------------------------------------------------- |
| `npm test`                           | Node 内置测试（`tests/*.test.ts`）                             |
| `npm run test:watch`                 | 监听模式跑测试                                                  |
| `npm run typecheck`                  | `tsc --noEmit`                                           |
| `npm run build` / `npm run build:ts` | 编译 TypeScript → `dist/`                                  |
| `npm run build:bundle`               | 仅编译输入 → `dist/browser/bundle.json`（示例路径见 `package.json`） |
| `npm run build:runtime`              | 由 bundle 生成浏览器 `runtime.js`                              |
| `npm run build:all`                  | bundle + runtime（默认混淆）                                   |
| `npm run build:all:plain`            | 同上，不启用 builder 侧混淆选项                                     |
| `npm run dump`                       | `dump` 写入输出目录（默认 `dist/browser`）                         |
| `npm run format`                     | Prettier 格式化 `src/**/*.{js,ts}`                          |
| `npm run format:check`               | Prettier 仅检查，不写入                                         |
| `npm run debugger`                   | 运行 `src/debugger.ts`                                     |


---

## 仓库结构（核心）

```text
twisted/
  src/
    assembler/          # HyperionAssembler / LinearAssembler → bytecode
    builder/              # HyperionBuildBundle、runtime、线性链路基座（linear）
    compiler/             # HyperionCompiler、序列化、IR 值与指令（value/）
    obfuscator/           # IR 混淆 Pass (暂不支持)
    vm/                   # 字节码解释器与调用栈
    utils/                # 辅助脚本（如 bytecode）
    cli.ts                # 命令行入口
    constant.ts           # Opcode 等常量
    debugger.ts           # 调试入口
    instruction.ts        # 线性 IR 指令定义（与 Hyperion 路径并存）
  example/                # 示例输入（如 fingerprint）
  tests/                  # compiler / vm / obfuscator 单测
  docs/                   # IR 说明、英文 README、todos
  public/                 # 静态页等（若有浏览器演示）
  dist/                   # 构建输出（gitignore）
```

---

## ES5 语法支持（Hyperion 编译器）

构建时 `**src/builder/hyperion.ts**` 先用 `@babel/preset-env`（`targets: { ie: "11" }`）将源码降为 ES5，再由 `**src/compiler/hyperion.ts**` 遍历 AST。下表表示 **降级后** 仍须被 Hyperion 识别的语句与表达式；若 Babel 输出仍含未实现节点类型，编译会报错。

### Statement（语句）

状态列 **✅** 表示：在 **Babel 降到 ES5 后的常规 AST** 上已完整走通；说明列仅作补充，不表示「未完成」。


| 语法                            | 状态  | 说明（补充）                                             |
| ----------------------------- | --- | -------------------------------------------------- |
| `EmptyStatement`              | ✅   | `;`                                                |
| `ExpressionStatement`         | ✅   | -                                                  |
| `BlockStatement`              | ✅   | -                                                  |
| `VariableDeclaration`         | ✅   | `var`、单 `Identifier`、可无初值（视为 `null`）；与 ES5 写法一致    |
| `FunctionDeclaration`         | ✅   | 形参为 `Identifier` 列表（与 ES5 一致；默认值/剩余参数等为后续语法，见下方边界） |
| `ReturnStatement`             | ✅   | 可无参数（等价 `return null`）                             |
| `IfStatement`                 | ✅   | -                                                  |
| `WhileStatement`              | ✅   | -                                                  |
| `DoWhileStatement`            | ✅   | -                                                  |
| `ForStatement`                | ✅   | `init` 可为表达式或单 `VariableDeclaration`               |
| `ForInStatement`              | ✅   | 左值为 `var k` 单声明或 `Identifier`（ES5 `for-in` 常见形式）   |
| `SwitchStatement`             | ✅   | 多分支出口变量用 `Phi` 合并                                  |
| `BreakStatement`              | ✅   | 用于循环与 `switch`（规范用法）                               |
| `ContinueStatement`           | ✅   | 用于循环                                               |
| `TryStatement`                | ✅   | `try` / `catch` / `finally`                        |
| `ThrowStatement`              | ✅   | -                                                  |
| `DebuggerStatement`           | ✅   | 空操作（不挂断点）                                          |
| 其他（如 `LabeledStatement`、模块、类） | ❌   | 未实现                                                |


### Expression（表达式）


| 语法                                                                    | 状态  | 说明（补充）                                                           |
| --------------------------------------------------------------------- | --- | ---------------------------------------------------------------- |
| `Identifier`                                                          | ✅   | 含全局名、`arguments`                                                 |
| `ThisExpression`                                                      | ✅   | -                                                                |
| `NumericLiteral` / `StringLiteral` / `BooleanLiteral` / `NullLiteral` | ✅   | -                                                                |
| `CallExpression`                                                      | ✅   | 成员调用为 `**Apply`**（保留 `this`），其余为 `Call`                          |
| `NewExpression`                                                       | ✅   | `new` 与实参列表                                                      |
| `MemberExpression`                                                    | ✅   | 点属性与 `obj[key]`                                                  |
| `ArrayExpression`                                                     | ✅   | 字面量列表；**空缺槽** 按 `null` 处理（与稀疏数组语义不同，见边界）                         |
| `ObjectExpression`                                                    | ✅   | 字面量属性；键为 `Identifier` 或字面量                                       |
| `AssignmentExpression`                                                | ✅   | 左值：`Identifier` / `MemberExpression`；算符含 `=`、`+=`、`-=`、`*=`、`/=` |
| `UpdateExpression`                                                    | ✅   | ES5 常见的 `**Identifier` 自增自减**（`i++` 等）                           |
| `UnaryExpression`                                                     | ✅   | `! - + ~ typeof void delete` 等                                   |
| `BinaryExpression`                                                    | ✅   | 算术、比较、`===`/`!==`、`instanceof`、`in`、位运算与移位等                      |
| `LogicalExpression`                                                   | ✅   | 逻辑与、逻辑或短路（ES5 无 `??`）                                            |
| `ConditionalExpression`                                               | ✅   | `?:`，分支后变量 `Phi` 合并                                              |
| `SequenceExpression`                                                  | ✅   | 逗号表达式，取最后一项                                                      |
| `FunctionExpression`                                                  | ✅   | 形参与 `FunctionDeclaration` 一致；具名/匿名由内部命名区分                        |


#### 边界与未实现（与上表区分）

以下不影响将 **✅** 标为「ES5 路径已完成」，但超出时仍会报错或语义与规范有差异：


| 情形                                                                | 说明                       |
| ----------------------------------------------------------------- | ------------------------ |
| 解构绑定、`…` 剩余形参、默认参数                                                | 非 ES5 核心子集；编译器未实现对应绑定形式  |
| `UpdateExpression` 作用于 **非** `Identifier`（如 `arr[i]++`、`obj.x++`） | 未实现                      |
| `??`（若未降级进 AST）                                                   | 未按 nullish 单独建模          |
| 稀疏数组 `[,]`                                                        | 空缺处按 `null` 填充，与引擎稀疏语义不同 |
| `LabeledStatement`、`import` / `export`、类等                         | 语句侧未实现                   |


---

### 运行时与构建相关


| 能力                  | 状态  | 说明                                      |
| ------------------- | --- | --------------------------------------- |
| 依赖注入表               | ✅   | 编译期可声明全局依赖（与 VM 注入一致）                   |
| 浏览器 `runtime.js` 打包 | ✅   | 见 `npm run build:runtime` / `build:all` |
| IR 混淆（线性 IR）        | ✅   | `LinearCompiler` 路径下可串联 Pass            |


**图例：** ✅ 已在 ES5 常规路径完成　❌ 语句级未实现（上表单独列出）  

更细的 IR / Opcode 说明见 **[docs/ir.md](docs/ir.md)**。

---

## 浏览器中运行

构建得到的 `runtime.js` 为 **IIFE**，加载后会在页面上下文执行 VM（默认依赖 `[window, console]`，与编译期依赖表一致）。**不包含** `TwistedRuntime.run` 这类全局 API——与旧文档描述不一致处以当前构建产物为准。

---

## 文档


| 文档                                     | 内容                           |
| -------------------------------------- | ---------------------------- |
| [docs/README.en.md](docs/README.en.md) | 本说明的英文版（English translation） |
| [docs/ir.md](docs/ir.md)               | IR / Opcode 约定               |
| [docs/todos.md](docs/todos.md)         | 备忘与待办                        |


---

### TODO（节选）

#### 编译器 / 语法

- `LabeledStatement` 与精细 `break/continue` 标签
- 解构、剩余参数、默认参数（需 IR 与调用约定扩展）
- `ClassDeclaration` / `ClassExpression`
- `TemplateLiteral`（或依赖 Babel 已全部降为字符串拼接）
- `ImportDeclaration` / `ExportDeclaration`（模块语义）
- `MetaProperty` / `Super` 等

#### 工程

- 与 `docs/README.en.md` 同步本中文版的结构说明

---

## 参与贡献

Issues / PR 欢迎。建议：

1. 新功能或修复请附带或更新 `**npm test`** 能通过的单测。
2. 提交信息清晰说明动机与行为变更（中文或英文均可）。
3. 大改动请先开 issue 简述方案，避免与维护方向冲突。

