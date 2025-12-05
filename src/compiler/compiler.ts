import { default as traverse } from "@babel/traverse";
import * as parser from "@babel/parser";
import type { NodePath, Visitor } from "@babel/traverse";
import type { ParseResult } from "@babel/parser";

import type { VariableDeclarator, Identifier, Function } from "@babel/types";

interface Instruction {
	opcode: number;
	args?: any[];
}

interface ScopeInfo {
	locals: Map<string, number>;
	localIndex: number;
}

class Compiler {
	private ast: ParseResult;
	public ir: Instruction[];
	private globals: Map<string, number>;
	private globalIndex: number;
	private functionScopes: Map<number, ScopeInfo>;
	private dependencies: string[];

	constructor(source: string) {
		this.ast = parser.parse(source, { sourceType: "module" });
		this.ir = [];
		this.globals = new Map();
		this.globalIndex = 0;
		this.functionScopes = new Map();
        this.dependencies = ["window", "console"];
	}

	compile(): Instruction[] {
		traverse.default(this.ast, this.visitor());
		console.log("🤖 Compiled intermediate representation.");
		return this.ir;
	}

    private visitor(): Visitor {
		return {
			Function: {
				enter: (path: NodePath<Function>) => {
				},
			},
			VariableDeclarator: {
				exit: (path: NodePath<VariableDeclarator>) => {
					const varName = (path.node.id as Identifier).name;
					const binding = path.scope.getBinding(varName);
					if (!binding) return;
					if (binding.scope.path.isProgram()) {
						if (!this.globals.has(varName)) {
							console.log("🤖 VariableDeclarator Global variable: ", varName);
						}
					} else {
                        console.log("🤖 VariableDeclarator Local variable: ", varName);
                    }
				},
			},
			Identifier: {
				enter: (path: NodePath<Identifier>) => {
					if (!path.isReferencedIdentifier()) return;
					const varName = path.node.name;
					const binding = path.scope.getBinding(varName);
					if (!binding) return;
					if (binding.scope.path.isProgram()) {
						console.log("🤖 Identifier Global variable: ", varName);
					}
				},
			},
		};
	}
}

export default Compiler;
