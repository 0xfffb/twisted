## Twisted IR（当前实现）

本项目当前使用的是**线性 IR**，不是 Block 字典 IR。

编译链路：

`JavaScript -> Babel AST -> Instruction[] -> bytecode/meta -> VM execute`

---

## IR 数据结构

`src/instruction.ts` 中定义：

```ts
interface Instruction {
  opcode: Opcode;
  args: Arg[];
}

interface Arg {
  kind: ArgKind;
  value: any;
}
```

`ArgKind` 目前主要用到：

- `String`
- `Number`
- `Dependency`
- `Property`
- `Parameter`
- `Variable`
- `DynAddr`（回填地址）

---

## Assembler 输出结构

`src/assembler/assembler.ts` 输出：

```ts
{
  bytecode: number[],
  meta: string[]
}
```

说明：

- 字符串常量/属性名会进入 `meta`
- 字节码中通过索引读取 `meta`
- `LoadMeta` 指令用于读取字符串常量

---

## 当前 opcode（摘要）

以 `src/constant.ts` 为准，当前包含：

- 栈与算术：`Push`, `Pop`, `Add`, `Sub`, `Mul`, `Div`, `Equal`
- 控制流：`Jmp`, `JmpIf`, `Halt`
- 变量：`Store`, `Load`, `LoadParameter`
- 调用/对象：`Apply`, `Construct`, `Dependency`, `Property`, `SetProperty`
- 结构构造：`BuildArray`, `BuildObject`
- 运行时：`Await`, `LoadMeta`
- 栈帧：`PushFrame`, `PopFrame`

---

## 最小示例（IR 语义）

源码：

```js
const a = 1;
const b = a + 2;
console.log(a, b);
```

编译后 IR 语义大致为：

1. `Push 1` -> `Store a`
2. `Load a` + `Push 2` + `Add` -> `Store b`
3. 构造参数数组 `[a,b]`
4. 取 `console.log`
5. `Apply`

---

## 注意事项

- 当前 IR 是线性序列，尚未引入 CFG/Block 字典。
- 文档与实现有冲突时，以 `src/compiler/compiler.ts`、`src/assembler/assembler.ts`、`src/vm/vm.ts` 为准。
- 若新增语法节点，请同步补：
  - `compileExpression/compileStatement` 分支
  - 必要 opcode
  - VM 执行分支


