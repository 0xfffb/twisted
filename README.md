# Twisted

简体中文 | [English](docs/README.en.md)

面向**浏览器与 Node** 的实验性 **JavaScript → 自定义字节码** 工具链：输入须为 **ES5 语法**，由 **HyperionCompiler** 生成 SSA 风格 IR，汇编为栈式虚拟机字节码；可选混淆与浏览器端打包。适合学习编译器/虚拟机、研究前端脚本保护与对抗成本，**不提供商业级加固承诺**。

---

## 特性


| 模块                     | 说明                                                                       |
| ---------------------- | ------------------------------------------------------------------------ |
| **Compiler（Hyperion）** | ES5 AST → Hyperion IR（基本块、`Phi`、指令） |
| **Assembler**          | IR → `{ bytecode: number[], meta: string[] }`                            |
| **VM**                 | 解释执行 bytecode（依赖注入、闭包、`try/catch`、`throw`、调用约定等）                         |
| **Builder**            | `HyperionBuildBundle` + esbuild 打包浏览器 runtime，可选 `javascript-obfuscator` |
| **CLI**                | `build` / `dump` / `runtime` / `all`                                     |


---

## 环境要求

- **Node.js** ≥ 20.19（或 ≥ 22.12；与 `jsdom@27` 一致）

---

## 安装

```bash
git clone <repository-url>
cd twisted
npm install
```

---

## 快速开始

```bash
npm test
npm run typecheck
npm run build:pages   # example/fingerprint.js → public/runtime.js
```

导出 IR 调试产物：

```bash
npm run cli -- dump example/fingerprint.js dist/browser
```

**`dump`**：`HyperionCompiler#dump()` 的可读 IR。**源码与 dump 对照**（输入须为 ES5）：

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

本地调试入口：`npx tsx src/debugger.ts`

---

## CLI（`npm run cli -- …`）

安装并 `npm run build` 生成 `dist/` 后，可使用包内 CLI（见 `package.json` 的 `bin`）：

```text
twisted check   <input.js> [input2.js ...]   # ES5 白名单，不写产物
twisted bench   [input.js] [--harden] [--runs N]   # 体积 / VM 执行 benchmark
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


| 脚本                    | 作用                                              |
| --------------------- | ----------------------------------------------- |
| `npm test`            | 编译测试并跑 Hyperion 单测                              |
| `npm run typecheck`   | `tsc --noEmit`                                  |
| `npm run build`       | TypeScript → `dist/`                            |
| `npm run build:pages` | fingerprint → `public/runtime.js`（CI / Pages **每次**重新生成，勿提交） |
| `npm run cli -- …`    | 开发期 CLI（build / dump / runtime / all）           |
| `npm run format`      | Prettier 格式化 `src/**/*.{js,ts}`                 |
| `npm run bench`       | 同 `twisted bench`（默认 `example/fingerprint.js`） |


其余能力一律走 CLI，例如：

```bash
npm run cli -- build <in.js> <bundle.json> [--obfuscate]
npm run cli -- runtime <bundle.json> <runtime.js> [--obfuscate]
npm run cli -- dump <in.js> [outDir]
```

---

## 仓库结构（核心）

```text
twisted/
  src/
    assembler/          # HyperionAssembler → bytecode
    builder/              # HyperionBuildBundle、runtime
    compiler/             # HyperionCompiler、序列化、IR 值与指令（value/）
    vm/                   # 同步字节码解释器与调用栈
    utils/                # 辅助脚本（如 bytecode）
    cli.ts                # 命令行入口
    constant.ts           # Opcode 等常量
    debugger.ts           # 调试入口
    instruction.ts        # Assembler 内部栈式指令缓冲
  example/                # 示例输入（如 fingerprint）
  tests/                  # compiler / vm 单测
  docs/                   # IR 说明、英文 README、todos
  public/                 # GitHub Pages（runtime.js 由 CI 生成）
  dist/                   # 构建输出（gitignore）
```

---

## ES5 语法支持（Hyperion 编译器）

生产路径的**权威白名单与报错约定**见 **[docs/syntax-whitelist.md](docs/syntax-whitelist.md)**（实现：`src/compiler/whitelist.ts`）。

输入必须是 **ES5 语法**（`var` / `function` / 回调或 `Promise.then`）；**不再**经 Babel 降级。[`src/builder/hyperion.ts`](src/builder/hyperion.ts) 直接将源码交给 `HyperionCompiler`。下表为须被识别的语句与表达式；超出白名单会报 `CompileError`。

### Statement（语句）

状态列 **✅** 表示：在 **ES5 常规 AST** 上已完整走通；说明列仅作补充，不表示「未完成」。


| 语法                            | 状态  | 说明（补充）                                             |
| ----------------------------- | --- | -------------------------------------------------- |
| `EmptyStatement`              | ✅   | `;`                                                |
| `ExpressionStatement`         | ✅   | -                                                  |
| `BlockStatement`              | ✅   | -                                                  |
| `VariableDeclaration`         | ✅   | **仅 `var`**；单 `Identifier`、可无初值（视为 `null`） |
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
| `??`                                                          | 未按 nullish 单独建模          |
| `let` / `const`                                               | 编译期拒绝（仅允许 `var`）       |
| 箭头函数 / `async`/`await` 语法                                 | 编译期拒绝；异步用回调或 `.then` |
| 稀疏数组 `[,]`                                                        | 空缺处按 `null` 填充，与引擎稀疏语义不同 |
| `LabeledStatement`、`import` / `export`、类等                         | 语句侧未实现                   |


---

### 运行时与构建相关


| 能力                  | 状态  | 说明                                      |
| ------------------- | --- | --------------------------------------- |
| 依赖注入表               | ✅   | 编译期可声明全局依赖（与 VM 注入一致）                   |
| 浏览器 `runtime.js` 打包 | ✅   | 见 `npm run build:pages` / `npm run cli -- all …` |
| 外层 runtime 混淆        | ✅   | `javascript-obfuscator`（`--obfuscate`）        |


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
| [docs/syntax-whitelist.md](docs/syntax-whitelist.md) | ES5 白名单与 CompileError |
| [docs/todos.md](docs/todos.md)         | 备忘与待办                        |


---

### TODO（节选）

#### 编译器 / 语法

- `LabeledStatement` 与精细 `break/continue` 标签
- 解构、剩余参数、默认参数（需 IR 与调用约定扩展）
- `ClassDeclaration` / `ClassExpression`
- `TemplateLiteral`
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

