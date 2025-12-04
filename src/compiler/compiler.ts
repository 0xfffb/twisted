import { default as traverse } from '@babel/traverse';
import { parse } from '@babel/parser';
import type { NodePath, Visitor } from '@babel/core';

import type {
  VariableDeclarator,
  Identifier,
  Function as FunctionNode,
  Program,
} from '@babel/types';

interface Instruction {
  opcode: number;
  args?: any[];
}

interface ScopeInfo {
  locals: Map<string, number>;
  localIndex: number;
}

class Compiler {
  private ast: Program;
  private opcode: Record<string, number>;
  public ir: Instruction[];
  private globals: Map<string, number>;
  private globalIndex: number;
  private functionScopes: Map<number, ScopeInfo>;

  constructor(source: string, opcode: Record<string, number>) {
    this.ast = parse(source, { sourceType: 'module' }).program;
    this.opcode = opcode;
    this.ir = [];
    this.globals = new Map();
    this.globalIndex = 0;
    this.functionScopes = new Map();
  }

  compile(): Instruction[] {
    traverse.default(this.ast, this.visitor());
    console.log("🤖 Compiled intermediate representation.");
    return this.ir;
  }

  visitor(): Visitor {
    return {
      Function: {
        enter: (path: NodePath<FunctionNode>) => {
          const scopeId = path.scope.uid;
          if (!this.functionScopes.has(scopeId)) {
            const scopeInfo: ScopeInfo = { locals: new Map(), localIndex: 0 };
            path.get('params').forEach(paramPath => {
              const varName = (paramPath.node as Identifier).name;
              const index = scopeInfo.localIndex++;
              scopeInfo.locals.set(varName, index);
            });
            this.functionScopes.set(scopeId, scopeInfo);
          }
        }
      },
      VariableDeclarator: {
        exit: (path: NodePath<VariableDeclarator>) => {
          const varName = (path.node.id as Identifier).name;
          const binding = path.scope.getBinding(varName);
          if (!binding) return;
          if (binding.scope.path.isProgram()) {
            if (!this.globals.has(varName)) {
              this.globals.set(varName, this.globalIndex++);
            }
            const index = this.globals.get(varName);
            this.ir.push({ opcode: this.opcode.GlobalStore, args: [index] });
          } else {
            const funcScope = path.findParent((p) => p.isFunction());
            if (funcScope) {
              const scopeInfo = this.functionScopes.get(funcScope.scope.uid);
              if (scopeInfo && !scopeInfo.locals.has(varName)) {
                const index = scopeInfo.localIndex++;
                scopeInfo.locals.set(varName, index);
                this.ir.push({ opcode: this.opcode.LocalStore, args: [index] });
              }
            }
          }
        }
      },
      Identifier: {
        enter: (path: NodePath<Identifier>) => {
          if (!path.isReferencedIdentifier()) return;
          const varName = path.node.name;
          const binding = path.scope.getBinding(varName);
          if (!binding) throw new Error(`ReferenceError: ${varName} is not defined.`);
          if (binding.scope.path.isProgram()) {
            const index = this.globals.get(varName);
            this.ir.push({ opcode: this.opcode.GlobalLoad, args: [index] });
          } else {
            const funcScope = path.findParent((p) => p.isFunction());
            if (funcScope) {
              const scopeInfo = this.functionScopes.get(funcScope.scope.uid);
              const index = scopeInfo!.locals.get(varName);
              this.ir.push({ opcode: this.opcode.LocalLoad, args: [index] });
            }
          }
        }
      },
    };
  }
}

export default Compiler;