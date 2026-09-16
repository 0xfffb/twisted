## Twisted IR（当前实现）

生产路径只保留 **Hyperion IR**。

| 路径 | 编译器 | IR 形态 | 汇编器 |
|------|--------|---------|--------|
| **Hyperion（唯一生产路径）** | `HyperionCompiler` | 模块 + 函数 + **基本块** + SSA 风格指令 | `HyperionAssembler` |

整体数据流：

`JavaScript (ES5) → AST → IRModule → JSON / 文本 dump → 栈式 Instruction[] → bytecode + meta → VM`

---

## Hyperion IR

### 模块与函数

根结构为 **`IRModule`**（`src/compiler/module.ts`）：

- `name`：模块名（如 `hyperion`）
- `globals`：全局变量列表
- `functions`：函数列表，每个 **`IRFunction`** 含：
  - `name`、`params`（含槽位与名字）
  - `blocks`：**基本块**数组；每块有 `name`、`id`、可选 `unwindTo`（异常展开目标）、`instructions`、`terminator`

控制流由块的 **终结器（terminator）** 表达，而不是把 `Jmp` 混成普通指令（序列化时终结器在块末尾）。

### 值的引用（序列化）

`HyperionSerializer`（`src/compiler/serialize.ts`）把 `Value` 写成 JSON 时，常见 **`kind`** 如下：

| kind | 含义 |
|------|------|
| `const` | `{ kind: "const", value: JsonValue }` |
| `arg` | `{ kind: "arg", index, name }` |
| `reg` | `{ kind: "reg", id }` 指向某条指令的结果 |
| `fn` | `{ kind: "fn", name }` |
| `block` | `{ kind: "block", id, name }` |
| `global` | `{ kind: "global", name, init }` |

### 指令（instructions）

指令类定义在 `src/compiler/value/instruction/`。序列化后的 **`kind`** 与语义概要：

| kind | 说明 |
|------|------|
| `Binary` | 二元运算；`op` 为 `Add` / `Sub` / `Mul` / `Div` / `Mod` / 位运算 / `Equal` / 比较 / `Instanceof` / `In` 等（见 `BinaryInstructionKind`） |
| `Unary` | 一元运算；`op` 为字符串（如 `typeof`、`!` 对应实现） |
| `Phi` | SSA φ；`incoming`: `{ block, value }[]` |
| `Call` | 直接调用：`callee` + `args` |
| `Apply` | 方法调用：显式 `thisVal` + `func` + `args`（保留 `this`） |
| `Load` / `Store` | 局部槽 `slot` |
| `Array` / `Object` | 字面量构造 |
| `New` | `new callee(...args)` |
| `GlobalRef` | 全局名 |
| `This` / `Arguments` | `this` / `arguments` |
| `ForInInit` / `ForInHas` / `ForInNext` | `for...in` 迭代状态机 |
| `GetProp` / `GetElem` / `SetProp` / `SetElem` | 属性读写 |
| `DeleteProp` / `DeleteElem` | `delete` |
| `MakeClosure` / `LoadCapture` | 闭包与捕获槽 |
| `LandingPad` | 异常 landing pad（与 `try` Lowering 配合） |

未知指令会退化为 `{ kind: "UnknownInstr", id, repr }`（`repr` 来自 `instr.dump()`）。

### 终结器（terminators）

| kind | 字段 |
|------|------|
| `Branch` | `cond`，`ifTrue` / `ifFalse` 为**目标块名字符串** |
| `Jmp` | `dest` |
| `Return` | `value` |
| `Unreachable` | — |
| `Throw` | `value` |

---

## 栈式指令缓冲（Assembler 内部）

`HyperionAssembler` 将 SSA IR **降低**为 `src/instruction.ts` 中的栈机式指令序列，再编码为 `bytecode`：

```ts
interface Instruction {
  opcode: Opcode;
  args: Arg[];
}
```

`ArgKind`：`String`、`Number`、`Dependency`、`Property`、`Parameter`、`Variable`、`DynAddr` 等。

（旧的独立 `LinearCompiler` / IR obfuscator 已移除。）

---

## 汇编输出

`HyperionAssembler.assemble(...) → AssemblerBundle`（`src/assembler/base.ts`）：

```ts
interface AssemblerBundle {
  bytecode: number[];
  meta: string[];
}
```

字符串常量、属性名等进入 **`meta`**，字节码里通过索引引用（如 `LoadMeta` 一类操作在 VM 侧消费）。

---

## 字节码加固（可选）

`HyperionBuildBundle(..., { obfuscate: true })` 在 assemble 之后走 `src/obfuscator`：

```text
PlainBundle → Obfuscator(Pass…) → HardenedBundle
```

**`HardenedBundle`**（`src/obfuscator/types.ts`）：

```ts
interface HardenedBundle {
  bytecode: number[];
  meta: string[] | number[][];  // MetaEncrypt 后为加密块
  protection: {
    version: 1;
    seed: string;               // 仅落盘 seed；map/key 运行时由 Seed 派生
    features: { opcodeRemap: boolean; metaEncrypt: boolean };
  };
}
```

当前 Pass：`OpcodeRemapPass`、`MetaEncryptPass`。VM 通过 `RuntimeProtection`（`src/obfuscator/runtime.ts`）在加载时还原 opcode 映射并解密 meta。

CLI：`twisted build --obfuscate` / `twisted all --obfuscate`（build 阶段）。外层 JS 混淆见 README 中 `runtime --obfuscate` 说明。

---

## Opcode（`src/constant.ts`）

虚拟机字节码枚举 **`Opcode`** 为单一真源，与 `HyperionAssembler` / `src/vm/` 解释器一致。当前包含（摘抄分类）：

- **栈与字面量**：`Push`、`Pop`、`PushNull`、`LoadMeta`
- **算术与比较**：`Add`、`Sub`、`Mul`、`Div`、`Mod`、`Equal`；`LessThan`、`LessThanOrEqual`、`GreaterThan`、`GreaterThanOrEqual`
- **位与移位**：`BitAnd`、`BitOr`、`BitXor`、`ShiftLeft`、`ShiftRight`、`ShiftRightUnsigned`
- **逻辑与一元**：`Not`、`Typeof`、`UnaryPlus`、`BitNot`、`Void`
- **控制流**：`Jmp`、`JmpIf`、`Halt`
- **变量与帧**：`Store`、`Load`、`LoadParameter`、`LoadThis`、`PushFrame`、`PopFrame`
- **调用与对象**：`Apply`、`Construct`、`Dependency`、`Property`、`SetProperty`、`GetElement`、`SetElement`、`InvokeValue`
- **闭包**：`MakeClosure`、`LoadCapture`
- **结构**：`BuildArray`、`BuildObject`
- **其它**：`Arguments`、`ForInInit`、`ForInHas`、`ForInNext`、`DeleteProp`、`DeleteElem`、`Throw`、`LandingPad`、`Debugger`（`Await` 枚举仍保留但 VM 同步模式下会拒绝）

新增语义时须同步：**常量枚举、`OPCODE_NAMES`、Hyperion 汇编、VM 分发**。

---

## 调试产物

| 文件 | 说明 |
|------|------|
| **`dump`** | `IRModule.dump()` 文本，人类可读（见 README 示例） |
| **`ir.json`** | `HyperionSerializer.serializeModuleToJson(module)`，与 IR 一一对应的 JSON |

由 `npm run cli -- dump` 或 `HyperionDump` 写出（见 `src/builder/hyperion.ts`）。

---

## 注意事项

- **生产路径**以 **`HyperionCompiler`、`serialize.ts`、`assembler/hyperion.ts`、`vm/`** 为准。
- 文档与代码冲突时，以仓库内实现为准；扩展语法时请同步编译器、序列化、汇编与 VM。
