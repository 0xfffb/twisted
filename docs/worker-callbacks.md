# Worker 宿主回调约定

Twisted VM 闭包（`MakeClosure`）是**真实同步 JS 函数**，可挂到 Worker 事件上。  
VM **不**实现 `MessageEvent` 或自动 `postMessage`；由业务脚本按 ES5 写法显式处理。

## 依赖注入

| 环境 | `dependencies[0]` | 说明 |
|------|-------------------|------|
| 主线程 runtime | `window` | 默认 `new VM(..., [window, console])` |
| Worker runtime | `self`（WorkerGlobalScope） | 打包 Worker 版 runtime 时注入 |

顶层脚本 `this` 对齐 `dependencies[0]`（与主线程一致）。

## 注册回调

```js
// Worker 内业务脚本（ES5）
worker.onmessage = function (e) {
  var data = e.data;
  // ...
  worker.postMessage({ ok: true, result: data });
};
```

- `onmessage` 赋值为 VM 闭包即可；宿主调用时走 `executeClosure`，**保留 `this`**。
- 若需指定 `this`：`fn.call(worker)` 或方法调用形式。

## 参数与返回值

| 项 | 约定 |
|----|------|
| 入参 | 宿主传入的标准 JS 参数（如 `onmessage(e)` 的 `e`），VM 不包装 |
| 返回值 | 同步 return 只回到**直接 JS 调用方**；要通知对端须业务里显式 `postMessage` |
| 抛错 | VM 内 `throw` 由宿主调用栈抛出；Worker 侧用 `try/catch` 或 `worker.onerror` |

## 与主线程差异

- Worker 无 `window`；访问全局用注入的 `self` / `dependencies`。
- 跨线程传对象遵守 structured clone；VM 闭包**不能**通过 `postMessage` 传到另一线程（需在该线程重新编译或传数据）。

## 与 Promise / 异步

- VM **同步**；`Promise.then(vmFn)` 与 `onmessage = vmFn` 同属「宿主稍后调 JS 函数」。
- 异步完成后的回调仍须业务脚本写 `.then(function (...) { ... })` 或嵌套回调。

## 不建议

- 指望 VM 自动把 return 值 `postMessage` 出去。
- 在 VM 内实现 Worker 协议（应由业务 ES5 + 宿主 API 完成）。

## 参考测试

主线程 `this` / 宿主回调见 `tests/this-binding.test.ts`。  
Worker 场景建议本地用真实 Worker + hardened runtime 手动验证；单测可用 fake `{ postMessage, onmessage }` 对象模拟。
