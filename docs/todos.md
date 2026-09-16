# Twisted TODO

只记录当前代码库相关的待办；已完成项见 git 历史。

---

## 已完成（摘要）

- [x] Hyperion ES5 白名单 + `CompileError` + `twisted check`
- [x] 单测 + CI / Pages 每次重建 `public/runtime.js`
- [x] 去 Babel；同步 VM；宿主 `this` 约定与单测
- [x] 生产路径收敛：仅 Hyperion（Linear / 旧 IR obfuscator 已移除）
- [x] 字节码加固：`src/obfuscator`（Opcode 置换 + meta 加密）
- [x] CLI `bench`；本地体积 / 执行 benchmark
- [x] Worker 宿主回调约定文档（[`worker-callbacks.md`](./worker-callbacks.md)）

---

## 待办

### 高优先级

- [ ] Worker 真机/单测样例（约定已写，缺 `example/worker.js` 与 fake worker 测试）
- [ ] 生产默认 hardened 构建（`build:pages` 是否加 `--obfuscate` 待定）
- [ ] 服务端挑战 / 验签（防复现，非 VM 内能力）

### 中优先级

- [ ] 语法扩展：`LabeledStatement`；`UpdateExpression` on MemberExpression
- [ ] 解构 / 默认参数 / rest / 类 / 模块
- [ ] `execute()` 空栈、`PopFrame` 默认返回值策略
- [ ] debug trace 开关（opcode / stack 快照）

### 低优先级

- [ ] bytecode 完整性校验 Pass（hash / signature）
- [ ] CLI 拆分 `--harden` 与外层 `--obfuscate`
- [ ] 混淆 / 构建档位（dev / prod）
- [ ] sourcemap（仅开发）

---

## 不做 / 暂缓

- 自动化浏览器 e2e（手动验证即可）
- 复活 Linear 编译器或 AST 级 OLLVM
- Rust VM / WASM（非当前目标）
