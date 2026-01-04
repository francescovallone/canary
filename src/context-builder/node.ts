import { Scope } from "./scope"

export enum NodeKind {
  File,
  Class,
  Field,
  Method,
  Constructor,
  Parameter,
  Variable,
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