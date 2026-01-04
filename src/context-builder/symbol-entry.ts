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
  Class,
  Method,
  Field,
  Variable,
  Parameter,
  Property,
  Function,
  Constructor,
}