import { Node } from "./node";

export interface SymbolEntry {
  name: string
  kind: SymbolKind
  type?: string
  node: Node
}

export interface FieldSymbolEntry extends SymbolEntry {
  parentClass: string
}

export enum SymbolKind {
  Class = 'class',
  Method = 'method',
  Field = 'field',
  Variable = 'variable',
  Parameter = 'parameter',
  Property = 'property',
  Function = 'function',
  Constructor = 'constructor',
  InstanceExpression = 'instance_expression',
}