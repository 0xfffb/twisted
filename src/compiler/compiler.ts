import { default as traverse } from '@babel/traverse';
import * as parser from '@babel/parser';
import type { NodePath, Visitor } from '@babel/traverse';
import type { ParseResult } from '@babel/parser';

import type { VariableDeclarator, Identifier, Function } from '@babel/types';

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
    private opcode: Record<string, number>;
    public ir: Instruction[];
    private globals: Map<string, number>;
    private globalIndex: number;
    private functionScopes: Map<number, ScopeInfo>;

    constructor(source: string, opcode: Record<string, number>) {
        this.ast = parser.parse(source, { sourceType: 'module' });
        this.opcode = opcode;
        this.ir = [];
        this.globals = new Map();
        this.globalIndex = 0;
        this.functionScopes = new Map();
    }

    compile(): Instruction[] {
        traverse.default(this.ast, this.visitor());
        console.log('🤖 Compiled intermediate representation.');
        return this.ir;
    }

    visitor(): Visitor {
        return {
            Function: {
                enter: (path: NodePath<Function>) => {
                    const scopeId = path.scope.uid;
                    if (!this.functionScopes.has(scopeId)) {
                        const scopeInfo: ScopeInfo = { locals: new Map(), localIndex: 0 };
                        path.get('params').forEach((paramPath) => {
                            const varName = (paramPath.node as Identifier).name;
                            const index = scopeInfo.localIndex++;
                            scopeInfo.locals.set(varName, index);
                        });
                        this.functionScopes.set(scopeId, scopeInfo);
                    }
                },
            },
            VariableDeclarator: {
                exit: (path: NodePath<VariableDeclarator>) => {
                    const varName = (path.node.id as Identifier).name;
                    const binding = path.scope.getBinding(varName);
                    if (!binding) return;
                    if (binding.scope.path.isProgram()) {
                        if (!this.globals.has(varName)) {
                            console.log('🤖 VariableDeclarator Global variable: ', varName);
                        }
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
                        console.log('🤖 Identifier Global variable: ', varName);
                    }
                },
            },
        };
    }
}

export default Compiler;
