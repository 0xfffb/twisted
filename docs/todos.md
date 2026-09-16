# Twisted TODO（当前版本）

本文档只保留“当前代码库可执行”的任务，不记录过时设计。

---

## 已完成（摘要）

- [x] Hyperion ES5 白名单 + `CompileError`
- [x] Hyperion 路径单测 + GitHub Actions CI / Pages 每次重建 runtime
- [x] 去 Babel；同步 VM
- [x] Hyperion 生产路径收敛：移除 LinearCompiler / LinearAssembler / IR obfuscator
- [x] runtime 打包混淆（esbuild + javascript-obfuscator）

---

## 进行中（高优先级）

### 1) Worker 回调全链路

- [ ] 稳定支持 `worker.onmessage = <vm function>`
- [ ] 明确“宿主函数 vs VM 函数”的调用桥接策略
- [ ] 增加 Worker 场景回归样例

### 2) 路径收敛

- [x] 移除 Linear 编译/混淆旁路，生产只留 Hyperion

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
