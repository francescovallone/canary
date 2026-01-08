import { Node, ParameterKind } from "./node";

export interface SymbolEntry {
  name: string
  kind: SymbolKind
  node: Node
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
  Accessor = 'accessor',
  TemplateString = 'template_string',
  Typedef = 'typedef',
}