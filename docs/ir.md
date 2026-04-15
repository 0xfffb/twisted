## Twisted IR（当前实现）

仓库里并存两套中间表示，**默认构建链路（`npm run build:bundle` / CLI `build`）使用 Hyperion IR**；线性 IR 仍供 `LinearCompiler` 与部分混淆 Pass 使用。

| 路径 | 编译器 | IR 形态 | 汇编器 |
|------|--------|---------|--------|
| **Hyperion（主路径）** | `HyperionCompiler` | 模块 + 函数 + **基本块** + SSA 风格指令 | `HyperionAssembler` |
| **Linear（兼容）** | `LinearCompiler` | `Instruction[]` 线性序列 | `LinearAssembler` |

整体数据流（Hyperion）：

`JavaScript → Babel 降 ES5 → AST → IRModule → JSON / 文本 dump → bytecode + meta → VM`

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

## 线性 IR（Linear）

`src/instruction.ts` 中仍为**栈机式线性指令**：

```ts
interface Instruction {
  opcode: Opcode;
  args: Arg[];
}
```

`ArgKind`：`String`、`Number`、`Dependency`、`Property`、`Parameter`、`Variable`、`DynAddr` 等。

用于 **`LinearCompiler` → `LinearAssembler`**，可与 `src/obfuscator/` 内面向该 IR 的 Pass 组合。

---

## 汇编输出

两种 Assembler 均实现 `assemble(...) → AssemblerBundle`（`src/assembler/base.ts`）：

```ts
interface AssemblerBundle {
  bytecode: number[];
  meta: string[];
}
```

字符串常量、属性名等进入 **`meta`**，字节码里通过索引引用（如 `LoadMeta` 一类操作在 VM 侧消费）。

---

## Opcode（`src/constant.ts`）

虚拟机字节码枚举 **`Opcode`** 为单一真源，与 `HyperionAssembler` / `src/vm/` 解释器一致。当前包含（摘抄分类）：

- **栈与字面量**：`Push`、`Pop`、`PushNull`、`LoadMeta`
- **算术与比较**：`Add`、`Sub`、`Mul`、`Div`、`Mod`、`Equal`；`LessThan`、`LessThanOrEqual`、`GreaterThan`、`GreaterThanOrEqual`
- **位与移位**：`BitAnd`、`BitOr`、`BitXor`、`ShiftLeft`、`ShiftRight`、`ShiftRightUnsigned`
- **逻辑与一元**：`Not`、`Typeof`、`UnaryPlus`、`BitNot`、`Void`
- **控制流**：`Jmp`、`JmpIf`、`Halt`
- **变量与帧**：`Store`、`Load`、`LoadParameter`、`PushFrame`、`PopFrame`
- **调用与对象**：`Apply`、`Construct`、`Dependency`、`Property`、`SetProperty`、`GetElement`、`SetElement`、`InvokeValue`
- **闭包**：`MakeClosure`、`LoadCapture`
- **结构**：`BuildArray`、`BuildObject`
- **异步（线性路径等）**：`Await`
- **其它**：`Arguments`、`ForInInit`、`ForInHas`、`ForInNext`、`DeleteProp`、`DeleteElem`、`Throw`、`LandingPad`、`Debugger`

新增语义时须同步：**常量枚举、`OPCODE_NAMES`、Hyperion 汇编、VM 分发**。

---

## 调试产物

| 文件 | 说明 |
|------|------|
| **`dump`** | `IRModule.dump()` 文本，人类可读（见 README 示例） |
| **`ir.json`** | `HyperionSerializer.serializeModuleToJson(module)`，与 IR 一一对应的 JSON |

由 `npm run dump` 或 `HyperionDump` 写出（见 `src/builder/hyperion.ts`）。

---

## 注意事项

- **主路径**以 **`HyperionCompiler`、`serialize.ts`、`assembler/hyperion.ts`、`vm/`** 为准。
- 线性 IR 以 **`instruction.ts`、`compiler/linear.ts`、`assembler/linear.ts`** 为准。
- 文档与代码冲突时，以仓库内实现为准；扩展语法时请同步编译器、序列化、汇编与 VM。
