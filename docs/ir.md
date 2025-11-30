## JSVMP IR 设计说明（Dict IR）

本项目的编译管线：  
**JavaScript 源码 → Babel AST → IR（本文件定义）→ Bytecode 数组 → JS VM 执行**。  
IR 同时作为**唯一中间表示 + 编码格式**，FLA、混淆等都在这一层完成。

---

## 顶层结构：Block 字典

IR 是一个以 **Block 名称为 key 的字典**：

```js
// IR: Dict<string, Block>
const ir = {
  "entry": Block,
  "loop": Block,
  // ...
};
```

- **key: `string`**  
  - Block 的名字，例如：`"entry"`, `"loop_1"`, `"fingerprint_block"` 等。
- **value: `Block`**  
  - 该 Block 的全部数据（指令列表等）。

---

## Block 结构

```js
type Block = {
  inherits: boolean,          // 是否继承上一个执行点的上下文（当前阶段统一 true，预留字段）
  tags?: string[],            // 可选，Block 级标签，用于混淆/分类（如 ['normal', 'io']）
  instructions: Instruction[] // 指令列表（线性 IR）
};
```

说明：

- **inherits**  
  - 当前阶段统一设为 `true`，表示该 Block 只是在同一执行上下文中顺序执行。  
  - 预留给以后可能的「不同执行上下文 / 闭包」等高级场景。
- **tags**（可选）
  - Block 的语义标签，用于 FLA/混淆策略控制，例如：
    - `'normal'`：普通计算逻辑
    - `'io'`：与外部交互相关（如 `console.log`、`chrome.runtime`）
    - `'fingerprint'`：指纹采集逻辑
    - `'anti-debug'`：反调试/反篡改逻辑

---

## Instruction 结构

```js
type Instruction = {
  opcode: number,  // 数值操作码，对应 VM 中的指令（如 0x00, 0x02 ...）
  args: Arg[],     // 参数列表
  tags?: string[]  // 可选，指令级标签（如 ['arith'], ['print']）
};
```

- **opcode**  
  - 使用与 VM 一致的 `u8` 数值，例如：
    - `0x00` → Push / LOAD_CONST  
    - `0x02` → Add / BINARY_ADD  
    - `0x08` → LocalStore  
    - `0x09` → LocalLoad  
    - `0x0C` → Call / CallBuiltin  
  - 具体定义在 `jsvmp/src/vm/vm.js` 中的 `this.opcodes`。

- **tags**（可选）
  - 指令级标签，例如：
    - `'arith'`：算术相关（Add/Sub/Mul/Div）
    - `'store:a'`：写局部变量 `a`
    - `'load:a'`：读局部变量 `a`
    - `'print'`：打印/日志相关
  - 方便在 FLA/混淆阶段做「按标签精细控制」。

---

## Arg 结构

```js
type Arg = {
  type: number, // 参数类型（Header），决定如何编码/解释
  value: any    // 参数值
};
```

推荐的 `type` / Header 约定（可扩展）：

```js
// Arg.type 约定（Header）
0: LOAD_UNDEFINED       // 加载 undefined，value 忽略
1: LOAD_STRING          // 加载字符串常量，value: string
2: LOAD_NUMBER          // 加载数字常量，value: number
3: POP_STACK            // 弹栈（不生成额外字节），value 忽略
4: FETCH_VARIABLE       // 读取变量，value: 变量索引（或 slot）
5: FETCH_DEPENDENCY     // 读取依赖（按需定义），value: 索引
6: FETCH_PARAMETER      // 读取参数，value: 参数索引
7: DYN_ADDR             // 动态地址 stub 标记，value: stub ID（用于回填）

// 示例中我们也会用到的高层语义别名（可与具体 Header 对应起来）：
// CONST      → LOAD_NUMBER / LOAD_STRING / LOAD_UNDEFINED
// LOCAL      → FETCH_VARIABLE / FETCH_PARAMETER
// BUILTIN    → 自定义：内建函数 ID（如 0 = console.log）
// BLOCK_REF  → 自定义：跳转目标 Block 名称（如 "entry", "loop_1"）
```

---

## 示例：`let a = 1 + 2; console.log(a);`

假设：
- `a` 分配在局部槽位 `0`；
- VM 的 opcodes 定义：
  - `0x00` = Push / LOAD_CONST
  - `0x02` = Add / BINARY_ADD
  - `0x08` = LocalStore
  - `0x09` = LocalLoad
  - `0x0C` = CallBuiltin（builtin[0] = console.log）

则对应 IR 如下：

```js
const ir = {
  "entry": {
    inherits: true,
    tags: ["normal"],
    instructions: [
      // LOAD_CONST 1
      {
        opcode: 0x00,
        args: [{ type: 0, value: 1 }],
        tags: []
      },
      // LOAD_CONST 2
      {
        opcode: 0x00,
        args: [{ type: 0, value: 2 }],
        tags: []
      },
      // BINARY_ADD -> 1 + 2
      {
        opcode: 0x02,
        args: [],
        tags: ["arith"]
      },
      // STORE_LOCAL 0 -> a = 1 + 2
      {
        opcode: 0x08,
        args: [{ type: 1, value: 0 }],
        tags: ["store:a"]
      },

      // LOAD_LOCAL 0 -> 读取 a
      {
        opcode: 0x09,
        args: [{ type: 1, value: 0 }],
        tags: ["load:a"]
      },
      // CALL_BUILTIN 0 -> console.log(a)
      {
        opcode: 0x0C,
        args: [{ type: 2, value: 0 }],
        tags: ["print"]
      }
    ]
  }
};
```

---

## 与 VM / FLA / 混淆的关系

- **VM 层**  
  - 最终只需要线性 bytecode 数组，例如 `[0x00, 1, 0x00, 2, 0x02, 0x08, 0, 0x09, 0, 0x0C, 0]`。  
  - 可以通过简单的「展开函数」从 IR 转成 bytecode。

- **FLA / 混淆层**  
  - 全部在本 IR 结构上操作：  
    - 按 Block 重排 / 拆分 / 合并；  
    - 在 `instructions` 中插入垃圾指令；  
    - 修改 `Arg`（例如常量编码、跳转目标改为状态机）；  
    - 根据 `tags` 对不同逻辑块施加不同强度的混淆。
  - CFG 可在需要时从 IR 的 `instructions` 动态推导，而不固定存储在 IR 里。

本文件描述的 Dict IR 是当前 jsvmp/encoder 的**唯一 IR 规范**，后续设计/实现 Pass 时请保持与此结构对齐。


