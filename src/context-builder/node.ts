import { Scope } from "./scope"

export enum NodeKind {
  File,
  Class,
  Function,
  Field,
  Method,
  Constructor,
  Parameter,
  Variable,
  Accessor,
  TemplateString
}

export interface Node {
  kind: NodeKind
  name: string
  start: number
  end: number
  scope: Scope
  type?: string
  initializerStart?: number
  initializerEnd?: number
}