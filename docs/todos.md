# Twisted TODO（当前版本）

本文档只保留“当前代码库可执行”的任务，不记录过时设计。

---

## 已完成（摘要）

- [x] 线性 IR：`Compiler` 输出 `Instruction[]`
- [x] Assembler：`Instruction[] -> { bytecode, meta }`
- [x] 字符串常量池：`meta: string[]` + `LoadMeta`
- [x] VM 基础执行链路：算术、跳转、变量、依赖、调用、构造、对象/数组构建
- [x] 属性赋值链路：`AssignmentExpression` + `SetProperty`
- [x] Builder 流程：bundle / runtime / all
- [x] runtime 打包混淆（esbuild + javascript-obfuscator）
- [x] Hyperion ES5 语法白名单 + `CompileError`（见 [syntax-whitelist.md](./syntax-whitelist.md)）
- [x] Hyperion 路径单测 + GitHub Actions CI

---

## 进行中（高优先级）

### 1) Worker 回调全链路

- [ ] 稳定支持 `worker.onmessage = <vm function>`
- [ ] 明确“宿主函数 vs VM 函数”的调用桥接策略
- [ ] 增加 Worker 场景回归样例

### 2) 路径收敛

- [ ] Linear 编译/混淆旁路标记为 experimental 或移除
- [ ] 函数值语义与闭包边界测试补齐

---

## 待办（中优先级）

### 语法边界（仍不支持）

- [ ] `LabeledStatement` 与带标签的 break/continue
- [ ] `UpdateExpression` 作用于 MemberExpression（`arr[i]++`）
- [ ] 解构 / 默认参数 / rest / 类 / 模块

### 运行时行为完善

- [ ] `execute()` 空栈返回值策略（避免 `Stack is empty` 误伤）
- [ ] `PopFrame` 无显式 return 的默认返回值策略
- [ ] 加一个 debug trace 开关（opcode/stack 快照）

### 文档与测试

- [ ] 最小浏览器 e2e（同步脚本 / Worker）

---

## 待办（低优先级）

- [ ] IR pass 管线化（normalize / obfuscate / validate）
- [ ] 更细粒度混淆档位（dev/prod）
- [ ] runtime 产物完整性校验（hash/signature）
- [ ] 生成 sourcemap（仅开发环境）

---

## 里程碑建议

- [ ] **M1（稳定链路）**：白名单 + CI（进行中/本阶段）
- [ ] **M2（Worker 可用）**：回调注册、回传打印、错误路径可观测
- [ ] **M3（路径收敛）**：只保留 Hyperion 生产路径
- [ ] **M4（加固）**：混淆策略和运行时保护分层
