import { Scope } from "./scope"

export type TypeKind = 'simple' | 'generic' | 'function' | 'nullable' | 'never' | 'void' | 'dynamic';

export interface Type {
  kind: TypeKind
  name?: string
  typeParameters?: Type[]
  typeArguments?: Type[]
  returnType?: Type
  baseType?: Type
}

export interface InferenceVariable {
  id: string;
  constraints: Type[];
  resolved?: Type;
}

export interface InferenceResult {
  inferredType: Type;
  errors: InferenceError[];
}

export interface InferenceError {
  kind: 'mismatch' | 'signature_error' | 'inference_failed' | 'bound_violation';
  message: string;
  node: Node;
  expected?: Type;
  actual?: Type;
}

export enum NodeKind {
  File,
  Class,
  Function,
  Field,
  Method,
  Constructor,
  ConstructorInitializer,
  Parameter,
  Variable,
  Accessor,
  Extension,
  TemplateString,
  Typedef,
  RecordTypeLiteral,
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
  typeParameters?: string[]
  typeArguments?: string[]
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
  nullable?: boolean
  package?: string
  columns: [ number, number ]
}

export interface ExtendableNode extends Node {
  extendsTypes?: string[]
  implementsTypes?: string[]
  mixins?: string[]
}

export interface AnnotableNode extends Node {
  annotations?: string[]
}