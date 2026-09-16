# Cursor 项目说明

Twisted：**ES5 JavaScript → Hyperion IR → 栈式字节码 → TypeScript 同步 VM**。可选字节码加固与浏览器 runtime 打包。

## 数据流

```text
source (ES5)
  → HyperionCompiler + whitelist
  → HyperionAssembler → { bytecode, meta }
  → [可选] src/obfuscator → HardenedBundle + protection
  → buildRuntime (esbuild IIFE) → runtime.js
  → VM.execute() / 宿主回调 executeClosure()
```

## 核心目录

| 路径 | 作用 |
|------|------|
| `src/compiler/` | AST → IRModule；`whitelist.ts`、`error.ts` |
| `src/assembler/hyperion.ts` | IR → bytecode |
| `src/obfuscator/` | `Obfuscator` + Pass（OpcodeRemap、MetaEncrypt） |
| `src/vm/` | 解释器；`protection` 通过 `RuntimeProtection` |
| `src/builder/` | `HyperionBuildBundle`、`buildRuntime`、`runBench` |
| `src/instruction.ts` | Assembler 内部栈式指令缓冲（非第二套编译器） |

## CLI

```bash
npm run cli -- check <file>          # 白名单，不写产物
npm run cli -- bench [file] [--harden]
npm run cli -- build / runtime / all [--obfuscate]
```

`--obfuscate`：`build` 开字节码加固；`runtime`/`all` 额外包一层 `javascript-obfuscator`。

## 文档索引

- [README.md](./README.md) — 总览与语法表
- [docs/syntax-whitelist.md](./docs/syntax-whitelist.md) — 白名单权威说明
- [docs/ir.md](./docs/ir.md) — IR / Opcode
- [docs/worker-callbacks.md](./docs/worker-callbacks.md) — Worker 宿主约定
- [docs/todos.md](./docs/todos.md) — 待办

## 开发注意

- 无 Babel 降级；无 Rust runtime；无 Linear 编译路径
- 测试用 `example/fingerprint.js` 或 `tests/` 内联源码
- 改 Opcode 须同步 constant、assembler layout、obfuscator layout、VM
