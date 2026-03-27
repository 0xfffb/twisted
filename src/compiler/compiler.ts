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
	ReturnStatement,
	ArrayExpression,
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
			default:
				throw new Error(`Unsupported statement type: ${node.type}`);
		}
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
		this.pushIr(createInstruction(Opcode.PushFrame));
		this.bulldozer.record(L_FUNCTION_START.id, this.ir.length);
		this.context.enter();
		node.params.forEach((param, index) => {
			switch (param.type) {
				case "Identifier":
					this.context.scope.declare(param.name);
					// 通过索引加载形参
					const load_param_ir = createInstruction(Opcode.LoadParameter, [
						createArg(ArgKind.Number, index),
					]);
					this.pushIr(load_param_ir);
					// 将形参存储到变量表中
					const ir = createInstruction(Opcode.Store, [
						createArg(ArgKind.Variable, this.context.scope.resolve(param.name)),
					]);
					this.pushIr(ir);
					break;
				default:
					throw new Error(`Unsupported param type: ${param.type}`);
			}
		});
		this.compileBlockStatement(body as BlockStatement);
		this.pushIr(createInstruction(Opcode.PopFrame));
		this.context.exit();
		this.bulldozer.record(L_FUNCTION_END.id, this.ir.length);
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
				this.compileIdentifier(node.callee as Identifier);
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
		const index = this.context.scope.resolve(node.name);
		const ir = createInstruction(Opcode.Load, [createArg(ArgKind.Variable, index)]);
		this.pushIr(ir);
		console.log("🤖 Compiling Identifier name: %s, index: %s", node.name, index);
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
		this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, node.value)]));
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
					createInstruction(Opcode.Push, [createArg(ArgKind.String, objectProperty.key.name)]),
				);
			} else if (objectProperty.key.type === "StringLiteral") {
				this.pushIr(
					createInstruction(Opcode.Push, [createArg(ArgKind.String, objectProperty.key.value)]),
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
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}
	}

	private compileAssignmentExpression(node: AssignmentExpression) {
		if (node.left.type !== "Identifier") {
			throw new Error(`Unsupported assignment target type: ${node.left.type}`);
		}

		const variableName = node.left.name;
		const variableIndex = this.context.scope.resolve(variableName);

		switch (node.operator) {
			case "=":
				this.compileExpression(node.right as Expression);
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, variableIndex)]));
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				break;
			case "+=":
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				this.compileExpression(node.right as Expression);
				this.pushIr(createInstruction(Opcode.Add));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, variableIndex)]));
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				break;
			case "-=":
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				this.compileExpression(node.right as Expression);
				this.pushIr(createInstruction(Opcode.Sub));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, variableIndex)]));
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				break;
			case "^=":
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				this.compileExpression(node.right as Expression);
				this.pushIr(createInstruction(Opcode.BitXor));
				this.pushIr(createInstruction(Opcode.Store, [createArg(ArgKind.Variable, variableIndex)]));
				this.pushIr(createInstruction(Opcode.Load, [createArg(ArgKind.Variable, variableIndex)]));
				break;
			default:
				throw new Error(`Unsupported assignment operator: ${node.operator}`);
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
			this.pushIr(createInstruction(Opcode.Push, [createArg(ArgKind.Number, -node.argument.value)]));
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
			this.pushIr(createInstruction(Opcode.Store, [
				createArg(ArgKind.Variable, this.context.scope.resolve(node.param.name)),
			]));
		}
		this.compileBlockStatement(node.body as BlockStatement);
		this.context.exit();
	}
}

export default Compiler;
