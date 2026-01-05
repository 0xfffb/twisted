import * as parser from "@babel/parser";

import {
	Identifier,
	NumericLiteral,
	BinaryExpression,
	CallExpression,
	MemberExpression,
	Expression,
	Program,
	Statement,
	VariableDeclarator,
	VariableDeclaration,
	IfStatement,
	BlockStatement,
} from "@babel/types";
import Opcode from "../constant.js";
import { ArgKind, createArg, createInstruction, type Instruction } from "../instruction.js";
import Context from "./context/context.js";

class Compiler {
	private program: Program;
	public ir: Instruction[];
	private context: Context;
	private dependencies: string[];


	constructor(source: string) {
		this.program = parser.parse(source, { sourceType: "module" }).program;
		this.ir = [];
		this.context = new Context();
		this.dependencies = ["window", "console"];
	}

	compile(): Instruction[] {
		if (!this.program) {
			throw new Error("Failed to parse program");
		}
		this.program.body.forEach((element) => {
			this.compileStatement(element);
		});
		console.log("🤖 Compiled intermediate representation.");
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
			case "BlockStatement":
				this.compileBlockStatement(node as BlockStatement);
			default:
				throw new Error(`Unsupported statement type: ${node.type}`);
		}
	}

	private compileBlockStatement(node: BlockStatement) {
		node.body.forEach((statement) => {
			this.compileStatement(statement as Statement);
		});
	}

	private compileIfStatement(node: IfStatement) {
		this.compileExpression(node.test as Expression);
		this.compileStatement(node.consequent as Statement);
		if (node.alternate) {
			this.compileStatement(node.alternate as Statement);
		}
	}

	private compileExpression(node: Expression) {
		switch (node.type) {
			case "CallExpression":
				this.compileCallExpression(node as CallExpression);
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

			default:
				throw new Error(`Unsupported expression type: ${node.type}`);
		}
	}

	private compileCallExpression(node: CallExpression) {
		switch (node.callee.type) {
			case "Identifier":
				this.compileIdentifier(node.callee as Identifier);
				break;
			case "MemberExpression":
				this.compileMemberExpression(node.callee as MemberExpression);
				break;
			case "CallExpression":
				this.compileCallExpression(node.callee as CallExpression);
				break;
			default:
				throw new Error(`Unsupported callee type: ${node.callee.type}`);
		}
		node.arguments.forEach((argument) => {
			this.compileExpression(argument as Expression);
		});
		const ir = createInstruction(Opcode.Call, [
			createArg(ArgKind.ArgLength, node.arguments.length),
		]);
		this.pushIr(ir);
		console.log("🤖 Compiling CallExpression");
	}

	private compileIdentifier(node: Identifier) {
		const index = this.context.scope.resolve(node.name);
		const ir = createInstruction(Opcode.Load, [
			createArg(ArgKind.Variable, index),
		]);
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
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}
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
		
		switch (init.type) {
			case "NumericLiteral":
				this.compileNumericLiteral(init as NumericLiteral);
				break;
			case "BinaryExpression":
				this.compileBinaryExpression(init as BinaryExpression);
				break;
			default:
				throw new Error(`Unsupported init type: ${init.type}`);
		}

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
}

export default Compiler;
