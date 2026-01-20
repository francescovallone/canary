import { SymbolEntry } from "./symbol-entry"

export enum ScopeKind {
  File,
  Class,
  Method,
  Constructor,
  Function,
  Block,
  RecordTypeLiteral,
  Extension
}

export class Scope {
  readonly kind: ScopeKind
  readonly parent?: Scope
  readonly symbols = new Map<string, SymbolEntry>()

  constructor(kind: ScopeKind, parent?: Scope) {
    this.kind = kind
    this.parent = parent
  }

  define(sym: SymbolEntry) {
    this.symbols.set(sym.name, sym)
  }

  resolve(name: string): SymbolEntry | undefined {
    return this.symbols.get(name) ?? this.parent?.resolve(name)
  }
}