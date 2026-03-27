# Twisted TODO（当前版本）

本文档只保留“当前代码库可执行”的任务，不记录过时设计。

---

## 已完成（摘要）

- [x] 线性 IR：`Compiler` 输出 `Instruction[]`
- [x] Assembler：`Instruction[] -> { bytecode, meta }`
- [x] 字符串常量池：`meta: string[]` + `LoadMeta`
- [x] VM 基础执行链路：算术、跳转、变量、依赖、调用、构造、对象/数组构建
- [x] 属性赋值链路：`AssignmentExpression` + `SetProperty`
- [x] Builder 流程：
  - [x] `build:bundle` 生成 `dist/runtime/bundle.json`
  - [x] `build:runtime` 打包 `dist/browser/runtime(.esm).js`
  - [x] `build:runtime:all` 端到端
- [x] runtime 打包混淆（esbuild + javascript-obfuscator）

---

## 进行中（高优先级）

### 1) Worker 回调全链路

- [ ] 稳定支持 `worker.onmessage = <vm function>`
- [ ] 明确“宿主函数 vs VM 函数”的调用桥接策略
- [ ] 增加 Worker 场景回归样例（`files/runtime_input.js`）

### 2) 函数值语义收敛

- [ ] 明确是否长期支持 `FunctionExpression / ArrowFunctionExpression`
- [ ] 若不支持，固定“受限语法白名单”并在编译阶段给出友好错误
- [ ] 若支持，补齐最小闭包语义与边界测试

---

## 待办（中优先级）

### 语法节点补齐（按阻塞度）

- [ ] `ArrayExpression`（当前会阻塞 `new Blob([code], ...)`）
- [ ] `NullLiteral`
- [ ] `UnaryExpression`
- [ ] `LogicalExpression`
- [ ] `ConditionalExpression`
- [ ] 更多比较运算符（`> < >= <= != !==`）

### 运行时行为完善

- [ ] `execute()` 空栈返回值策略（避免 `Stack is empty` 误伤）
- [ ] `PopFrame` 无显式 return 的默认返回值策略
- [ ] 加一个 debug trace 开关（opcode/stack 快照）

### 文档与测试

- [ ] 增加“当前支持 AST 节点”清单（自动从代码导出或手工维护）
- [ ] 增加最小 e2e 测试：
  - [ ] 同步脚本执行
  - [ ] async/await 基础
  - [ ] Worker 基础发送

---

## 待办（低优先级）

- [ ] IR pass 管线化（normalize / obfuscate / validate）
- [ ] 更细粒度混淆档位（dev/prod）
- [ ] runtime 产物完整性校验（hash/signature）
- [ ] 生成 sourcemap（仅开发环境）

---

## 里程碑建议

- [ ] **M1（稳定链路）**：固定语法子集 + e2e 可重复
- [ ] **M2（Worker 可用）**：回调注册、回传打印、错误路径可观测
- [ ] **M3（语法扩展）**：补齐指纹常用节点（Array/Unary/Logical）
- [ ] **M4（加固）**：混淆策略和运行时保护分层
