# ES5 语法白名单（Hyperion 生产路径）

白名单以 **Babel `@babel/preset-env`（`targets: { ie: "11" }`）降级之后** 的 AST 为准。
行列号报错对应的是降级后的源码位置，**不会**自动映射回 Babel 前的原始行号。

权威实现：[`src/compiler/whitelist.ts`](../src/compiler/whitelist.ts)。
编译错误类型：[`src/compiler/error.ts`](../src/compiler/error.ts)。

## 支持的 Statement

`VariableDeclaration`、`BlockStatement`、`ExpressionStatement`、`FunctionDeclaration`、
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
| UpdateExpression | 仅 `Identifier`（拒绝 `arr[i]++` / `obj.x++`） |
| 函数形参 | 仅 `Identifier`（拒绝默认参数 / 解构 / rest） |
| 赋值左值 | 仅 `Identifier` \| `MemberExpression` |
| 变量绑定 | 仅 `Identifier` |

## 明确拒绝（示例）

`LabeledStatement`、`ClassDeclaration`、`ImportDeclaration`、`ExportDeclaration`、
`ArrowFunctionExpression`（若未降级掉）

## 错误格式

```text
CompileError[TWISTED_UNSUPPORTED_STATEMENT]: LabeledStatement is not in the ES5 whitelist (line 12, column 0)
```

若本地 `tsx`/`esbuild` 报 platform 错误，执行：`rm -rf node_modules && npm ci`。
