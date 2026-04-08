import * as parser from "@babel/parser";

import {
	Identifier,
	NumericLiteral,
	StringLiteral,
	BooleanLiteral,
	BinaryExpression,
	CallExpression,
	NewExpression,
	AwaitExpression,
	AssignmentExpression,
	UpdateExpression,
	UnaryExpression,
	MemberExpression,
	ObjectExpression,
	ObjectProperty,
	Expression,
	Program,
	Statement,
	VariableDeclarator,
	VariableDeclaration,
	IfStatement,
	ForStatement,
	BlockStatement,
	FunctionDeclaration,
	FunctionExpression,
	ReturnStatement,
	ArrayExpression,
	NullLiteral,
	DebuggerStatement,
	TryStatement,
	CatchClause,
} from "@babel/types";
import { LabelType, Opcode } from "../constant.js";
import { ArgKind, createArg, createInstruction, type Instruction } from "../instruction.js";
import Context from "./context/context.js";
import { Bulldozer, Label } from "./bulldozer.js";
import ExceptionTable from "./exception.js";

class Compiler {
	private program: Program;
	public ir: Instruction[];
	private context: Context;
	private dependencies: string[];
	private bulldozer: Bulldozer;
	private exceptionTable: ExceptionTable;
	/** 编译函数表达式时记录待捕获的外层槽位；null 表示不在函数表达式上下文中 */
	private closureCaptures: number[] | null = null;

	constructor(source: string) {
		this.program = parser.parse(source, { sourceType: "module" }).program;
		this.ir = [];
		this.context = new Context();
		this.dependencies = ["window", "console"];
		this.bulldozer = new Bulldozer();
		this.exceptionTable = new ExceptionTable();
	}

	compile(): Instruction[] {
		if (!this.program) {
			throw new Error("Failed to parse program");
		}
		this.program.body.forEach((element) => {
			this.compileStatement(element);
		});
		console.log("🤖 Compiled intermediate representation.");
		// add halt instruction
		this.pushIr(createInstruction(Opcode.Halt, []));
		this.bulldozer.backpatch(this.ir);
		return this.ir;
	}

	private compileStatement(node: Statement) {
		switch (node.type) {
			case "ExpressionStatement":
				console.log("🤖 Compiling ExpressionStatement");
				this.compileExpression(node.expression);
				break;
			case "VariableDeclaration":
				this.compileVariableDeclaration(node as VariableDeclaration);
				break;
			case "IfStatement":
				this.compileIfStatement(node as IfStatement);
				break;
			case "ForStatement":
				this.compileForStatement(node as ForStatement);
				break;
			case "BlockStatement":
				this.compileBlockStatement(node as BlockStatement);
				break;
			case "FunctionDeclaration":
				this.compileFunctionDeclaration(node as FunctionDeclaration);
				break;
			case "ReturnStatement":
				this.compileReturnStatement(node as ReturnStatement);
				break;
			case "TryStatement":
				this.compileTryStatement(node as TryStatement);
				break;
			case "DebuggerStatement":
				this.compileDebuggerStatement(node as DebuggerStatement);
				break;
			default:
				throw new Error(`Unsupported statement type: ${node.type}`);
		}
	}

	private compileDebuggerStatement(_node: DebuggerStatement) {
		this.pushIr(createInstruction(Opcode.Debugger, []));
	}

	private compileReturnStatement(node: ReturnStatement) {
		const argument = node.argument;
		if (!argument) {
			throw new Error("🤖 Return statement must have an argument");
		}

		// ✅ 编译返回值表达式（结果在栈顶）
		this.compileExpression(argument as Expression);

		// ✅ 生成 PopFrame（返回并跳转）
		this.pushIr(createInstruction(Opcode.PopFrame));
	}

	private compileFunctionDeclaration(node: FunctionDeclaration) {
		const id = node.id;
		const body = node.body;

		if (!id) {
			throw new Error("🤖 Function declaration must have an id");
		}

		if (!body) {
			throw new Error("🤖 Function declaration must have a body");
		}

		const L_FUNCTION_START = this.bulldozer.label(id.name, LabelType.FUNCTION_START);
		const L_FUNCTION_END = this.bulldozer.label(undefined, LabelType.FUNCTION_END);
		this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_FUNCTION_END.id)]));
		this.bulldozer.record(L_FUNCTION_START.id, this.ir.length);
		this.context.enter();
		node.params.forEach((param, index) => {
			if (param.type !== "Identifier") {
				throw new Error(`Unsupported param type: ${param.type}`);
			}
			this.context.scope.declare(param.name);
			this.pushIr(
				createInstruction(Opcode.LoadParameter, [createArg(ArgKind.Number, index)]),
			);
			this.pushIr(
				createInstruction(Opcode.Store, [
					createArg(ArgKind.Variable, this.context.scope.resolve(param.name)),
				]),
			);
		});
		this.compileBlockStatement(body as BlockStatement);
		// 函数体末尾没有 return 时提供默认出口
		if (!this.blockEndsWithReturn(body as BlockStatement)) {
			this.pushIr(createInstruction(Opcode.PopFrame));
		}
		this.context.exit();
		this.bulldozer.record(L_FUNCTION_END.id, this.ir.length);
	}

	/** 判断块的最后一条语句是否为 return，避免生成多余的 PopFrame */
	private blockEndsWithReturn(body: BlockStatement): boolean {
		const stmts = body.body;
		return stmts.length > 0 && stmts[stmts.length - 1].type === "ReturnStatement";
	}

	/**
	 * 编译函数表达式（闭包）。
	 *
	 * 生成布局：
	 *   Jmp L_END          ← 跳过函数体
	 *   [L_START:]          ← 闭包入口
	 *   LoadParameter / Store  ← 形参绑定
	 *   ... 函数体 ...
	 *   PopFrame            ← 无 return 时的默认出口
	 *   [L_END:]
	 *   MakeClosure <L_START> <numCaptures> [slot0 slot1 ...]
	 */
	private compileFunctionExpression(node: FunctionExpression) {
		const body = node.body as BlockStatement;
		const L_START = this.bulldozer.label(undefined, LabelType.FUNCTION_START);
		const L_END = this.bulldozer.label(undefined, LabelType.FUNCTION_END);

		this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_END.id)]));
		this.bulldozer.record(L_START.id, this.ir.length);

		// 进入新作用域，保存并初始化捕获列表
		const savedCaptures = this.closureCaptures;
		this.closureCaptures = [];
		this.context.enter();

		node.params.forEach((param, index) => {
			if (param.type !== "Identifier") {
				throw new Error(`Unsupported param type: ${param.type}`);
			}
			this.context.scope.declare(param.name);
			this.pushIr(
				createInstruction(Opcode.LoadParameter, [createArg(ArgKind.Number, index)]),
			);
			this.pushIr(
				createInstruction(Opcode.Store, [
					createArg(ArgKind.Variable, this.context.scope.resolve(param.name)),
				]),
			);
		});

		this.compileBlockStatement(body);
		if (!this.blockEndsWithReturn(body)) {
			this.pushIr(createInstruction(Opcode.PopFrame));
		}

		this.context.exit();
		const capturedSlots = this.closureCaptures.slice();
		this.closureCaptures = savedCaptures;

		this.bulldozer.record(L_END.id, this.ir.length);

		// MakeClosure: entryPc + numCaptures + 各槽位
		this.pushIr(
			createInstruction(Opcode.MakeClosure, [
				createArg(ArgKind.DynAddr, L_START.id),
				createArg(ArgKind.Number, capturedSlots.length),
				...capturedSlots.map((slot) => createArg(ArgKind.Variable, slot)),
			]),
		);
		console.log("🔧 Compiling FunctionExpression, captures: %s", capturedSlots);
	}

	private compileBlockStatement(node: BlockStatement) {
		node.body.forEach((statement) => {
			this.compileStatement(statement as Statement);
		});
	}

	private compileIfStatement(node: IfStatement) {
		this.compileExpression(node.test as Expression);
		const L_THEN = this.bulldozer.label(undefined, LabelType.IF_THEN);
		const L_END = this.bulldozer.label(undefined, LabelType.IF_END);

		if (node.alternate) {
			// jmp if true jump to then, else jump to end
			this.pushIr(createInstruction(Opcode.JmpIf, [createArg(ArgKind.DynAddr, L_THEN.id)]));
			this.compileStatement(node.alternate as Statement);
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_END.id)]));
			this.bulldozer.record(L_THEN.id, this.ir.length);
			this.compileStatement(node.consequent as Statement);
			this.bulldozer.record(L_END.id, this.ir.length);
		} else {
			this.pushIr(createInstruction(Opcode.JmpIf, [createArg(ArgKind.DynAddr, L_THEN.id)]));
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_END.id)]));
			this.bulldozer.record(L_THEN.id, this.ir.length);
			this.compileStatement(node.consequent as Statement);
			this.bulldozer.record(L_END.id, this.ir.length);
		}
	}

	private compileForStatement(node: ForStatement) {
		if (node.init) {
			if (node.init.type === "VariableDeclaration") {
				this.compileVariableDeclaration(node.init as VariableDeclaration);
			} else {
				this.compileExpression(node.init as Expression);
			}
		}

		const L_TEST = this.bulldozer.label(undefined, LabelType.IF_THEN);
		const L_BODY = this.bulldozer.label(undefined, LabelType.IF_THEN);
		const L_END = this.bulldozer.label(undefined, LabelType.IF_END);

		this.bulldozer.record(L_TEST.id, this.ir.length);

		if (node.test) {
			this.compileExpression(node.test as Expression);
			this.pushIr(createInstruction(Opcode.JmpIf, [createArg(ArgKind.DynAddr, L_BODY.id)]));
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_END.id)]));
		} else {
			this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_BODY.id)]));
		}

		this.bulldozer.record(L_BODY.id, this.ir.length);
		this.compileStatement(node.body as Statement);

		if (node.update) {
			this.compileExpression(node.update as Expression);
		}

		this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_TEST.id)]));
		this.bulldozer.record(L_END.id, this.ir.length);
	}

	private compileExpression(node: Expression) {
		switch (node.type) {
			case "CallExpression":
				this.compileCallExpression(node as CallExpression);
				break;
			case "NewExpression":
				this.compileNewExpression(node as NewExpression);
				break;
			case "AwaitExpression":
				this.compileAwaitExpression(node as AwaitExpression);
				break;
			case "BinaryExpression":
				console.log("🤖 Compiling BinaryExpression");
				this.compileBinaryExpression(node as BinaryExpression);
				break;
			case "Identifier":
				this.compileIdentifier(node as Identifier);
				break;
			case "MemberExpression":
				this.compileMemberExpression(node as MemberExpression);
				break;
			case "NumericLiteral":
				this.compileNumericLiteral(node as NumericLiteral);
				break;
			case "StringLiteral":
				this.compileStringLiteral(node as StringLiteral);
				break;
			case "BooleanLiteral":
				this.compileBooleanLiteral(node as BooleanLiteral);
				break;
			case "ObjectExpression":
				this.compileObjectExpression(node as ObjectExpression);
				break;
			case "AssignmentExpression":
				this.compileAssignmentExpression(node as AssignmentExpression);
				break;
			case "UpdateExpression":
				this.compileUpdateExpression(node as UpdateExpression);
				break;
			case "UnaryExpression":
				this.compileUnaryExpression(node as UnaryExpression);
				break;
			case "FunctionExpression":
				this.compileFunctionExpression(node as FunctionExpression);
				break;
			case "ArrayExpression":
				this.compileArrayExpression(node as ArrayExpression);
				break;
			case "NullLiteral":
				this.compileNullLiteral(node as NullLiteral);
				break;
			default:
				throw new Error(`Unsupported expression type: ${node.type}`);
		}
	}

	private compileAwaitExpression(node: AwaitExpression) {
		this.compileExpression(node.argument as Expression);
		this.pushIr(createInstruction(Opcode.Await));
		console.log("🤖 Compiling AwaitExpression");
	}

	private compileCallExpression(node: CallExpression) {
		this.buildArrayVariable(node.arguments as ArrayExpression["elements"]);
		switch (node.callee.type) {
			case "Identifier":
				if (this.bulldozer.hasLabelByName(node.callee.name)) {
					this.pushIr(createInstruction(Opcode.PushFrame));
					const L_FUNCTION_START = this.bulldozer.getLabelByName(node.callee.name);
					const ir = createInstruction(Opcode.Jmp, [
						createArg(ArgKind.DynAddr, L_FUNCTION_START.id),
					]);
					this.pushIr(ir);
					console.log(
						"🤖 Compiling CallExpression function: %s, index: %s",
						node.callee.name,
						L_FUNCTION_START.id,
					);
					return;
				}
				// 非函数声明的标识符（闭包值或原生函数）→ 通过 InvokeValue 调用
				this.compileIdentifier(node.callee as Identifier);
				this.pushIr(createInstruction(Opcode.InvokeValue));
				break;
			case "MemberExpression":
				// this
				this.compileThisObject(node.callee.object as Expression);
				// func
				this.compileMemberExpression(node.callee as MemberExpression);
				const ir = createInstruction(Opcode.Apply, []);
				this.pushIr(ir);
				break;
			case "CallExpression":
				this.compileCallExpression(node.callee as CallExpression);
				break;
			default:
				throw new Error(`Unsupported callee type: ${node.callee.type}`);
		}
		console.log("🤖 Compiling CallExpression");
	}

	private compileNewExpression(node: NewExpression) {
		const args = (node.arguments ?? []) as ArrayExpression["elements"];
		this.buildArrayVariable(args);
		this.compileConstructCallee(node.callee as Expression);
		this.pushIr(createInstruction(Opcode.Construct, []));
		console.log("🤖 Compiling NewExpression");
	}

	private compileIdentifier(node: Identifier) {
		if (this.closureCaptures !== null) {
			// 函数表达式内部：通过词法作用域解析，外层变量作为 upvalue
			const captures = this.closureCaptures;
			const binding = this.context.scope.resolveBinding(node.name, (outerSlot) => {
				const idx = captures.indexOf(outerSlot);
				if (idx >= 0) return idx;
				captures.push(outerSlot);
				return captures.length - 1;
			});
			if (binding.kind === "local") {
				this.pushIr(
					createInstruction(Opcode.Load, [createArg(ArgKind.Variable, binding.slot)]),
				);
			} else {
				this.pushIr(
					createInstruction(Opcode.LoadCapture, [
						createArg(ArgKind.Number, binding.index),
					]),
				);
			}
		} else {
			const index = this.context.scope.resolve(node.name);
			this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, index)]));
		}
		console.log("🤖 Compiling Identifier: %s", node.name);
	}

	private compileMemberExpression(node: MemberExpression) {
		const object = node.object;
		const property = node.property;
		switch (object.type) {
			case "Identifier":
				if (this.dependencies.includes(object.name)) {
					console.log("🤖 Identifier fetch dependency %s", object.name);
					const index = this.dependencies.indexOf(object.name);
					const ir = createInstruction(Opcode.Dependency, [
						createArg(ArgKind.Dependency, index),
					]);
					this.pushIr(ir);
				} else {
					this.compileIdentifier(object as Identifier);
				}
				break;
			case "MemberExpression":
				this.compileMemberExpression(object as MemberExpression);
				break;
			case "CallExpression":
				this.compileCallExpression(object as CallExpression);
				break;
			case "NewExpression":
				this.compileNewExpression(object as NewExpression);
				break;
			case "BinaryExpression":
				this.compileBinaryExpression(object as BinaryExpression);
				break;
			default:
				throw new Error(`Unsupported object type: ${object.type}`);
		}
		if (node.computed) {
			this.compileExpression(property as Expression);
			this.pushIr(createInstruction(Opcode.GetElement));
		} else {
			switch (property.type) {
				case "Identifier":
					console.log("🤖 Compiling MemberExpression property: %s", property.name);
					const ir = createInstruction(Opcode.Property, [
						createArg(ArgKind.Property, property.name),
					]);
					this.pushIr(ir);
					break;
				default:
					throw new Error(`Unsupported property type: ${property.type}`);
			}
		}
		console.log("🤖 Compiling MemberExpression");
	}

	private compileNumericLiteral(node: NumericLiteral) {
		this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, node.value)]));
		console.log("🤖 Compiling NumericLiteral");
	}

	private compileStringLiteral(node: StringLiteral) {
		this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.String, node.value)]));
		console.log("🤖 Compiling StringLiteral");
	}

	private compileBooleanLiteral(node: BooleanLiteral) {
		const value = node.value ? 1 : 0;
		this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, value)]));
		console.log("🤖 Compiling BooleanLiteral");
	}

	private compileObjectExpression(node: ObjectExpression) {
		node.properties.forEach((property) => {
			if (property.type !== "ObjectProperty") {
				throw new Error(`Unsupported object property type: ${property.type}`);
			}

			const objectProperty = property as ObjectProperty;
			if (objectProperty.computed) {
				throw new Error("Unsupported computed object property");
			}

			if (objectProperty.key.type === "Identifier") {
				this.pushIr(
					createInstruction(Opcode.Push, [
						createArg(ArgKind.String, objectProperty.key.name),
					]),
				);
			} else if (objectProperty.key.type === "StringLiteral") {
				this.pushIr(
					createInstruction(Opcode.Push, [
						createArg(ArgKind.String, objectProperty.key.value),
					]),
				);
			} else {
				throw new Error(`Unsupported object key type: ${objectProperty.key.type}`);
			}

			this.compileExpression(objectProperty.value as Expression);
		});

		this.pushIr(
			createInstruction(Opcode.BuildObject, [
				createArg(ArgKind.Number, node.properties.length),
			]),
		);
		console.log("🤖 Compiling ObjectExpression");
	}

	private compileBinaryExpression(node: BinaryExpression) {
		const left = node.left;
		const right = node.right;
		const operator = node.operator;
		this.compileExpression(left as Expression);
		this.compileExpression(right as Expression);
		switch (operator) {
			case "+":
				this.pushIr(createInstruction(Opcode.Add));
				break;
			case "-":
				this.pushIr(createInstruction(Opcode.Sub));
				break;
			case "*":
				this.pushIr(createInstruction(Opcode.Mul));
				break;
			case "/":
				this.pushIr(createInstruction(Opcode.Div));
				break;
			case "==":
				this.pushIr(createInstruction(Opcode.Equal));
				break;
			case "===":
				this.pushIr(createInstruction(Opcode.Equal));
				break;
			case "|":
				this.pushIr(createInstruction(Opcode.BitOr));
				break;
			case "^":
				this.pushIr(createInstruction(Opcode.BitXor));
				break;
			case "<<":
				this.pushIr(createInstruction(Opcode.ShiftLeft));
				break;
			case ">>>":
				this.pushIr(createInstruction(Opcode.ShiftRightUnsigned));
				break;
			case "<":
				this.pushIr(createInstruction(Opcode.LessThan));
				break;
			case ">":
				this.pushIr(createInstruction(Opcode.GreaterThan));
				break;
			case ">=":
				this.pushIr(createInstruction(Opcode.GreaterThanOrEqual));
				break;
			case "<=":
				this.pushIr(createInstruction(Opcode.LessThanOrEqual));
				break;
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}
	}

	private compileAssignmentExpression(node: AssignmentExpression) {
		switch (node.left.type) {
			case "Identifier": {
				const variableName = node.left.name;
				const variableIndex = this.context.scope.resolve(variableName);

				switch (node.operator) {
					case "=":
						this.compileExpression(node.right as Expression);
						this.pushIr(
							createInstruction(Opcode.Store, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						break;
					case "+=":
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.compileExpression(node.right as Expression);
						this.pushIr(createInstruction(Opcode.Add));
						this.pushIr(
							createInstruction(Opcode.Store, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						break;
					case "-=":
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.compileExpression(node.right as Expression);
						this.pushIr(createInstruction(Opcode.Sub));
						this.pushIr(
							createInstruction(Opcode.Store, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						break;
					case "^=":
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.compileExpression(node.right as Expression);
						this.pushIr(createInstruction(Opcode.BitXor));
						this.pushIr(
							createInstruction(Opcode.Store, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						this.pushIr(
							createInstruction(Opcode.Load, [
								createArg(ArgKind.Variable, variableIndex),
							]),
						);
						break;
					default:
						throw new Error(`Unsupported assignment operator: ${node.operator}`);
				}
				break;
			}
			case "MemberExpression": {
				if (node.operator !== "=") {
					throw new Error(
						`Unsupported assignment operator for member target: ${node.operator}`,
					);
				}

				const memberNode = node.left as MemberExpression;
				this.compileThisObject(memberNode.object as Expression);
				if (memberNode.computed) {
					this.compileExpression(memberNode.property as Expression);
					this.compileExpression(node.right as Expression);
					this.pushIr(createInstruction(Opcode.SetElement));
				} else {
					this.compileExpression(node.right as Expression);
					if (memberNode.property.type === "Identifier") {
						this.pushIr(
							createInstruction(Opcode.SetProperty, [
								createArg(ArgKind.Property, memberNode.property.name),
							]),
						);
					} else if (memberNode.property.type === "StringLiteral") {
						this.pushIr(
							createInstruction(Opcode.SetProperty, [
								createArg(ArgKind.Property, memberNode.property.value),
							]),
						);
					} else if (memberNode.property.type === "NumericLiteral") {
						this.pushIr(
							createInstruction(Opcode.SetProperty, [
								createArg(ArgKind.Property, String(memberNode.property.value)),
							]),
						);
					} else {
						throw new Error(
							`Unsupported member assignment property type: ${memberNode.property.type}`,
						);
					}
				}
				break;
			}
			default:
				throw new Error(`Unsupported assignment target type: ${node.left.type}`);
		}
	}

	private compileUpdateExpression(node: UpdateExpression) {
		if (node.argument.type !== "Identifier") {
			throw new Error(`Unsupported update argument type: ${node.argument.type}`);
		}

		const variableIndex = this.context.scope.resolve(node.argument.name);
		this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
		this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, 1)]));

		if (node.operator === "++") {
			this.pushIr(createInstruction(Opcode.Add));
		} else if (node.operator === "--") {
			this.pushIr(createInstruction(Opcode.Sub));
		} else {
			throw new Error(`Unsupported update operator: ${node.operator}`);
		}

		this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, variableIndex)]));
		this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
	}

	private compileUnaryExpression(node: UnaryExpression) {
		if (node.operator === "-" && node.argument.type === "NumericLiteral") {
			this.pushIr(
				createInstruction(Opcode.Push, [createArg(ArgKind.Number, -node.argument.value)]),
			);
			return;
		}
		if (node.operator === "!") {
			this.compileExpression(node.argument as Expression);
			this.pushIr(createInstruction(Opcode.Not));
			return;
		}
		throw new Error(`Unsupported unary expression: ${node.operator}`);
	}

	private compileVariableDeclaration(node: VariableDeclaration) {
		const declarations = node.declarations;
		declarations.forEach((declaration) => {
			this.compileVariableDeclarator(declaration as VariableDeclarator);
		});
		console.log("🤖 Compiling VariableDeclaration");
	}

	private compileVariableDeclarator(node: VariableDeclarator) {
		const id = node.id;
		const init = node.init;
		if (!init) {
			throw new Error("🤖 Variable declarator must have an initial value");
		}

		this.compileExpression(init as Expression);

		switch (id.type) {
			case "Identifier":
				this.context.scope.declare(id.name);
				console.log("🤖 Compiling VariableDeclarator id: %s", id.name);
				const ir = createInstruction(Opcode.Store, [
					createArg(ArgKind.Variable, this.context.scope.resolve(id.name)),
				]);
				this.pushIr(ir);
				break;
		}

		console.log("🤖 Compiling VariableDeclarator");
	}

	private pushIr(instruction: Instruction) {
		this.ir.push(instruction);
	}

	private compileNullLiteral(_node: NullLiteral) {
		this.pushIr(createInstruction(Opcode.PushNull, []));
		console.log("🤖 Compiling NullLiteral");
	}

	private compileArrayExpression(node: ArrayExpression) {
		const { elements } = node;
		for (let i = 0; i < elements.length; i++) {
			const el = elements[i];
			if (el === null) {
				throw new Error("Sparse array literal is not supported");
			}
			this.compileExpression(el as Expression);
		}
		this.pushIr(
			createInstruction(Opcode.BuildArray, [createArg(ArgKind.Number, elements.length)]),
		);
	}

	private buildArrayVariable(args: ArrayExpression["elements"]) {
		args.forEach((arg) => {
			this.compileExpression(arg as Expression);
		});
		const ir = createInstruction(Opcode.BuildArray, [
			createArg(ArgKind.Number, args.length as number),
		]);
		this.pushIr(ir);
	}

	private compileThisObject(object: Expression) {
		switch (object.type) {
			case "Identifier":
				if (this.dependencies.includes(object.name)) {
					const index = this.dependencies.indexOf(object.name);
					this.pushIr(
						createInstruction(Opcode.Dependency, [
							createArg(ArgKind.Dependency, index),
						]),
					);
				} else {
					this.compileIdentifier(object as Identifier);
				}
				break;
			case "MemberExpression":
				this.compileMemberExpression(object as MemberExpression);
				break;
			case "CallExpression":
				this.compileCallExpression(object as CallExpression);
				break;
			case "NewExpression":
				this.compileNewExpression(object as NewExpression);
				break;
			case "BinaryExpression":
				this.compileBinaryExpression(object as BinaryExpression);
				break;
			default:
				throw new Error(`Unsupported this object type: ${object.type}`);
		}
	}

	private compileConstructCallee(callee: Expression) {
		switch (callee.type) {
			case "Identifier":
				if (this.dependencies.includes(callee.name)) {
					const index = this.dependencies.indexOf(callee.name);
					this.pushIr(
						createInstruction(Opcode.Dependency, [
							createArg(ArgKind.Dependency, index),
						]),
					);
				} else {
					this.compileIdentifier(callee as Identifier);
				}
				break;
			case "MemberExpression":
				this.compileMemberExpression(callee as MemberExpression);
				break;
			case "CallExpression":
				this.compileCallExpression(callee as CallExpression);
				break;
			default:
				throw new Error(`Unsupported constructor callee type: ${callee.type}`);
		}
	}

	private compileTryStatement(node: TryStatement) {
		const block = node.block;
		const handler = node.handler;

		const L_TRY_START = this.bulldozer.label(undefined, LabelType.TRY_START);
		const L_TRY_END = this.bulldozer.label(undefined, LabelType.TRY_END);
		const L_CATCH_START = this.bulldozer.label(undefined, LabelType.CATCH_START);
		const L_CATCH_END = this.bulldozer.label(undefined, LabelType.CATCH_END);
		this.bulldozer.record(L_TRY_START.id, this.ir.length);
		this.compileBlockStatement(block as BlockStatement);
		this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_CATCH_END.id)]));
		this.bulldozer.record(L_TRY_END.id, this.ir.length);

		this.bulldozer.record(L_CATCH_START.id, this.ir.length);
		this.compileCatchClause(handler as CatchClause);
		this.pushIr(createInstruction(Opcode.Jmp, [createArg(ArgKind.DynAddr, L_CATCH_END.id)]));
		this.bulldozer.record(L_CATCH_END.id, this.ir.length);
	}

	private compileCatchClause(node: CatchClause) {
		this.context.enter();
		if (node.param && node.param.type === "Identifier") {
			this.context.scope.declare(node.param.name);
			// 约定：VM 跳入 catch 时，异常值在栈顶
			this.pushIr(
				createInstruction(Opcode.Store, [
					createArg(ArgKind.Variable, this.context.scope.resolve(node.param.name)),
				]),
			);
		}
		this.compileBlockStatement(node.body as BlockStatement);
		this.context.exit();
	}
}

export default Compiler;
