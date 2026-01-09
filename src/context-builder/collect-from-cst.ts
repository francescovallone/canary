/**
 * Collects symbols from the new CST (Concrete Syntax Tree) produced by the parser
 * and builds a Scope tree that can be used for resolution and hover generation.
 */

import { Token } from './lexer'
import { Node, NodeKind, ParameterKind } from './node'
import { Scope, ScopeKind } from './scope'
import { SymbolEntry, SymbolKind } from './symbol-entry'
import type { CustomFunction, CustomType, Parameter as CustomParameter, Constructor } from '../define-types'
import coreTypes from './core-types'
import { CST } from './parser'

// --- Custom types injection -------------------------------------------------

function injectCustomTypes(
  types: Array<CustomType | CustomFunction>,
  fileScope: Scope,
  nodes: Node[]
): void {
  for (const ct of types) {
    if ((ct as CustomFunction).returnType !== undefined || ct.kind === 'function') {
      registerCustomFunction(ct as CustomFunction, fileScope, nodes)
    } else {
      registerCustomType(ct as CustomType, fileScope, nodes)
    }
  }
}

function registerCustomType(type: CustomType, fileScope: Scope, nodes: Node[]): void {
  const classScope = new Scope(ScopeKind.Class, fileScope)
  const classNode: Node = {
    kind: NodeKind.Class,
    name: type.name,
    start: -1,
    end: -1,
    scope: classScope,
    type: type.name,
    extendsTypes: type.extends ? [type.extends] : [],
    typeParameters: type.typeParameters ?? [],
    documentation: type.description,
    package: type.package,
  }

  nodes.push(classNode)
  fileScope.define({ name: type.name, kind: SymbolKind.Class, node: classNode })

  // Constructors
  for (const ctor of type.constructors ?? []) {
    registerCustomConstructor(type.name, ctor, classScope, nodes)
  }

  // Instance members
  if (type.members) {
    for (const [name, member] of Object.entries(type.members)) {
      registerCustomMember(name, member, classScope, nodes, type.name, /*isStatic*/ false)
    }
  }

  // Static members
  if (type.staticMembers) {
    for (const [name, member] of Object.entries(type.staticMembers)) {
      registerCustomMember(name, member, classScope, nodes, type.name, /*isStatic*/ true)
    }
  }
}

function registerCustomConstructor(
  className: string,
  ctor: Constructor,
  classScope: Scope,
  nodes: Node[]
): void {
  const scope = new Scope(ScopeKind.Constructor, classScope)
  const ctorName = ctor.name ?? className
  const ctorNode: Node = {
    kind: NodeKind.Constructor,
    name: ctorName,
    start: -1,
    end: -1,
    scope,
    type: className,
    parentClass: className,
    documentation: ctor.description,
    typeParameters: ctor.typeParameters ?? [],
    typeArguments: ctor.typeArguments ?? [],
  }

  nodes.push(ctorNode)
  classScope.define({ name: ctorName, kind: SymbolKind.Constructor, node: ctorNode })

  for (const param of ctor.parameters ?? []) {
    createCustomParameter(param, scope, nodes, className)
  }
}

function registerCustomMember(
  name: string,
  member: string | { type: string; description?: string; typeParameters?: string[] } | { type: string; description?: string; parameters: CustomParameter[]; typeParameters?: string[] },
  classScope: Scope,
  nodes: Node[],
  className: string,
  isStatic: boolean
): void {
  // Simple field
  if (typeof member === 'string' || !(member as any).parameters) {
    const type = typeof member === 'string' ? member : (member as any).type
    const node: Node = {
      kind: NodeKind.Field,
      name,
      start: -1,
      end: -1,
      scope: classScope,
      type,
      parentClass: className,
      documentation: (member as any)?.description,
      modifiers: isStatic ? ['static'] : [],
    }
    nodes.push(node)
    classScope.define({ name, kind: SymbolKind.Field, node })
    return
  }

  // Method
  const method = member as { type: string; description?: string; parameters: CustomParameter[]; typeParameters?: string[] }
  const scopeKind = ScopeKind.Method
  const methodScope = new Scope(scopeKind, classScope)
  const node: Node = {
    kind: NodeKind.Method,
    name,
    start: -1,
    end: -1,
    scope: methodScope,
    type: method.type,
    typeParameters: method.typeParameters ?? [],
    parentClass: className,
    documentation: method.description,
    modifiers: isStatic ? ['static'] : [],
  }
  nodes.push(node)
  classScope.define({ name, kind: SymbolKind.Method, node })

  for (const param of method.parameters ?? []) {
    createCustomParameter(param, methodScope, nodes, className)
  }
}

function registerCustomFunction(func: CustomFunction, fileScope: Scope, nodes: Node[]): void {
  const funcScope = new Scope(ScopeKind.Function, fileScope)
  const node: Node = {
    kind: NodeKind.Function,
    name: func.name,
    start: -1,
    end: -1,
    scope: funcScope,
    type: func.returnType,
    typeParameters: func.typeParameters ?? [],
    documentation: func.description,
  }
  nodes.push(node)
  fileScope.define({ name: func.name, kind: SymbolKind.Function, node })

  for (const param of func.parameters ?? []) {
    createCustomParameter(param, funcScope, nodes, null)
  }
}

function createCustomParameter(param: CustomParameter, scope: Scope, nodes: Node[], currentClass: string | null): void {
  const paramKind = mapCustomParameterKind(param.kind)
  const node: Node = {
    kind: NodeKind.Parameter,
    name: param.name,
    start: -1,
    end: -1,
    scope,
    type: param.type,
    parameterKind: paramKind,
    defaultValue: param.defaultValue,
    parentClass: currentClass ?? undefined,
    modifiers: param.required ? ['required'] : [],
  }
  nodes.push(node)
  scope.define({ name: param.name, kind: SymbolKind.Parameter, node })
}

function mapCustomParameterKind(kind: CustomParameter['kind']): ParameterKind {
  switch (kind) {
    case 'named':
      return ParameterKind.Named
    case 'optionalPositional':
      return ParameterKind.OptionalPositional
    default:
      return ParameterKind.Positional
  }
}

// Get modifiers as string array
function getModifiers(modifiers: Token[]): string[] {
  return modifiers.map(m => m.lexeme)
}

export interface CollectResult {
  fileScope: Scope
  nodes: Node[]
}

export function collectFromCST(
  cst: CST.CompilationUnit,
  customTypes?: Array<CustomType | CustomFunction>
): CollectResult {
  const fileScope = new Scope(ScopeKind.File)
  const nodes: Node[] = []

  injectCustomTypes(coreTypes, fileScope, nodes)

  // Inject custom types/functions into the file scope so they can be resolved during hover/type inference
  if (customTypes?.length) {
    injectCustomTypes(customTypes, fileScope, nodes)
  }

  // Process top-level declarations
  for (const decl of cst.declarations) {
    collectDeclaration(decl, fileScope, nodes, null)
  }

  // Some parsers may surface top-level variable declarations as statements; handle them defensively
  if ((cst as any).statements) {
    for (const stmt of (cst as any).statements) {
      if (stmt?.kind === 'VariableDeclarationStatement') {
        collectVariableStatement(stmt, fileScope, nodes, null)
      }
    }
  }

  return { fileScope, nodes }
}

function collectDeclaration(
  decl: any,
  scope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  switch (decl.kind) {
    case 'ClassDeclaration':
      collectClass(decl, scope, nodes)
      break
    case 'FunctionDeclaration':
      collectFunction(decl, scope, nodes, currentClass)
      break
    case 'VariableDeclaration':
      collectVariable(decl, scope, nodes, currentClass)
      break
    case 'GetterDeclaration':
      collectGetter(decl, scope, nodes, currentClass)
      break
    case 'SetterDeclaration':
      collectSetter(decl, scope, nodes, currentClass)
      break
    case 'EnumDeclaration':
      collectEnum(decl, scope, nodes)
      break
    case 'MixinDeclaration':
      collectMixin(decl, scope, nodes)
      break
    case 'ExtensionDeclaration':
      collectExtension(decl, scope, nodes)
      break
    case 'TypedefDeclaration':
      collectTypedef(decl, scope, nodes)
      break
  }
}

function collectClass(decl: any, parentScope: Scope, nodes: Node[]): void {
  const classScope = new Scope(ScopeKind.Class, parentScope)
  const className = decl.name.lexeme

  // Extract extends, implements, with clauses
  const extendsTypes = decl.extendsClause ? [CST.typeAnnotationToString(decl.extendsClause)] : []
  const implementsTypes = decl.implementsClause?.map((t: any) => CST.typeAnnotationToString(t)) ?? []
  const mixins = decl.withClause?.map((t: any) => CST.typeAnnotationToString(t)) ?? []
  
  // Extract type parameters
  const typeParameters = decl.typeParameters?.typeParameters?.map((tp: any) => tp.name.lexeme) ?? []

  const node: Node = {
    kind: NodeKind.Class,
    name: className,
    start: decl.range[0],
    end: decl.range[1],
    scope: classScope,
    type: className,
    extendsTypes,
    implementsTypes,
    mixins,
    typeParameters,
    modifiers: getModifiers(decl.modifiers),
  }

  nodes.push(node)
  parentScope.define({
    name: className,
    kind: SymbolKind.Class,
    node,
  })

  // Collect class members
  for (const member of decl.members) {
    collectDeclaration(member, classScope, nodes, className)
  }
}

function collectFunction(
  decl: any,
  parentScope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  const funcName = decl.name.lexeme
  console.log('Collecting function:', decl.returnType)
  const returnType = CST.typeAnnotationToString(decl.returnType)
  
  // Check if this is a constructor (name matches class name)
  const isConstructor = currentClass !== null && 
    (funcName === currentClass || funcName.startsWith(`${currentClass}.`))

  const scopeKind = isConstructor ? ScopeKind.Constructor : 
    (currentClass ? ScopeKind.Method : ScopeKind.Function)
  const funcScope = new Scope(scopeKind, parentScope)

  const nodeKind = isConstructor ? NodeKind.Constructor : 
    (currentClass ? NodeKind.Method : NodeKind.Function)
  const symbolKind = isConstructor ? SymbolKind.Constructor :
    (currentClass ? SymbolKind.Method : SymbolKind.Function)

  // Extract type parameters
  const typeParameters = decl.typeParameters?.typeParameters?.map((tp: any) => tp.name.lexeme) ?? []

  const node: Node = {
    kind: nodeKind,
    name: funcName,
    start: decl.name.start,
    end: decl.name.end,
    scope: funcScope,
    type: returnType,
    typeParameters,
    parentClass: currentClass ?? undefined,
    modifiers: getModifiers(decl.modifiers),
  }

  nodes.push(node)
  parentScope.define({
    name: funcName,
    kind: symbolKind,
    node,
  })

  // Collect parameters
  if (decl.parameters?.parameters) {
    for (const param of decl.parameters.parameters) {
      collectParameter(param, funcScope, nodes, currentClass)
    }
  }
  console.log('Function parameters collected for:', funcName, decl.body)
  // Collect body statements
  if (decl.body?.kind === 'BlockFunctionBody' && decl.body.statements) {
    for (const stmt of decl.body.statements) {
      collectStatement(stmt, funcScope, nodes, currentClass)
    }
  }
}

function collectParameter(
  param: any,
  scope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  const paramName = param.name.lexeme
  let paramType = CST.typeAnnotationToString(param.type)
  let defaultValue: string | undefined = undefined
  let paramClassName = currentClass

  // For this. or super. parameters, infer type from the field if not explicitly typed
  if (!paramType && (param.isThis || param.isSuper) && currentClass) {
    const classScope = scope.parent
    if (classScope) {
      if (param.isThis) {
        // this. parameters - look in current class
        const fieldSym = classScope.resolve(paramName)
        if (fieldSym?.node.type) {
          paramType = fieldSym.node.type
        }
      } else if (param.isSuper) {
        // super. parameters - look in parent class
        // The parent class is defined in the file scope
        const fileScope = classScope.parent
        if (fileScope) {
          // Get the class symbol to find its extends clause
          const classSym = fileScope.resolve(currentClass)
          if (classSym?.node.extendsTypes?.length) {
            const parentType = classSym.node.extendsTypes[0]
            // Strip type arguments (e.g., "Animal<String>" -> "Animal")
            const parentClassName = parentType.includes('<') 
              ? parentType.substring(0, parentType.indexOf('<')) 
              : parentType
            const parentClassSym = fileScope.resolve(parentClassName)
            if (parentClassSym?.node.scope) {
              const constructor = parentClassSym.node.scope.resolve(parentClassName)
              const constructorScope = constructor?.node.scope
              const fieldSym = constructorScope?.resolve(paramName)
              if (fieldSym?.node.type) {
                paramType = fieldSym.node.type
                defaultValue = fieldSym.node.defaultValue
                paramClassName = parentClassName
              }
            }
          }
        }
      }
    }
  }

  // Determine parameter kind
  let parameterKind = ParameterKind.Positional
  if (param.isNamed) {
    parameterKind = ParameterKind.Named
  } else if (param.isOptional) {
    parameterKind = ParameterKind.OptionalPositional
  }

  const node: Node = {
    kind: NodeKind.Parameter,
    name: paramName,
    start: param.name.start,
    end: param.name.end,
    scope,
    type: paramType || undefined,
    parameterKind,
    parentClass: paramClassName ?? undefined,
    reference: param.isThis ? 'this' : (param.isSuper ? 'super' : undefined),
    modifiers: param.isRequired ? ['required'] : [],
    nullable: param.type?.isNullable ?? false,
  }

  // Extract default value if present
  if (defaultValue ?? param.defaultValue) {
    node.defaultValue = defaultValue ?? extractExpressionText(param.defaultValue)
    node.initializerStart = defaultValue ? undefined : param.defaultValue.range[0]
    node.initializerEnd = defaultValue ? undefined : param.defaultValue.range[1]
  }

  nodes.push(node)
  scope.define({
    name: paramName,
    kind: SymbolKind.Parameter,
    node,
  })
}

function collectVariable(
  decl: any,
  parentScope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  const varName = decl.name.lexeme
  let varType: string | undefined = CST.typeAnnotationToString(decl.type) || undefined
  
  const nodeKind = currentClass ? NodeKind.Field : NodeKind.Variable
  const symbolKind = currentClass ? SymbolKind.Field : SymbolKind.Variable

  // Infer type from initializer when no explicit annotation (e.g. const foo = '')
  if (!varType && decl.initializer) {
    varType = inferTypeFromExpression(decl.initializer, parentScope) || undefined
  }

  const node: Node = {
    kind: nodeKind,
    name: varName,
    start: decl.name.start,
    end: decl.name.end,
    scope: parentScope,
    type: varType || undefined,
    parentClass: currentClass ?? undefined,
    modifiers: getModifiers(decl.modifiers),
    nullable: decl.type?.isNullable ?? false,
  }

  // Extract initializer info
  if (decl.initializer) {
    node.initializerStart = decl.initializer.range[0]
    node.initializerEnd = decl.initializer.range[1]
  }

  nodes.push(node)
  parentScope.define({
    name: varName,
    kind: symbolKind,
    node,
  })
}

function collectGetter(
  decl: any,
  parentScope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  const getterName = decl.name.lexeme
  const returnType = CST.typeAnnotationToString(decl.returnType)

  const node: Node = {
    kind: NodeKind.Accessor,
    name: getterName,
    start: decl.name.start,
    end: decl.name.end,
    scope: parentScope,
    type: returnType || undefined,
    parentClass: currentClass ?? undefined,
    modifiers: [...getModifiers(decl.modifiers), 'get'],
  }

  nodes.push(node)
  parentScope.define({
    name: getterName,
    kind: SymbolKind.Accessor,
    node,
  })
}

function collectSetter(
  decl: any,
  parentScope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  const setterName = decl.name.lexeme
  const setterScope = new Scope(ScopeKind.Method, parentScope)

  const node: Node = {
    kind: NodeKind.Accessor,
    name: setterName,
    start: decl.name.start,
    end: decl.name.end,
    scope: setterScope,
    parentClass: currentClass ?? undefined,
    modifiers: [...getModifiers(decl.modifiers), 'set'],
  }

  nodes.push(node)
  parentScope.define({
    name: setterName,
    kind: SymbolKind.Accessor,
    node,
  })

  // Collect setter parameter
  if (decl.parameters?.parameters) {
    for (const param of decl.parameters.parameters) {
      collectParameter(param, setterScope, nodes, currentClass)
    }
  }
}

function collectTypedef(decl: any, parentScope: Scope, nodes: Node[]): void {
  const typedefName = decl.name.lexeme
  
  // Build the aliased type string
  let aliasedType: string
  
  if (decl.aliasedType) {
    // New-style typedef: typedef MyFunc = void Function(int);
    aliasedType = CST.typeAnnotationToString(decl.aliasedType)
  } else if (decl.returnType && decl.parameters) {
    // Old-style typedef: typedef void MyFunc(int x);
    const returnType = CST.typeAnnotationToString(decl.returnType) || 'void'
    const params: string[] = []
    if (decl.parameters?.parameters) {
      for (const param of decl.parameters.parameters) {
        const paramType = CST.typeAnnotationToString(param.type) || 'dynamic'
        const paramName = param.name?.lexeme
        if (paramName) {
          params.push(`${paramType} ${paramName}`)
        } else {
          params.push(paramType)
        }
      }
    }
    aliasedType = `${returnType} Function(${params.join(', ')})`
  } else {
    aliasedType = 'dynamic'
  }
  
  // Extract type parameters
  const typeParameters = decl.typeParameters?.typeParameters?.map((tp: any) => tp.name.lexeme) ?? []
  
  const node: Node = {
    kind: NodeKind.Typedef,
    name: typedefName,
    start: decl.name.start,
    end: decl.name.end,
    scope: parentScope,
    type: aliasedType,
    typeParameters,
  }
  
  nodes.push(node)
  parentScope.define({
    name: typedefName,
    kind: SymbolKind.Typedef,
    node,
  })
}

function collectEnum(decl: any, parentScope: Scope, nodes: Node[]): void {
  const enumScope = new Scope(ScopeKind.Class, parentScope)
  const enumName = decl.name.lexeme

  const node: Node = {
    kind: NodeKind.Class,
    name: enumName,
    start: decl.range[0],
    end: decl.range[1],
    scope: enumScope,
    type: enumName,
    modifiers: ['enum'],
  }

  nodes.push(node)
  parentScope.define({
    name: enumName,
    kind: SymbolKind.Class,
    node,
  })

  // Collect enum values as fields
  for (const value of decl.values) {
    const valueNode: Node = {
      kind: NodeKind.Field,
      name: value.name.lexeme,
      start: value.name.start,
      end: value.name.end,
      scope: enumScope,
      type: enumName,
      modifiers: ['static', 'const'],
    }
    nodes.push(valueNode)
    enumScope.define({
      name: value.name.lexeme,
      kind: SymbolKind.Field,
      node: valueNode,
    })
  }
}

function collectMixin(decl: any, parentScope: Scope, nodes: Node[]): void {
  const mixinScope = new Scope(ScopeKind.Class, parentScope)
  const mixinName = decl.name.lexeme

  const onClause = decl.onClause?.map((t: any) => CST.typeAnnotationToString(t)) ?? []
  const implementsTypes = decl.implementsClause?.map((t: any) => CST.typeAnnotationToString(t)) ?? []
  const typeParameters = decl.typeParameters?.typeParameters?.map((tp: any) => tp.name.lexeme) ?? []

  const node: Node = {
    kind: NodeKind.Class,
    name: mixinName,
    start: decl.range[0],
    end: decl.range[1],
    scope: mixinScope,
    type: mixinName,
    extendsTypes: onClause,
    implementsTypes,
    typeParameters,
    modifiers: ['mixin'],
  }

  nodes.push(node)
  parentScope.define({
    name: mixinName,
    kind: SymbolKind.Class,
    node,
  })

  // Collect mixin members
  for (const member of decl.members) {
    collectDeclaration(member, mixinScope, nodes, mixinName)
  }
}

function collectExtension(decl: any, parentScope: Scope, nodes: Node[]): void {
  const extScope = new Scope(ScopeKind.Class, parentScope)
  const extName = decl.name?.lexeme ?? ''
  const extendedType = CST.typeAnnotationToString(decl.extendedType)

  const node: Node = {
    kind: NodeKind.Class,
    name: extName,
    start: decl.range[0],
    end: decl.range[1],
    scope: extScope,
    type: extendedType,
    modifiers: ['extension'],
  }

  nodes.push(node)
  if (extName) {
    parentScope.define({
      name: extName,
      kind: SymbolKind.Class,
      node,
    })
  }

  // Collect extension members
  for (const member of decl.members) {
    collectDeclaration(member, extScope, nodes, extName || null)
  }
}

function collectStatement(
  stmt: any,
  scope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  switch (stmt.kind) {
    case 'VariableDeclarationStatement':
      collectVariableStatement(stmt, scope, nodes, currentClass)
      break
    case 'ExpressionStatement':
      // Could analyze for assignments, etc.
      break
    case 'IfStatement':
      if (stmt.thenBranch) collectStatement(stmt.thenBranch, scope, nodes, currentClass)
      if (stmt.elseBranch) collectStatement(stmt.elseBranch, scope, nodes, currentClass)
      break
    case 'ForStatement':
    case 'ForInStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
      if (stmt.body) collectStatement(stmt.body, scope, nodes, currentClass)
      break
    case 'TryStatement':
      // Could handle catch variables
      break
    // Block-like statements that contain more statements
    default:
      console.log('Collecting statements of kind:', stmt.kind)
      if (stmt.statements) {
        console.log('Collecting block statements:', stmt.statements.length)
        for (const s of stmt.statements) {
          collectStatement(s, scope, nodes, currentClass)
        }
      }
  }
}

function collectVariableStatement(
  stmt: any,
  scope: Scope,
  nodes: Node[],
  currentClass: string | null
): void {
  const varName = stmt.name.lexeme
  let varType: string | undefined = CST.typeAnnotationToString(stmt.type) || undefined
  // If no explicit type, try to infer from initializer
  if (!varType && stmt.initializer) {
    varType = inferTypeFromExpression(stmt.initializer, scope)
  }

  const node: Node = {
    kind: NodeKind.Variable,
    name: varName,
    start: stmt.name.start,
    end: stmt.name.end,
    scope,
    type: varType || undefined,
    parentClass: currentClass ?? undefined,
    modifiers: getModifiers(stmt.modifiers),
    nullable: stmt.type?.isNullable ?? false,
  }

  if (stmt.initializer) {
    node.initializerStart = stmt.initializer.range[0]
    node.initializerEnd = stmt.initializer.range[1]
  }

  nodes.push(node)
  scope.define({
    name: varName,
    kind: SymbolKind.Variable,
    node,
  })
}

function extractExpressionText(expr: any): string | undefined {
  // Simple extraction for common cases
  switch (expr.kind) {
    case 'NumberLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
      return expr.value.lexeme
    case 'StringLiteral':
      return expr.value.lexeme
    case 'Identifier':
      return expr.name.lexeme
    default:
      return undefined
  }
}

/**
 * Infer type from an expression (for variable type inference)
 */
function inferTypeFromExpression(expr: any, scope: Scope): string | undefined {
  if (!expr) return undefined
  console.log('Inferring type from expression kind:', expr.kind)
  switch (expr.kind) {
    case 'FunctionCall': {
      // FunctionCall with Identifier target could be a constructor call or function call
      if (expr.target?.kind === 'Identifier') {
        const name = expr.target.name.lexeme
        // Check if this is a class (constructor call) or function
        const sym = scope.resolve(name)
        if (sym?.kind === SymbolKind.Class) {
          return name
        } else if (sym?.kind === SymbolKind.Function) {
          // Function call - return the function's return type
          return sym.node.type
        }
      }
      return undefined
    }
    case 'ListLiteral': {
      // Prefer explicit type args if present
      const typeArg = expr.typeArguments?.types?.[0]
      if (typeArg) {
        const inner = CST.typeAnnotationToString(typeArg)
        return inner ? `List<${inner}>` : 'List<dynamic>'
      }
      const first = (expr.elements || [])[0]
      if (first) {
        let elemType = 'dynamic'
        if (first.kind === 'ExpressionElement') {
          const inferred = inferTypeFromExpression(first.expression, scope)
          if (inferred) {
            elemType = inferred
          }
        } else {
          const inferred = inferTypeFromExpression(first, scope)
          if (inferred) {
            elemType = inferred
          }
        }
        return `List<${elemType}>`
      }
      return 'List<dynamic>'
    }
    case 'RecordLiteral': {
      return inferRecordTypeFromLiteral(expr, scope)
    }
    case 'RecordTypeLiteral': {
      console.log('RecordTypeLiteral inference not implemented yet')
      return inferRecordTypeFromLiteral(expr, scope)
    }
    case 'Identifier': {
      const sym = scope.resolve(expr.name.lexeme)
      return sym?.node.type
    }
    case 'PropertyAccess': {
      // Infer type from property access (e.g., myDog.name)
      const targetType = inferTypeFromExpression(expr.target, scope)
      if (targetType) {
        const typeSym = scope.resolve(targetType)
        if (typeSym?.node.scope) {
          // Check in the class and its parent hierarchy
          const propSym = resolveClassMemberInScope(targetType, expr.propertyName?.lexeme, scope)
          return propSym?.node.type
        }
      }
      return undefined
    }
    case 'MethodInvocation': {
      // Infer return type from method invocation
      const targetType = inferTypeFromExpression(expr.target, scope)
      if (targetType) {
        const methodSym = resolveClassMemberInScope(targetType, expr.methodName?.lexeme, scope)
        if (methodSym?.node.type) {
          // Apply inheritance type substitution if the method is from a parent class
          const substitutedType = applyInheritanceTypeSubstitution(methodSym, targetType, scope)
          return substitutedType ?? methodSym.node.type
        }
      }
      return undefined
    }
    case 'FunctionExpression': {
      // Build the function type signature and create a scope for parameters
      const funcScope = new Scope(ScopeKind.Function, scope)
      const params: string[] = []
      if (expr.parameters?.parameters) {
        for (const param of expr.parameters.parameters) {
          const paramType = CST.typeAnnotationToString(param.type) || 'dynamic'
          const paramName = param.name?.lexeme
          params.push(paramType)
          
          // Add parameter to scope for return type inference
          if (paramName) {
            funcScope.define({
              name: paramName,
              kind: SymbolKind.Parameter,
              node: {
                kind: NodeKind.Parameter,
                name: paramName,
                start: param.name.start,
                end: param.name.end,
                type: paramType,
                scope: funcScope,
              },
            })
          }
        }
      }
      // Try to infer return type from body
      let returnType = 'dynamic'
      if (expr.body?.kind === 'ExpressionFunctionBody' && expr.body.expression) {
        const exprType = inferTypeFromExpression(expr.body.expression, funcScope)
        if (exprType) returnType = exprType
      } else if (expr.body?.kind === 'BlockFunctionBody' && expr.body.statements) {
        // Look for return statements
        for (const stmt of expr.body.statements) {
          if (stmt.kind === 'ReturnStatement' && stmt.expression) {
            const retType = inferTypeFromExpression(stmt.expression, funcScope)
            if (retType) {
              returnType = retType
              break
            }
          }
        }
      }
      return `${returnType} Function(${params.join(', ')})`
    }
    case 'StringLiteral':
      return 'String'
    case 'NumberLiteral':
      return expr.value.lexeme.includes('.') ? 'double' : 'int'
    case 'BooleanLiteral':
      return 'bool'
    case 'NullLiteral':
      return 'Null'
    default:
      return undefined
  }
}

function inferRecordTypeFromLiteral(expr: any, scope: Scope): string | undefined {
  const recordScope = new Scope(ScopeKind.RecordTypeLiteral, scope)
  const positionalTypes: string[] = []
  for (const value of expr.positionalFields || []) {
    const valueType = inferTypeFromExpression(value, scope) || 'dynamic'
    const i = positionalTypes.length
    recordScope.define({
      name: `$${i + 1}`,
      kind: SymbolKind.Accessor,
      node: {
        kind: NodeKind.Accessor,
        name: `$${i + 1}`,
        start: -1,
        end: -1,
        scope: recordScope,
        type: valueType,
      },
    })
    positionalTypes.push(valueType)
  }

  const namedTypes: string[] = []
  for (const field of expr.namedFields || []) {
    const valueType = inferTypeFromExpression(field.value, scope) || 'dynamic'
    recordScope.define({
      name: field.name.lexeme,
      kind: SymbolKind.Accessor,
      node: {
        kind: NodeKind.Accessor,
        name: field.name.lexeme,
        start: field.name.start,
        end: field.name.end,
        scope: recordScope,
        type: valueType,
      },
    })
    namedTypes.push(`${valueType} ${field.name.lexeme}`)
  }

  const parts: string[] = []
  if (positionalTypes.length) {
    parts.push(...positionalTypes)
  }
  if (namedTypes.length) {
    parts.push(`{${namedTypes.join(', ')}}`)
  }
  const node = {
    kind: NodeKind.RecordTypeLiteral,
    name: `(${parts.join(', ')})`,
    start: -1,
    end: -1,
    scope: recordScope,
    type: `(${parts.join(', ')})`,
  }
  scope.define({
    name: node.name,
    kind: SymbolKind.TypeLiteral,
    node,
  })
  return `(${parts.join(', ')})`
}

/**
 * Apply inheritance type substitution to a type
 * For inherited members, substitute the parent class type parameters with concrete types
 */
function applyInheritanceTypeSubstitution(
  sym: SymbolEntry,
  childClassName: string,
  scope: Scope
): string | null {
  // If the symbol is not from a parent class, no substitution needed
  if (!sym.node.parentClass || sym.node.parentClass === childClassName) {
    return null
  }
  
  // Get the child class to find its extends clause
  const childClassSym = scope.resolve(childClassName)
  if (!childClassSym || childClassSym.kind !== SymbolKind.Class) {
    return null
  }
  
  // Find the parent class in the extends types
  const parentClassName = sym.node.parentClass
  const extendsType = childClassSym.node.extendsTypes?.find((t: string) => 
    t.startsWith(parentClassName)
  )
  
  if (!extendsType) {
    return null
  }
  
  // Get the parent class to find its type parameters
  const parentClassSym = scope.resolve(parentClassName)
  if (!parentClassSym || parentClassSym.kind !== SymbolKind.Class) {
    return null
  }
  
  const parentTypeParams = parentClassSym.node.typeParameters || []
  if (parentTypeParams.length === 0) {
    return null // Parent is not generic
  }
  
  // Extract type arguments from the extends clause
  const typeArgs: string[] = []
  const match = extendsType.match(/<(.+)>/)
  if (match) {
    typeArgs.push(...match[1].split(',').map((s: string) => s.trim()))
  } else {
    typeArgs.push(...parentTypeParams.map(() => 'dynamic'))
  }
  
  // Build substitution map
  const typeMap = new Map<string, string>()
  for (let i = 0; i < Math.min(parentTypeParams.length, typeArgs.length); i++) {
    typeMap.set(parentTypeParams[i], typeArgs[i])
  }
  
  // Return the substituted type if it's a type parameter
  const originalType = sym.node.type
  if (originalType && typeMap.has(originalType)) {
    return typeMap.get(originalType) ?? originalType
  }
  
  return null
}

/**
 * Resolve a class member by name, traversing the inheritance hierarchy
 */
function resolveClassMemberInScope(className: string, memberName: string, scope: Scope): SymbolEntry | undefined {
  const visited = new Set<string>()
  
  // Helper to strip type arguments from a type name (e.g., "Animal<String>" -> "Animal")
  const stripTypeArgs = (typeName: string): string => {
    const idx = typeName.indexOf('<')
    return idx >= 0 ? typeName.substring(0, idx) : typeName
  }
  
  function searchInClass(typeName: string): SymbolEntry | undefined {
    const baseTypeName = stripTypeArgs(typeName)
    if (visited.has(baseTypeName)) return undefined
    visited.add(baseTypeName)
    
    const typeSym = scope.resolve(baseTypeName)
    if (!typeSym?.node.scope) return undefined
    
    // Check in this class's scope
    const memberSym = typeSym.node.scope.symbols.get(memberName)
    if (memberSym) return memberSym
    
    // Check in parent classes (extends)
    for (const parentType of typeSym.node.extendsTypes ?? []) {
      const found = searchInClass(parentType)
      if (found) return found
    }
    
    // Check in mixins
    for (const mixinType of typeSym.node.mixins ?? []) {
      const found = searchInClass(mixinType)
      if (found) return found
    }
    
    return undefined
  }
  
  return searchInClass(className)
}
