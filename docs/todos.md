# Twisted VM 开发任务清单

## 📊 进度总览
- ✅ 已完成：18 项
- 🚧 进行中：1 项（函数支持）
- ⏳ 待完成：16 项
- 总计：35 项

---

## ✅ 已完成功能

### 1. 核心架构
- [x] 栈式虚拟机基础架构
- [x] 程序计数器 (PC) 管理
- [x] 字节码读取器 (BytecodeReader)
  - read() - 读取并前进 PC
  - jump() - 跳转到指定位置
  - peek() - 查看当前字节码
  - hasNext() - 检查是否有下一条指令
- [x] Frame 栈管理 (Context)
  - pushFrame() - 压入栈帧
  - popFrame() - 弹出栈帧
  - frame getter - 获取当前栈帧
- [x] Frame 结构
  - Stack - 操作数栈
  - Variables - 变量存储
  - parameters 字段
  - tracebackPc 字段（已定义但无 getter/setter）

### 2. VM 已实现的指令

#### 栈操作
- [x] `Push` (0x00) - 压栈操作
- [x] `Pop` (0x01) - 弹栈操作

#### 算术运算
- [x] `Add` (0x02) - 加法（仅支持 number）
- [x] `Sub` (0x03) - 减法（仅支持 number）
- [x] `Mul` (0x04) - 乘法（仅支持 number）
- [x] `Div` (0x05) - 除法（仅支持 number）

#### 比较运算
- [x] `Equal` (0x06) - 相等比较（支持任意类型）

#### 控制流
- [x] `Jmp` (0x07) - 无条件跳转
- [x] `JmpIf` (0x08) - 条件跳转

#### 变量操作
- [x] `Store` (0x09) - 存储变量
- [x] `Load` (0x0a) - 加载变量

#### 依赖和调用
- [x] `Dependency` (0x0c) - 加载外部依赖
- [x] `Property` (0x0d) - 属性访问
- [x] `Call` (0x0b) - 函数调用（⚠️ 仅支持原生 JS 函数）

### 3. Opcode 已定义但未实现
- [x] `PushFrame` (0x0e) - 已定义，计划由 Call 指令内部使用
- [x] `PopFrame` (0x0f) - 已定义，计划由 Return 指令内部使用
- [x] `Halt` (0x10) - 已定义，未实现（VM 不处理）

### 4. 编译器已支持的语法

#### 表达式
- [x] `NumericLiteral` - 数字字面量
- [x] `Identifier` - 标识符
- [x] `BinaryExpression` - 二元表达式 (+, -, ==, ===)
- [x] `MemberExpression` - 成员访问（如 window.console）
- [x] `CallExpression` - 函数调用表达式

#### 语句
- [x] `VariableDeclaration` - 变量声明（const/let/var）
- [x] `ExpressionStatement` - 表达式语句
- [x] `IfStatement` - if-else 语句（完整实现）
- [x] `BlockStatement` - 块语句

### 5. 汇编器 (Assembler)
- [x] IR → Bytecode 转换
- [x] Bulldozer 回填机制
- [x] 所有 ArgKind 支持

### 6. 作用域管理（基础）
- [x] Scope 类（单层作用域）
- [x] Variables 映射（name → index）
- [x] declare() / resolve() 方法

---

## 🚧 进行中

### 函数支持（核心功能）
编译器已添加节点导入，但实现不完整：
- [x] `FunctionDeclaration` 节点类型导入
- [x] `ReturnStatement` 节点类型导入
- [ ] 实际编译逻辑（只有空壳）

---

## ⏳ 待完成功能

### 🔴 高优先级 - 完成函数支持

#### 1. BytecodeReader 增强 ⚠️ 关键
- [ ] 添加 `getPC(): number` 方法 - Call 指令需要获取当前 PC 作为返回地址

#### 2. Frame 增强 ⚠️ 关键
- [ ] 添加 `setTracebackPC(pc: number)` 方法
- [ ] 添加 `getTracebackPC(): number` 方法
- [ ] 添加 `setParameters(params: any[])` 或 `setParameter(index, value)` 方法
- [ ] 完善 parameters 的使用逻辑

#### 3. VM 新增指令 ⚠️ 关键
- [ ] 添加 `Return` Opcode (0x11) 到 constant.ts
- [ ] 实现 `Return` 指令
  - 读取返回值（从栈顶）
  - 读取 tracebackPC
  - 调用 context.popFrame()
  - jump(tracebackPC)
  - 将返回值压入调用者栈
- [ ] 重构 `Call` 指令 - 支持 VM 函数
  - 区分原生函数（function）和 VM 函数（number 地址）
  - 对 VM 函数：创建 Frame + 设置 tracebackPC + 设置参数 + pushFrame + jump
  - 对原生函数：直接调用并将返回值压栈

#### 4. 编译器完善函数支持 ⚠️ 关键
- [ ] 完整实现 `compileFunctionDeclaration`
  - 使用 Label 标记函数开始/结束
  - 用 Jmp 跳过函数体
  - 进入新作用域（context.enter()）
  - 处理参数声明
  - 编译函数体
  - 添加隐式 return（如果需要）
  - 退出作用域（context.exit()）
  - 将函数地址（Label）压栈并存储到变量
- [ ] 完整实现 `compileReturnStatement`
  - 编译返回值表达式（如果有）
  - 如果没有返回值，压入 undefined
  - 生成 Return 指令

#### 5. 编译器作用域增强 🟡
- [ ] 实现 Context.enter() / exit() 方法 - 支持作用域栈
- [ ] 支持块作用域（let/const）
- [ ] 作用域链查找

---

### 🟡 中优先级 - 数据类型和运算符

#### 数据类型支持
- [ ] `StringLiteral` - 字符串字面量
- [ ] `BooleanLiteral` - 布尔字面量
- [ ] `NullLiteral` / `Undefined` - null/undefined
- [ ] `ArrayExpression` - 数组字面量 `[1, 2, 3]`
- [ ] `ObjectExpression` - 对象字面量 `{a: 1}`

#### 更多运算符
- [ ] 比较运算符：`>`, `<`, `>=`, `<=`, `!=`, `!==`
- [ ] 逻辑运算符：`&&`, `||`, `!`
- [ ] 其他运算符：`%` 等

#### 字符串操作
- [ ] 字符串拼接（+ 运算符需要类型判断）
- [ ] 模板字符串

---

### 🟢 低优先级 - 高级特性

#### 循环语句（VM 已支持，需编译器实现）
- [ ] `ForStatement` - for 循环
- [ ] `WhileStatement` - while 循环
- [ ] `DoWhileStatement` - do-while 循环
- [ ] `break` / `continue` 语句

#### 函数进阶特性
- [ ] `FunctionExpression` - 函数表达式
- [ ] `ArrowFunctionExpression` - 箭头函数
- [ ] 闭包支持
- [ ] `this` 绑定
- [ ] `arguments` 对象

#### 对象和数组操作
- [ ] 动态属性读取 `obj[key]`
- [ ] 动态属性设置 `obj[key] = value`
- [ ] 创建对象/数组指令
- [ ] 数组索引访问

#### 异常处理
- [ ] `Throw` - 抛出异常
- [ ] `Try` / `Catch` / `Finally`
- [ ] 异常栈回溯

#### 异步支持
- [ ] `async` / `await`
- [ ] Promise
- [ ] Generator 函数

---

## 🚧 当前工作重点（优先级排序）

### 第 1 步：准备工作（30分钟）
1. [ ] 添加 `Return` Opcode (0x11) 到 constant.ts
2. [ ] 实现 `Frame.setTracebackPC()` / `getTracebackPC()`
3. [ ] 实现 `BytecodeReader.getPC()`
4. [ ] 实现 `Frame.setParameter()` 或 `setParameters()`

### 第 2 步：VM 函数支持（1-2小时）
5. [ ] 实现 `Return` 指令
6. [ ] 重构 `Call` 指令（区分 VM 函数和原生函数）

### 第 3 步：编译器函数支持（2-3小时）
7. [ ] 完整实现 `compileFunctionDeclaration`
8. [ ] 完整实现 `compileReturnStatement`
9. [ ] 完善 Context 的 enter()/exit() 方法

### 第 4 步：测试验证（1小时）
10. [ ] 测试简单函数调用
11. [ ] 测试带参数的函数
12. [ ] 测试递归函数
13. [ ] 测试嵌套函数调用

---

## 📝 设计决策记录

### ✅ 已确定的设计

#### 1. 函数实现方式：tracebackPC + Label
- 使用 Label 标记函数起始位置
- 使用 tracebackPC 保存返回地址
- 在 Return 指令中修改 PC（不在 popFrame 中）
- 不单独使用 EnterFunction/PushFunction 指令
- Frame 管理直接在 Call/Return 指令中完成

#### 2. 作用域管理：编译时处理
- 编译器维护作用域栈
- 运行时使用扁平变量表
- 不在 Jmp/JmpIf 时创建新 Frame
- 只在函数调用时创建新 Frame

#### 3. PC 修改位置：Return 指令
- Return 指令负责 PC 跳转
- popFrame() 只负责栈管理
- 符合单一职责原则

#### 4. Frame 管理策略：集成到 Call/Return
- Call 指令：创建 Frame + pushFrame + 设置 tracebackPC + jump
- Return 指令：获取返回值 + popFrame + 恢复 PC
- PushFrame/PopFrame Opcode 保留但不直接使用（预留扩展）

#### 5. 函数地址表示：使用 number
- 函数编译为字节码中的一段
- 函数"值"是其起始地址（number 类型）
- Call 指令通过 `typeof callee` 区分 VM 函数和原生函数

### 🤔 待决策
- [x] ~~是否使用 EnterFunction/PushFunction 指令~~ → **不使用**
- [ ] 是否需要常量池（暂时不需要）
- [ ] 是否需要函数表（暂时不需要）
- [ ] 闭包实现方式（后期考虑）
- [ ] 参数传递方式：通过 Frame.parameters 还是直接设置到 variables？

---

## 🐛 已知问题

### 1. Call 指令限制 ⚠️ 关键
- 当前只支持原生 JS 函数（如 console.log）
- 不支持 VM 函数调用
- 没有 Frame 切换逻辑

### 2. 函数编译不完整 ⚠️ 关键
- `FunctionDeclaration` 只有空壳实现
- `ReturnStatement` 只编译表达式，没有生成 Return 指令
- 没有处理函数参数
- 没有处理作用域

### 3. 类型检查问题
- 算术运算只支持 number 类型
- 需要支持字符串拼接（+ 运算符）
- 缺少类型转换逻辑

### 4. 作用域限制
- 只有单一扁平作用域
- 不支持块作用域（let/const 语义不完整）
- 不支持闭包

### 5. 错误处理不足
- 缺少详细的错误信息
- 没有栈回溯信息
- 调试体验需要改进

---

## 📚 参考资料

### 主流虚拟机实现
- **CPython** (Python VM) - 栈式，基于字节码
- **JVM** (Java Virtual Machine) - 栈式，静态类型
- **V8** (JavaScript Engine) - JIT编译，内联缓存
- **Lua VM** - 栈式，简洁高效

### 关键概念
- **栈式虚拟机** vs 寄存器式虚拟机
- **Frame (栈帧)** vs Scope (作用域)
- **tracebackPC** (返回地址) - 函数返回的关键
- **Label + 回填** - 跳转地址的延迟绑定
- **调用约定** - 参数传递、返回值处理

---

## 🎯 里程碑

- [x] **M1**: 基础 VM 架构（已完成）✅
  - 栈式 VM
  - 基础指令集
  - 变量管理
  
- [ ] **M2**: 函数调用支持（进行中）🚧
  - Return 指令
  - Call 指令重构
  - 函数编译
  - **预计完成时间：1-2 天**
  
- [ ] **M3**: 完整数据类型支持
  - 字符串、布尔、null/undefined
  - 数组和对象字面量
  - 类型转换
  
- [ ] **M4**: 循环和高级控制流
  - for/while/do-while
  - break/continue
  - switch
  
- [ ] **M5**: 高级特性
  - 闭包
  - 异常处理
  - async/await

---

## 📈 完成度评估

| 模块 | 完成度 | 状态 | 备注 |
|------|--------|------|------|
| **VM 核心** | 85% | 🟢 | 基础指令完整，缺函数返回 |
| **BytecodeReader** | 95% | 🟢 | 功能完整，缺 getPC() |
| **Frame/Context** | 90% | 🟢 | 结构完整，缺 tracebackPC 方法 |
| **编译器 - 基础** | 75% | 🟡 | 表达式/语句完整 |
| **编译器 - 函数** | 10% | 🔴 | 只有空壳 |
| **编译器 - 作用域** | 40% | 🔴 | 只有单层作用域 |
| **汇编器** | 95% | 🟢 | 基本完整 |
| **整体可用性** | 60% | 🟡 | 能运行简单代码，不支持函数 |

---

## 🎓 测试用例

### 当前可运行 ✅
- 变量声明和赋值
- 算术运算（+, -, *, /）
- 比较运算（==, ===）
- if-else 条件语句
- 调用原生 JS 函数（console.log 等）
- 成员访问（window.console）

### 当前无法运行 ❌
- 函数定义和调用
- return 语句
- 递归函数
- 函数参数传递
- 闭包

---

*最后更新：2026-01-13*
*下一步：实现函数调用支持*
