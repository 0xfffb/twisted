# Twisted

[简体中文](../README.md) | English

An experimental **JavaScript → custom bytecode** toolchain for **browsers and Node**: Babel lowers source to **ES5 (IE11 target)**, then **HyperionCompiler** builds SSA-style IR, which is assembled to stack-machine bytecode; optional IR obfuscation and browser bundling. Suited for learning compilers/VMs and studying front-end script protection trade-offs; **no commercial-grade hardening is promised**.

---

## Features

| Module | Description |
|--------|-------------|
| **Compiler (Hyperion)** | Babel output AST → Hyperion IR (basic blocks, `Phi`, instructions) |
| **Assembler** | IR → `{ bytecode: number[], meta: string[] }` |
| **VM** | Interprets bytecode (dependency injection, closures, `try`/`catch`, `throw`, calling conventions, etc.) |
| **Obfuscator** | Obfuscation passes for the **linear** IR (exists alongside the Hyperion main path) |
| **Builder** | `HyperionBuildBundle` + esbuild browser runtime, optional `javascript-obfuscator` |
| **CLI** | `build` / `dump` / `runtime` / `all` |

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

By default uses `example/fingerprint.js` → `dist/browser/bundle.json` and `dist/browser/runtime.js` (with obfuscation).  
Without outer obfuscation:

```bash
npm run build:all:plain
```

### Export IR debug artifacts (`dump` / `ir.json` / `es5.js`)

```bash
npm run dump
```

Writes under `dist/browser/` by default (see the `dump` script in `package.json`). The same directory also receives **`ir.json`** (serialized IR) and **`es5.js`** (Babel output).

**`dump`**: human-readable IR from `HyperionCompiler#dump()` (same IR as `ir.json`). **Source vs dump** (after Babel → ES5, then compile):

```js
function add(a, b) {
  return a + b;
}

var c = add(1, 2)
```

Corresponding **`dump` excerpt** (as emitted by `HyperionCompiler`; if `c` is never read, a `Store` for `c` usually does not appear):

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

More complex control flow (loops, `phi`, `try`, etc.) expands to more basic blocks in **`dump`**; see **[ir.md](./ir.md)**.

### Debug entry during development

```bash
npm run debugger
```

---

## CLI (`npm run cli -- …`)

After `npm install` and `npm run build` to produce `dist/`, use the package CLI (see `bin` in `package.json`):

```text
twisted build   <input.js> <bundle.json> [--obfuscate]
twisted dump    <input.js> [outDir]
twisted runtime <bundle.json> <runtime.js> [--obfuscate]
twisted all     <input.js> <bundle.json> <runtime.js> [--obfuscate]
twisted help
twisted version
```

During development, for example:

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
| `npm run build:bundle` | Compile input only → `dist/browser/bundle.json` (paths are examples; see `package.json`) |
| `npm run build:runtime` | Generate browser `runtime.js` from the bundle |
| `npm run build:all` | bundle + runtime (obfuscation on by default) |
| `npm run build:all:plain` | Same without builder-side obfuscation |
| `npm run dump` | Writes **`dump`** to the output directory (default `dist/browser`; see `package.json`) |
| `npm run format` | Prettier format `src/**/*.{js,ts}` |
| `npm run format:check` | Prettier check only |
| `npm run debugger` | Run `src/debugger.ts` |

---

## Repository layout (core)

```text
twisted/
  src/
    assembler/          # HyperionAssembler / LinearAssembler → bytecode
    builder/            # HyperionBuildBundle, runtime, linear pipeline base (linear)
    compiler/           # HyperionCompiler, serialization, IR values & instructions (value/)
    obfuscator/         # IR obfuscation passes (not wired to Hyperion path yet)
    vm/                 # Bytecode interpreter and call stack
    utils/              # Helpers (e.g. bytecode)
    cli.ts              # CLI entry
    constant.ts         # Opcodes and related constants
    debugger.ts         # Debug entry
    instruction.ts      # Linear IR instruction defs (alongside Hyperion)
  example/              # Sample inputs (e.g. fingerprint)
  tests/                # Compiler / VM / obfuscator tests
  docs/                 # IR notes, this English README, todos
  public/               # Static assets if used for demos
  dist/                 # Build output (gitignored)
```

---

## ES5 syntax support (Hyperion compiler)

At build time, **`src/builder/hyperion.ts`** runs `@babel/preset-env` (`targets: { ie: "11" }`) to lower source to ES5, then **`src/compiler/hyperion.ts`** walks the AST. The tables below list statements and expressions Hyperion must still recognize **after** lowering; if Babel output contains unsupported node types, compilation fails.

### Statements

The **✅** column means the **common ES5-shaped AST** after Babel is fully supported; the notes column adds detail and does **not** mean “incomplete.”

| Syntax | Status | Notes |
|--------|:------:|-------|
| `EmptyStatement` | ✅ | `;` |
| `ExpressionStatement` | ✅ | — |
| `BlockStatement` | ✅ | — |
| `VariableDeclaration` | ✅ | `var`, single `Identifier`, optional initializer (missing → `null`); matches typical ES5 |
| `FunctionDeclaration` | ✅ | `Identifier` parameter list (as in ES5; default/rest/destructuring are non‑ES5—see boundaries below) |
| `ReturnStatement` | ✅ | May omit argument (same as `return null`) |
| `IfStatement` | ✅ | — |
| `WhileStatement` | ✅ | — |
| `DoWhileStatement` | ✅ | — |
| `ForStatement` | ✅ | `init` may be an expression or a single `VariableDeclaration` |
| `ForInStatement` | ✅ | Left-hand: single `var k` or `Identifier` (common ES5 `for-in`) |
| `SwitchStatement` | ✅ | Exit variables merged with `Phi` across cases |
| `BreakStatement` | ✅ | In loops and `switch` (normal usage) |
| `ContinueStatement` | ✅ | In loops |
| `TryStatement` | ✅ | `try` / `catch` / `finally` |
| `ThrowStatement` | ✅ | — |
| `DebuggerStatement` | ✅ | No-op (does not break to debugger) |
| Others (e.g. `LabeledStatement`, modules, classes) | ❌ | Not implemented |

### Expressions

| Syntax | Status | Notes |
|--------|:------:|-------|
| `Identifier` | ✅ | Globals, `arguments` |
| `ThisExpression` | ✅ | — |
| `NumericLiteral` / `StringLiteral` / `BooleanLiteral` / `NullLiteral` | ✅ | — |
| `CallExpression` | ✅ | Member calls use **`Apply`** (preserve `this`); others use `Call` |
| `NewExpression` | ✅ | `new` with argument list |
| `MemberExpression` | ✅ | Dot properties and `obj[key]` |
| `ArrayExpression` | ✅ | Element list; **holes** filled with `null` (differs from sparse-array semantics—see boundaries) |
| `ObjectExpression` | ✅ | Literal properties; keys are `Identifier` or literals |
| `AssignmentExpression` | ✅ | LHS: `Identifier` / `MemberExpression`; ops include `=`, `+=`, `-=`, `*=`, `/=` |
| `UpdateExpression` | ✅ | Common ES5 case: **`Identifier`** `++`/`--` (e.g. `i++`) |
| `UnaryExpression` | ✅ | `! - + ~ typeof void delete`, etc. |
| `BinaryExpression` | ✅ | Arithmetic, comparisons, `===`/`!==`, `instanceof`, `in`, bitwise and shifts |
| `LogicalExpression` | ✅ | Short-circuit `&&` / `||` (ES5 has no `??`) |
| `ConditionalExpression` | ✅ | `?:`, branch variables merged with `Phi` |
| `SequenceExpression` | ✅ | Comma expression, value of last item |
| `FunctionExpression` | ✅ | Same parameter rules as `FunctionDeclaration`; named/anonymous handled internally |

#### Boundaries and unsupported cases

These do **not** change the ✅ marks for “ES5 path complete,” but going beyond them may throw or differ from spec:

| Case | Notes |
|------|-------|
| Destructuring, `…` rest params, default params | Outside ES5 core as usually lowered; compiler does not implement these binding forms |
| `UpdateExpression` on non-`Identifier` (e.g. `arr[i]++`, `obj.x++`) | Not implemented |
| `??` (if still present in AST) | Not modeled as nullish coalescing |
| Sparse arrays `[,]` | Holes become `null`, not sparse semantics |
| `LabeledStatement`, `import` / `export`, classes | Not implemented at statement level |

---

### Runtime & build

| Capability | Status | Notes |
|------------|:------:|-------|
| Dependency injection table | ✅ | Globals declared at compile time (aligned with VM injection) |
| Browser `runtime.js` bundle | ✅ | See `npm run build:runtime` / `build:all` |
| IR obfuscation (linear IR) | ✅ | Chainable passes on the `LinearCompiler` path |

**Legend:** ✅ complete on typical ES5 paths　❌ not implemented at statement level (listed above)

More IR / opcode detail: **[ir.md](./ir.md)**.

---

## Running in the browser

The built `runtime.js` is an **IIFE**; it runs the VM in the page context (default deps `[window, console]`, matching the compile-time dependency table). There is **no** global API such as `TwistedRuntime.run`—if older docs say otherwise, trust the current build.

---

## Documentation

| Doc | Content |
|-----|---------|
| [README (中文)](../README.md) | Chinese README |
| [ir.md](./ir.md) | IR / opcode conventions |
| [todos.md](./todos.md) | Notes and backlog |

---

### TODO (excerpt)

#### Compiler / syntax

- `LabeledStatement` and fine-grained `break`/`continue` labels
- Destructuring, rest, and default parameters (needs IR and calling convention work)
- `ClassDeclaration` / `ClassExpression`
- `TemplateLiteral` (or rely on Babel lowering to string concat)
- `ImportDeclaration` / `ExportDeclaration` (module semantics)
- `MetaProperty` / `Super`, etc.

#### Project

- Keep this English README aligned with the Chinese README structure

---

## Contributing

Issues and PRs welcome. Please:

1. Add or update tests that pass **`npm test`** for features and fixes.
2. Use clear commit messages (Chinese or English).
3. For large changes, open an issue first to align with project direction.
