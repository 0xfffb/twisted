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

3.  **`vm` (虚拟机)**: 一个用 JavaScript 实现的轻量级栈式虚拟机，负责解释和执行由 `compiler` 生成的字节码。
    -   **输入**: 字节码序列
    -   **输出**: 代码执行结果

## 🏗️ 项目结构（当前代码架构）

仓库已收敛为单一包结构，核心代码集中在 `src/` 目录，下游通过统一的编译管线工作：

```text
twisted/
├── src/
│   ├── constant.js          # Opcode / Header 等常量定义
│   ├── index.js             # 示例入口，串联 Compiler → Assembler → VM
│   ├── compiler/
│   │   └── compiler.js      # JS 源码 → IR (Instruction[]) 的编译器
│   ├── assembler/
│   │   └── assembler.js     # IR → Bytecode 的汇编器（处理 Header、字符串池、DYN_ADDR 回填）
│   ├── vm/
│   │   └── vm.js            # 栈式虚拟机，解释执行字节码
│   └── obfuscator/
│       ├── base.js          # 混淆器基础类
│       └── passes/          # IR 级混淆 Pass（控制流/垃圾指令等，可插拔）
└── docs/
    └── ir.md                # Dict IR 规范文档（opcode + args[{type,value}] + Block）
```

整体编译/执行流水线为：

```mermaid
graph LR
  A[JavaScript 源代码] --> B[Compiler<br/>AST → IR]
  B --> C[Obfuscation Passes<br/>在 IR 上做混淆/FLA]
  C --> D[Assembler<br/>IR → Bytecode]
  D --> E[JS VM<br/>解释执行字节码]
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
cd ../vm
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
将生成的字节码复制到 VM 入口中进行测试和执行。
```bash
cd vm
# (手动将字节码数组粘贴到 src/index.js 中)
node src/index.js
```

## 🔧 核心功能

### `vm` (虚拟机)
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

虚拟机使用单字节操作码（Opcode），后面可以跟零个或多个操作数（Operand）。

### 虚拟机当前支持的指令集

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
        B["VM<br>采集特征 & 生成加密载荷"]
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

## 🛡️ 混淆与保护策略 (Obfuscation & Protection Strategy)

Twisted 采用分层、分阶段的混淆策略，以实现最高强度的代码保护。混淆主要在两个不同层级上进行：AST (抽象语法树) 层面和 IR (中间表示) 层面。

### 1. AST 层面的混淆 (高层级，面向语法)

此阶段在 `obfuscator` 模块中进行，或者在 `compiler` 将代码转换为IR之前。它利用 Babel 提供的丰富的语法和作用域信息，对代码进行等价但更复杂的变换。

-   **主要任务**:
    -   **变量/函数名混淆**: 安全地重命名变量，使其失去语义。
    -   **字符串加密**: 将字符串常量替换为解密函数调用。
    -   **常量替换**: 将常量表达式在编译期预先计算。
    -   **死代码注入**: 添加无用的、迷惑性的代码分支。

### 2. IR 层面的混淆 (低层级，面向执行流)

此阶段在 `compiler` 模块内部，在生成IR之后、序列化为字节码之前进行。它不再关心JavaScript语法，而是直接操作虚拟机的指令序列，从根本上破坏代码的原始逻辑结构。

-   **主要任务**:
    -   **控制流平坦化 (Control Flow Flattening)**: 将 `if/else`, `for`, `while` 等结构拆散，通过一个中央分发器 (Dispatcher) 来调度，使执行流变得不可预测。
    -   **不透明谓词 (Opaque Predicates)**: 插入结果恒定的复杂条件判断，创造虚假的代码路径。
    -   **指令替换 (Instruction Substitution)**: 将简单的指令（如 `ADD`）替换为一组功能等价但更复杂的指令序列。

### 3. VM 运行时的自我保护

保护链的最后一环，也是最关键的一环，是对 VM 本身进行保护。在最终打包发布时，VM 的 JavaScript 源代码也会经过一次彻底的传统 JS 混淆，防止攻击者通过分析 VM 来逆向字节码。这形成了一个完整的保护闭环。

## 🛡️ 开发路线图

### 短期目标
- [ ] **架构重构 (Architectural Refactoring)**:
    - [ ] 引入中间表示 (IR)，解耦AST分析与字节码生成，为控制流和优化打下基础。
- [ ] **完善编译器 (Compiler Enhancement)**:
    - [ ] 完善对通用成员表达式和函数调用的支持 (例如 `console.log(a)`)。
    - [ ] 基于IR实现 `IfStatement` 和循环 (`while`, `for`)。
    - [ ] 支持完整的变量声明和作用域。
- [ ] **增强 VM (VM Enhancement)**:
    - [ ] 添加字符串和对象数据类型支持。
    - [ ] 实现函数调用栈 (Call Stack)。
    - [ ] 添加完整的比较和逻辑操作指令。

### 长期目标
- [ ] **高级混淆 (Advanced Obfuscation)**: 
    - [ ] 在AST/IR层面实现可插拔的混淆Pass (例如，控制流平坦化)。
    - [ ] 实现虚拟机嵌套和指令乱序。
- [ ] **安全加固 (Security Hardening)**:
    - [ ] 对VM运行时本身进行混淆保护，防止被直接分析。
    - [ ] 在 VM 中加入反调试机制。
- [ ] **性能优化**: 识别热点路径并进行优化（如超级指令）。
- [ ] **工具链**: 开发字节码调试器和源码映射工具。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC License