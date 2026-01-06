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

export enum ParameterKind {
  Positional,
  OptionalPositional,
  Named,
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
  extendsTypes?: string[]
  implementsTypes?: string[]
  mixins?: string[]
  parameterKind?: ParameterKind
  defaultValue?: string
  parentClass?: string
  modifiers?: string[]
  reference?: string
  documentation?: string
}

export interface ExtendableNode extends Node {
  extendsTypes?: string[]
  implementsTypes?: string[]
  mixins?: string[]
}

export interface AnnotableNode extends Node {
  annotations?: string[]
}