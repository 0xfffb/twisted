# Twisted

An experimental **JavaScript → custom bytecode** toolchain for **browsers and Node**: compile a subset of JS to stack-machine bytecode, with optional IR obfuscation and browser bundling. Suited for learning about compilers/VMs and studying front-end script protection and attack/defense trade-offs; **no commercial-grade hardening is promised**.

**[← 中文说明](../README.md)**

---

## Features

| Module | Description |
|--------|-------------|
| **Compiler** | Babel AST → linear `Instruction[]` (IR) |
| **Assembler** | IR → `{ bytecode: number[], meta: string[] }` |
| **VM** | Interprets bytecode (dependency injection, `async`/`await`, closures, calling conventions, etc.) |
| **Obfuscator** | Composable IR obfuscation passes |
| **Builder** | esbuild browser runtime bundle, optional `javascript-obfuscator` |
| **CLI** | `build` / `runtime` / `all` in one pipeline |

---

## Requirements

- **Node.js** ≥ 18 (`node:test`, native `fetch`, etc.)

---

## Install

```bash
git clone <repository-url>
cd twisted
npm install
```

---

## Quick start

### Typecheck

```bash
npm run typecheck
```

### Tests

```bash
npm test
```

### One-shot browser build (example)

```bash
npm run build:all
```

By default uses `example/fingerprint.js` → outputs `dist/browser/bundle.json` and `dist/browser/runtime.js` (with obfuscation).  
Without outer obfuscation:

```bash
npm run build:all:plain
```

### Debug entry during development

```bash
npm run debugger
```

---

## CLI (`npm run cli -- …`)

After `npm install` and `npm run build` to produce `dist/`, use the package CLI (see `bin` in `package.json`):

```text
twisted build   <input.js> <bundle.json> [--obfuscate]
twisted runtime <bundle.json> <runtime.js> [--obfuscate]
twisted all     <input.js> <bundle.json> <runtime.js> [--obfuscate]
twisted help
twisted version
```

During development, equivalent to:

```bash
npm run cli -- all example/fingerprint.js dist/browser/bundle.json dist/browser/runtime.js --obfuscate
```

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Node built-in tests (`tests/*.test.ts`) |
| `npm run test:watch` | Watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm run build:ts` | Compile TypeScript → `dist/` |
| `npm run build:bundle` | Compile input only → `bundle.json` |
| `npm run build:runtime` | Generate browser `runtime.js` from bundle |
| `npm run build:all` | bundle + runtime (obfuscation on by default) |
| `npm run build:all:plain` | Same without builder-side obfuscation |
| `npm run format` | Prettier `src/` |

---

## Repository layout (core)

```text
src/
  assembler/       # IR → bytecode / meta
  builder/         # bundle & browser runtime build
  cli.ts           # CLI entry
  compiler/        # JS → IR
  obfuscator/      # IR obfuscation passes
  vm/              # bytecode interpreter
  constant.ts      # opcodes, etc.
  instruction.ts   # IR definitions
example/           # sample inputs (e.g. fingerprint)
tests/             # compiler / vm / obfuscator tests
docs/              # IR docs, etc.
dev/               # dev notes, workflows (not API docs)
dist/              # build output (gitignored)
```

---

## JS syntax & feature matrix

The following reflects the current **Compiler** (`src/compiler/compiler.ts`) and **VM** (`src/vm/vm.ts`). Anything not listed or marked incomplete will **`throw new Error('Unsupported …')`** or fail to compile. The source of truth is the code.

### Statements

| Syntax | Status | Notes |
|--------|:------:|-------|
| `ExpressionStatement` | ✅ | |
| `VariableDeclaration` (`let` / `const`) | ⚠️ | Each declarator **must** have an initializer; bindings are **`Identifier` only**—no destructuring / no dedicated `var` path |
| `IfStatement` | ✅ | With or without `else` |
| `ForStatement` | ✅ | Classic `for (init; test; update) body`; `init` may be a variable declaration or expression |
| `BlockStatement` | ✅ | |
| `FunctionDeclaration` | ⚠️ | Parameters **`Identifier` only**—no `RestElement`, defaults, or destructuring |
| `ReturnStatement` | ⚠️ | **Must** include an expression; empty `return;` not supported |
| `TryStatement` | ⚠️ | Requires **`catch`**; **no `finally`**; exception delivery to `catch` depends on VM/runtime conventions |
| `DebuggerStatement` | ✅ | Emits `Debugger` |
| `WhileStatement` / `DoWhileStatement` | ❌ | |
| `SwitchStatement` | ❌ | |
| `BreakStatement` / `ContinueStatement` | ❌ | |
| `ThrowStatement` | ❌ | |
| `EmptyStatement` | ❌ | |
| `LabeledStatement` | ❌ | |
| `ClassDeclaration` / `ClassExpression` | ❌ | |
| `ImportDeclaration` / `ExportDeclaration` | ❌ | Source may parse as `module`, but module syntax is not compiled |

### Expressions

| Syntax | Status | Notes |
|--------|:------:|-------|
| `Identifier` | ✅ | Includes `Load` / `LoadCapture` on closure paths |
| Literals `NumericLiteral` / `StringLiteral` / `BooleanLiteral` / `NullLiteral` | ✅ | Booleans as `0`/`1` in IR |
| `CallExpression` | ⚠️ | `callee`: `Identifier` (incl. declared functions / closures), `MemberExpression`, `CallExpression` (limited chaining) |
| `MemberExpression` | ⚠️ | For `obj.prop`, `property` is **`Identifier` only**; `obj[key]` (`computed`) uses `GetElement`; restricted `object` types (e.g. literals, `this`)—see `compileMemberExpression` |
| `NewExpression` | ⚠️ | `Construct`; restricted `callee` types |
| `AwaitExpression` | ✅ | Emits `Await`; needs async-capable runtime |
| `BinaryExpression` | ⚠️ | `+ - * /`, `==`/`===`, `| ^`, shifts `<<` `>>>` (**no** signed `>>`), comparisons `< > <= >=`; **not** `&&`/`||` (those are `LogicalExpression`), `%`, `**`, `&`, etc. |
| `UnaryExpression` | ⚠️ | `!`; folded negative numeric literals (e.g. `-1`); general unary `+`, `typeof`, etc. **not** supported |
| `AssignmentExpression` | ⚠️ | LHS `Identifier`: `=`, `+=`, `-=`, `^=`; LHS `MemberExpression`: **`=` only** |
| `UpdateExpression` | ⚠️ | `++`/`--` on `Identifier` only |
| `FunctionExpression` | ✅ | Closures, `MakeClosure` |
| `ArrayExpression` | ⚠️ | **No** sparse arrays (`[,]`) |
| `ObjectExpression` | ⚠️ | `ObjectProperty` only; **no** computed keys, method shorthand, etc. |
| `TemplateLiteral` | ❌ | |
| `LogicalExpression` (`&&` `||` `??`) | ❌ | |
| `ConditionalExpression` (`?:`) | ❌ | |
| `SequenceExpression` (`,`) | ❌ | |
| `ThisExpression` | ❌ | |
| `MetaProperty` / `ImportExpression` / `Super` | ❌ | |

### Runtime & build

| Capability | Status | Notes |
|------------|:------:|-------|
| Dependency injection table | ✅ | Defaults `window`, `console` (`dependencies` in `Compiler`) |
| `async` / `await` (compile target) | ✅ | Works with `Await`, etc. |
| Browser `runtime.js` bundle | ✅ | See `npm run build:runtime` / `build:all` |
| IR obfuscation passes | ✅ | e.g. `ArithmeticDeformationPass`, `DeadCodePass`, chainable |

**Legend:** ✅ supported　⚠️ partial / constrained　❌ not implemented  

More IR / opcode detail: **[ir.md](./ir.md)**.

---

## Running in the browser

The built `runtime.js` is an **IIFE**; it runs the VM in the page context (default deps `[window, console]`, matching the compile-time dependency table). There is **no** global API such as `TwistedRuntime.run`—if older docs say otherwise, trust the current build.

---

## Documentation

| Doc | Content |
|-----|---------|
| [ir.md](./ir.md) | IR / opcode conventions |
| [dev/workflow.md](../dev/workflow.md) | Build & run workflow |

---

## Contributing

Issues and PRs welcome. Please:

1. Add or update tests that pass **`npm test`** for features and fixes.  
2. Use clear commit messages (Chinese or English).  
3. For large changes, open an issue first to align with project direction.

---

## Acknowledgements

Design and implementation draw on ideas and structure from **[KProtect](https://github.com/yang-zhongtian/KProtect)** (`yang-zhongtian/KProtect`). Thanks to the author and the community.

---

## License

**ISC** — see `license` in `package.json`. For open-source distribution, add a `LICENSE` file at the repo root for automatic detection.
