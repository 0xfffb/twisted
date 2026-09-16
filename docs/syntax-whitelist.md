# ES5 语法白名单（Hyperion 生产路径）

输入脚本必须是 **ES5 语法**。构建**不再**使用 Babel `@babel/preset-env` 降级；
`@babel/parser` 仅用于解析 AST。行列号对应源码本身。

权威实现：[`src/compiler/whitelist.ts`](../src/compiler/whitelist.ts)。
编译错误类型：[`src/compiler/error.ts`](../src/compiler/error.ts)。

## 构建前检查

```bash
npm run cli -- check path/to/business.js
# 多个文件
npm run cli -- check a.js b.js
```

成功输出 `OK <path>`，失败打印 `CompileError[...]` 并以 exit code 1 退出（不写 bundle）。

## 支持的 Statement

`VariableDeclaration`（**仅 `var`**）、`BlockStatement`、`ExpressionStatement`、`FunctionDeclaration`、
`ReturnStatement`、`TryStatement`、`IfStatement`、`WhileStatement`、`ForStatement`、
`BreakStatement`、`ContinueStatement`、`DoWhileStatement`、`ForInStatement`、
`SwitchStatement`、`ThrowStatement`、`EmptyStatement`、`DebuggerStatement`

## 支持的 Expression

`BinaryExpression`、`NumericLiteral`、`StringLiteral`、`BooleanLiteral`、`NullLiteral`、
`Identifier`、`CallExpression`、`FunctionExpression`、`UnaryExpression`、`UpdateExpression`、
`ArrayExpression`、`ObjectExpression`、`AssignmentExpression`、`LogicalExpression`、
`ConditionalExpression`、`SequenceExpression`、`NewExpression`、`MemberExpression`、
`ThisExpression`

## 额外语义限制

| 规则 | 说明 |
|------|------|
| 变量声明 | 仅 `var`（拒绝 `let` / `const`） |
| UpdateExpression | 仅 `Identifier`（拒绝 `arr[i]++` / `obj.x++`） |
| 函数形参 | 仅 `Identifier`（拒绝默认参数 / 解构 / rest） |
| 赋值左值 | 仅 `Identifier` \| `MemberExpression` |
| 变量绑定 | 仅 `Identifier` |

## 明确拒绝（示例）

`LabeledStatement`、`ClassDeclaration`、`ImportDeclaration`、`ExportDeclaration`、
`ArrowFunctionExpression`、`async`/`await` 语法

异步请用 **回调** 或 **`Promise.then`**（语法仍为 ES5；`Promise` 为运行时 API）。

## 错误格式

```text
CompileError[TWISTED_UNSUPPORTED_VAR_KIND]: VariableDeclaration kind "let" is not supported; only var is allowed (line 1, column 0)
```
