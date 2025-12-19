import { default as traverse } from "@babel/traverse";
import * as parser from "@babel/parser";
import type { NodePath, Visitor } from "@babel/traverse";
import type { ParseResult } from "@babel/parser";

import {
	VariableDeclarator,
	Identifier,
	Function,
	NumericLiteral,
	BinaryExpression,
	CallExpression,
	LogicalExpression,
	ThrowStatement,
	MemberExpression,
	Expression,
	Program,
	Statement,
} from "@babel/types";
import { Opcode } from "../constant.js";
import { ArgKind, createInstruction, type Instruction } from "../instruction.js";

class Compiler {
	private program: Program;
	public ir: Instruction[];
	private dependencies: string[];

	constructor(source: string) {
		this.program = parser.parse(source, { sourceType: "module" }).program;
		this.ir = [];
		this.dependencies = ["window", "console"];
	}

	compile(): Instruction[] {
		if (!this.program) {
			throw new Error("Failed to parse program");
		}
		this.program.body.forEach(element => {
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
			default:
				throw new Error(`Unsupported statement type: ${node.type}`);
		}
	}

	private compileExpression(node: Expression) {
		switch (node.type) {
			case "CallExpression":
				this.compileCallExpression(node as CallExpression);
				break;
			case "BinaryExpression":
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
		node.arguments.forEach(argument => {
			this.compileExpression(argument as Expression);
		});
		console.log("🤖 Compiling CallExpression");
	}

	private compileIdentifier(node: Identifier) {
		if (this.dependencies.includes(node.name)) {
			console.log("🤖 Identifier fetch dependency %s", node.name);
			return
		}
		console.log("🤖 Compiling Identifier");
	}

	private compileMemberExpression(node: MemberExpression) {
		console.log("🤖 Compiling MemberExpression");
	}

	private compileNumericLiteral(node: NumericLiteral) {
		console.log("🤖 Compiling NumericLiteral");
	}

	private compileBinaryExpression(node: BinaryExpression) {
		console.log("🤖 Compiling BinaryExpression");
	}

	private pushIr(instruction: Instruction) {
		this.ir.push(instruction);
	}
}

export default Compiler;