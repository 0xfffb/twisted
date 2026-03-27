## Twisted 当前工作流（实装版）

本文件只描述当前仓库已落地流程。

---

## 1) 编译阶段：源码 -> bundle.json

入口脚本：`src/builder/compiler.ts`

- 输入：`files/runtime_input.js`（可通过命令行参数指定）
- 步骤：
  1. `Compiler` 生成线性 IR (`Instruction[]`)
  2. `Assembler` 生成 `{ bytecode, meta }`
  3. 写入 `dist/runtime/bundle.json`

命令：

```bash
npm run build:bundle
```

---

## 2) 运行时打包：VM + bundle -> 浏览器脚本

入口脚本：`src/builder/runtime.ts`

- 输入：`dist/runtime/bundle.json`
- 步骤：
  1. 读取 bundle
  2. 生成 runtime entry（内嵌 bytecode/meta）
  3. `esbuild` 输出：
     - `dist/browser/runtime.js`（iife）
     - `dist/browser/runtime.esm.js`（esm）
  4. `javascript-obfuscator` 二次混淆（按 `runtime.ts` 中选项）

命令：

```bash
npm run build:runtime
```

---

## 3) 一键端到端

```bash
npm run build:runtime:all
```

等价于：

1. `npm run build:bundle`
2. `npm run build:runtime`

---

## 4) 浏览器执行

测试页可加载 `dist/browser/runtime.js`，调用：

```js
TwistedRuntime.run([window, console]);
```

---

## 5) 当前已知约束

- 语法支持是按节点逐步补齐，不是完整 JS。
- 依赖注入顺序要和编译器依赖表一致（当前 `window`, `console`）。
- worker/回调等复杂场景依赖当前 AST 支持范围，遇到 `Unsupported ...` 需补节点。

---

## 6) 推荐开发节奏

1. 先保证业务脚本可编译（`build:bundle`）
2. 再验证 runtime 产物可运行（`build:runtime`）
3. 最后再提升混淆强度与反调试策略


