import * as parser from "@babel/parser";
import { BaseCompiler } from "./base.js";
import { IRBuilder } from "./builder.js";
import { IRModule } from "./module.js";
import { Expression, Identifier, MemberExpression, Program, Statement } from "@babel/types";


class HyperionCompiler extends BaseCompiler {
    
    readonly builder: IRBuilder;
    private program: Program;

	constructor(source: string) {
		super(source);
        this.builder = new IRBuilder(new IRModule("hyperion"));
        this.program = parser.parse(source, { sourceType: "module" }).program;
	}

	compile(): any {
        const module = this.builder.module;
        this.program.body.forEach((element) => {
			this.compileStatement(element as Statement);
		});
        return module;
	}

    private compileStatement(node: Statement) {
        switch (node.type) {
            case "ExpressionStatement":
                this.compileExpression(node.expression);
                break;
        }
    }

    private compileExpression(node: Expression) {
        switch (node.type) {
            case "Identifier":
                this.compileIdentifier(node as Identifier);
                break;
            case "MemberExpression":
                this.compileMemberExpression(node as MemberExpression);
                break;
        }
    }

    private compileIdentifier(node: Identifier) {
        
    }

    private compileMemberExpression(node: MemberExpression) {
    }
}

export { HyperionCompiler };