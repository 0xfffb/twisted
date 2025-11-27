# Twisted - JavaScript 虚拟化保护套件

Twisted 是一套专为反爬虫和代码保护设计的 JavaScript 虚拟化解决方案。它通过将 JavaScript 代码编译为自定义的字节码，并在一个轻量级的 JavaScript 虚拟机 (VM) 中执行，来隐藏原始代码逻辑、增加逆向工程的难度。

## 🎯 项目概述

Twisted 套件包含三个核心模块，它们可以独立工作，也可以协同使用：

1.  **`obfuscator` (混淆器)**: 一个独立的 JS 代码混淆工具，用于在编译前对 AST（抽象语法树）进行转换，增加代码的复杂性。
    -   **输入**: JavaScript 代码文件
    -   **输出**: 经过混淆的 JavaScript 代码文件

2.  **`compiler` (编译器)**: 将 JavaScript 代码（无论是原始的还是混淆过的）编译为自定义的字节码。
    -   **输入**: JavaScript 代码
    -   **输出**: 字节码序列

3.  **`jsvmp` (虚拟机)**: 一个用 JavaScript 实现的轻量级栈式虚拟机，负责解释和执行由 `compiler` 生成的字节码。
    -   **输入**: 字节码序列
    -   **输出**: 代码执行结果

## 🏗️ 项目结构

```
twisted/
├── obfuscator/       # JavaScript 代码混淆器
├── compiler/         # JS-to-Bytecode 编译器
└── jsvmp/            # JavaScript 虚拟机 (VM)
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16
- npm

### 安装依赖

为每个模块独立安装依赖：
```bash
# 安装混淆器依赖
cd obfuscator
npm install

# 安装编译器依赖
cd ../compiler
npm install

# 安装虚拟机依赖
cd ../jsvmp
npm install
```

## 📖 使用指南

### 1. (可选) 混淆 JavaScript 代码
使用 `obfuscator` 来增加代码的分析难度。
```bash
cd obfuscator
node src/index.js files/test.js
# 这将生成一个 files/test.ollvm.js 文件
```

### 2. 编译 JavaScript 为字节码
使用 `compiler` 将 JS 文件（可以是原始的或混淆过的）转换为字节码。
```bash
cd compiler
# 编译原始文件
node src/index.js files/test.js

# 或者编译混淆后的文件
node src/index.js ../obfuscator/files/test.ollvm.js
```
编译器会输出字节码并写入 `.bin` 文件。

### 3. 在 VM 中执行字节码
将生成的字节码复制到 `jsvmp` 中进行测试和执行。
```bash
cd jsvmp
# (手动将字节码数组粘贴到 src/index.js 中)
node src/index.js
```

## 🔧 核心功能

### `jsvmp` (虚拟机)
- ✅ **栈式虚拟机**: 基于栈的计算模型。
- ✅ **PC 管理**: 使用程序计数器跟踪执行。
- ✅ **变量存储**: 支持局部和全局变量存储。
- ✅ **指令集**: 包含算术、控制流、变量和栈操作。

### `compiler` (编译器)
- ✅ **AST 驱动**: 使用 Babel 解析 JS 为 AST。
- ✅ **Visitor 模式**: 通过遍历 AST 节点生成字节码。
- ✅ **基础语法支持**: 目前支持数字字面量和二元表达式。
- 🚧 **正在开发**: 变量声明、赋值、函数调用等。

### `obfuscator` (混淆器)
- ✅ **插件化架构**: 通过不同的 `Transformer` 实现混淆。
- ✅ **字符串混淆**: 加密字符串常量。
- ✅ **控制流平坦化 (FLA)**: 打乱原始的控制流。

## 📊 字节码格式说明

`jsvmp` 使用单字节操作码（Opcode），后面可以跟零个或多个操作数（Operand）。

### `jsvmp` 当前支持的指令集

| Opcode | 指令 | 操作数 | 描述 |
|:---:|:---|:---:|:---|
| `0x00` | Push | `value` | 将一个值压入栈顶 |
| `0x01` | Pop | - | 弹出栈顶的值 |
| `0x02` | Add | - | 弹出两个值，相加后压入结果 |
| `0x03` | Sub | - | 弹出两个值，相减后压入结果 |
| `0x04` | Mul | - | 弹出两个值，相乘后压入结果 |
| `0x05` | Div | - | 弹出两个值，相除后压入结果 |
| `0x06` | Jmp | `target` | 无条件跳转到目标地址 |
| `0x07` | JmpIf | `target` | 弹出栈顶值，如果为真则跳转 |
| `0x08` | LocalStore | `index` | 弹出栈顶值，存入局部变量 |
| `0x09` | LocalLoad | `index` | 加载局部变量的值并压入栈 |
| `0x0A` | GlobalStore | `index` | 弹出栈顶值，存入全局变量 |
| `0x0B` | GlobalLoad | `index` | 加载全局变量的值并压入栈 |

## 系统架构 (System Architecture)

```mermaid
graph TD
    subgraph "客户端 (Client)"
        A["用户操作<br>(e.g., Login, Checkout)"]
        B["JSVMP<br>采集特征 & 生成加密载荷"]
    end

    subgraph "业务应用服务 (Business Application)"
        C["业务网关 / BFF"]
        D["业务逻辑处理<br>(e.g., LoginController)"]
    end

    subgraph "风控平台 - 同步实时评估 (Real-time)"
        E["风控 API (/risk/evaluate)"]
        F["1. 签名/时效性校验"]
        G["2. 特征处理流水线<br>(解析, 丰富, 打标)"]
        H_rule["实时决策: 规则引擎"]
        H_model["实时决策: 主力模型 (XGBoost)"]
        H_decision["实时决策: 最终决策"]
        M["实时特征库 (Redis)"]
    end
    
    subgraph "风控平台 - 异步准实时评估 (Near Real-time)"
        S["消息队列 (Kafka/Pulsar)"]
        T["异步消费服务"]
        U["复杂模型<br>(深度学习/图计算)"]
        V["风险事件中心"]
    end

    subgraph "风控平台 - 离线训练 (Offline)"
        N["离线数据仓库 (Data Warehouse)"]
        O["MLOps / 模型训练平台"]
    end

    subgraph "业务响应 (Business Response)"
        P["执行正常业务"]
        R["直接拒绝"]
    end
    
    A --> B
    B -- "业务 API 请求" --> C
    C --> D

    %% --- 实时路径 ---
    D -- "调用[同步]风控" --> E
    E --> F
    F --> G
    G -- "输入特征" --> H_rule
    G -- "发送事件" --> S
    G -- "写入" --> M
    M -- "读取特征" --> H_model
    H_rule -- "明确信号" --> H_decision
    H_rule -- "灰色流量" --> H_model
    H_model -- "风险评分" --> H_decision
    H_decision -- "返回决策" --> D
    
    %% --- 异步路径 ---
    S --> T
    T --> U
    U --> V

    %% --- 离线路径 ---
    G --> N
    N -- "训练数据" --> O
    O -- "部署模型" --> H_model
    O -- "部署模型" --> U

    %% ---【核心反馈闭环】---
    V -- "更新黑名单/规则" --> H_rule
    V -- "更新用户风险画像" --> M

    %% --- 业务响应 ---
    D -- "根据决策执行" --> P
    D -- "根据决策执行" --> R
```

## 🛡️ 开发路线图

### 短期目标
- [ ] **完善编译器**:
    - [ ] 支持变量声明 (`let a = ...`)
    - [ ] 支持变量引用 (`let b = a + 1`)
    - [ ] 支持 `IfStatement`
    - [ ] 支持函数声明和调用
- [ ] **增强 VM**:
    - [ ] 添加字符串和对象支持
    - [ ] 实现函数调用栈
    - [ ] 添加比较和逻辑操作指令

### 长期目标
- [ ] **高级混淆**: 实现虚拟机嵌套和指令乱序。
- [ ] **反调试**: 在 VM 中加入反调试机制。
- [ ] **性能优化**: 识别热点路径并进行优化（如超级指令）。
- [ ] **工具链**: 开发字节码调试器和源码映射工具。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC License