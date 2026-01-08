/**
 * Generate hovers directly from the CST (Concrete Syntax Tree)
 * 
 * This approach walks the CST nodes and generates hovers for each meaningful
 * identifier reference, avoiding the shallow token-based resolution that
 * caused many edge cases and headaches.
 */

import { Token } from './lexer'
import { Scope, ScopeKind } from './scope'
import { SymbolEntry, SymbolKind } from './symbol-entry'
import { Node, NodeKind, ParameterKind } from './node'

// Helper to get type string from TypeAnnotation
function typeAnnotationToString(type: any): string {
  if (!type) return ''
  if (type.kind === 'TypeAnnotation') {
    let result = typeNameToString(type.typeName)
    if (type.typeArguments) {
      const args = type.typeArguments.types.map((t: any) => typeAnnotationToString(t)).join(', ')
      result += `<${args}>`
    }
    if (type.isNullable) {
      result += '?'
    }
    return result
  }
  return ''
}

function typeNameToString(typeName: any): string {
  if (!typeName) return ''
  if (typeName.kind === 'FunctionTypeName') {
    const returnType = typeAnnotationToString(typeName.returnType)
    const params = typeName.parameters?.parameters?.map((p: any) => {
      const pType = typeAnnotationToString(p.type)
      return p.name ? `${pType} ${p.name.lexeme}` : pType
    }).join(', ') ?? ''
    return `${returnType} Function(${params})`
  }
  if (typeName.kind === 'RecordTypeName') {
    const positional = (typeName.positionalFields ?? []).map((t: any) => typeAnnotationToString(t))
    const named = (typeName.namedFields ?? []).map((field: any) => `${typeAnnotationToString(field.type)} ${field.name.lexeme}`)
    const segments = [...positional]
    if (named.length) {
      segments.push(`{${named.join(', ')}}`)
    }
    return `(${segments.join(', ')})`
  }
  if (typeName.parts && typeName.parts.length > 0) {
    return typeName.parts.map((p: Token) => p.lexeme).join('.')
  }
  return ''
}

export interface Hover {
  range: { start: number; end: number }
  markdown: string
  expectedValue?: string
  documentation?: string
}

export interface HoverContext {
  fileScope: Scope
  currentClass?: string
}

/**
 * Generate hovers from a parsed CST
 */
export function generateHoversFromCST(cst: any, fileScope: Scope): Hover[] {
  const hovers: Hover[] = []
  const ctx: HoverContext = { fileScope }

  // Walk all top-level declarations
  for (const decl of cst.declarations) {
    collectHoversFromDeclaration(decl, fileScope, hovers, ctx)
  }

  // Ensure top-level variables always get a hover entry even if missed during traversal
  for (const sym of fileScope.symbols.values()) {
    if (sym.kind === SymbolKind.Variable && sym.node.start !== undefined && sym.node.end !== undefined) {
      hovers.push({
        range: { start: sym.node.start, end: sym.node.end },
        markdown: formatSymbol(sym, fileScope),
        expectedValue: sym.name,
        documentation: buildDocumentation(sym),
      })
    }
  }

  return deduplicateHovers(hovers)
}

function collectHoversFromDeclaration(
  decl: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  switch (decl.kind) {
    case 'ClassDeclaration':
      collectHoversFromClass(decl, scope, hovers, ctx)
      break
    case 'MixinDeclaration':
      collectHoversFromMixin(decl, scope, hovers, ctx)
      break
    case 'EnumDeclaration':
      collectHoversFromEnum(decl, scope, hovers, ctx)
      break
    case 'ExtensionDeclaration':
      collectHoversFromExtension(decl, scope, hovers, ctx)
      break
    case 'FunctionDeclaration':
      collectHoversFromFunction(decl, scope, hovers, ctx)
      break
    case 'VariableDeclaration':
      collectHoversFromVariable(decl, scope, hovers, ctx)
      break
    case 'GetterDeclaration':
    case 'SetterDeclaration':
      collectHoversFromAccessor(decl, scope, hovers, ctx)
      break
    case 'TypedefDeclaration':
      collectHoversFromTypedef(decl, scope, hovers, ctx)
      break
  }
}

function collectHoversFromClass(
  decl: any,
  parentScope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const className = decl.name.lexeme
  const sym = parentScope.resolve(className)
  
  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym),
      expectedValue: className,
      documentation: sym.node.documentation,
    })
  }

  // Collect hovers from type parameters
  if (decl.typeParameters?.typeParameters) {
    for (const tp of decl.typeParameters.typeParameters) {
      // Type parameter names are part of the class definition
      collectHoversFromTypeParameter(tp, hovers)
    }
  }

  // Collect hovers from extends/implements/with clauses
  if (decl.extendsClause) {
    collectHoversFromType(decl.extendsClause, parentScope, hovers, ctx)
  }
  for (const impl of decl.implementsClause || []) {
    collectHoversFromType(impl, parentScope, hovers, ctx)
  }
  for (const mixin of decl.withClause || []) {
    collectHoversFromType(mixin, parentScope, hovers, ctx)
  }

  // Get class scope and process members
  const classScope = sym?.node.scope
  if (classScope) {
    const savedClass = ctx.currentClass
    ctx.currentClass = className

    for (const member of decl.members) {
      collectHoversFromDeclaration(member, classScope, hovers, ctx)
    }

    ctx.currentClass = savedClass
  }
}

function collectHoversFromMixin(
  decl: any,
  parentScope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const mixinName = decl.name.lexeme
  const sym = parentScope.resolve(mixinName)
  
  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym),
      expectedValue: mixinName,
      documentation: sym.node.documentation,
    })
  }

  // Collect hovers from on/implements clauses
  for (const on of decl.onClause || []) {
    collectHoversFromType(on, parentScope, hovers, ctx)
  }
  for (const impl of decl.implementsClause || []) {
    collectHoversFromType(impl, parentScope, hovers, ctx)
  }

  const mixinScope = sym?.node.scope
  if (mixinScope) {
    const savedClass = ctx.currentClass
    ctx.currentClass = mixinName

    for (const member of decl.members) {
      collectHoversFromDeclaration(member, mixinScope, hovers, ctx)
    }

    ctx.currentClass = savedClass
  }
}

function collectHoversFromEnum(
  decl: any,
  parentScope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const enumName = decl.name.lexeme
  const sym = parentScope.resolve(enumName)
  
  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym),
      expectedValue: enumName,
      documentation: sym.node.documentation,
    })
  }

  const enumScope = sym?.node.scope
  if (enumScope) {
    // Collect hovers for enum values
    for (const value of decl.values || []) {
      const valueSym = enumScope.resolve(value.name.lexeme)
      if (valueSym) {
        hovers.push({
          range: { start: value.name.start, end: value.name.end },
          markdown: formatSymbol(valueSym),
          expectedValue: value.name.lexeme,
        })
      }
    }
  }
}

function collectHoversFromExtension(
  decl: any,
  parentScope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  if (decl.name) {
    const extName = decl.name.lexeme
    const sym = parentScope.resolve(extName)
    
    if (sym) {
      hovers.push({
        range: { start: decl.name.start, end: decl.name.end },
        markdown: formatSymbol(sym),
        expectedValue: extName,
        documentation: sym.node.documentation,
      })
    }
  }

  // Collect hovers from extended type
  if (decl.extendedType) {
    collectHoversFromType(decl.extendedType, parentScope, hovers, ctx)
  }

  const extName = decl.name?.lexeme || ''
  const sym = extName ? parentScope.resolve(extName) : null
  const extScope = sym?.node.scope

  if (extScope || parentScope) {
    const scope = extScope || parentScope
    const savedClass = ctx.currentClass
    ctx.currentClass = extName || undefined

    for (const member of decl.members) {
      collectHoversFromDeclaration(member, scope, hovers, ctx)
    }

    ctx.currentClass = savedClass
  }
}

function collectHoversFromTypedef(
  decl: any,
  parentScope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const typedefName = decl.name.lexeme
  const sym = parentScope.resolve(typedefName)
  
  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym),
      expectedValue: typedefName,
      documentation: sym.node.documentation,
    })
  }

  // Collect hovers from type parameters
  if (decl.typeParameters?.typeParameters) {
    for (const tp of decl.typeParameters.typeParameters) {
      collectHoversFromTypeParameter(tp, hovers)
    }
  }

  // Collect hovers from aliased type
  if (decl.aliasedType) {
    collectHoversFromType(decl.aliasedType, parentScope, hovers, ctx)
  }

  // Collect hovers from return type and parameters (old-style typedef)
  if (decl.returnType) {
    collectHoversFromType(decl.returnType, parentScope, hovers, ctx)
  }
  if (decl.parameters?.parameters) {
    for (const param of decl.parameters.parameters) {
      if (param.type) {
        collectHoversFromType(param.type, parentScope, hovers, ctx)
      }
    }
  }
}

function collectHoversFromFunction(
  decl: any,
  parentScope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const funcName = decl.name.lexeme
  const sym = parentScope.resolve(funcName)
  
  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym),
      expectedValue: funcName,
      documentation: buildDocumentation(sym),
    })
  }

  // Collect hovers from return type
  if (decl.returnType) {
    collectHoversFromType(decl.returnType, parentScope, hovers, ctx)
  }

  // Collect hovers from type parameters
  if (decl.typeParameters?.typeParameters) {
    for (const tp of decl.typeParameters.typeParameters) {
      collectHoversFromTypeParameter(tp, hovers)
    }
  }

  // Collect hovers from parameters
  const funcScope = sym?.node.scope || parentScope
  if (decl.parameters?.parameters) {
    for (const param of decl.parameters.parameters) {
      collectHoversFromParameter(param, funcScope, hovers, ctx)
    }
  }

  // Collect hovers from function body
  if (decl.body) {
    collectHoversFromFunctionBody(decl.body, funcScope, hovers, ctx)
  }
}

function collectHoversFromVariable(
  decl: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const varName = decl.name.lexeme
  const sym = scope.resolve(varName) || ctx.fileScope.resolve(varName)
  
  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym, scope),
      expectedValue: varName,
      documentation: buildDocumentation(sym),
    })
  } else {
    // Fallback: still surface a hover with best-effort type text
    const typeText = decl.type ? typeAnnotationToString(decl.type) : undefined
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: typeText ? `${typeText} ${varName}` : varName,
      expectedValue: varName,
    })
  }

  // Collect hovers from type annotation
  if (decl.type) {
    collectHoversFromType(decl.type, scope, hovers, ctx)
  }

  // Collect hovers from initializer expression
  if (decl.initializer) {
    collectHoversFromExpression(decl.initializer, scope, hovers, ctx)
  }
}

function collectHoversFromAccessor(
  decl: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const name = decl.name.lexeme
  const sym = scope.resolve(name) || ctx.fileScope.resolve(name)

  if (sym) {
    hovers.push({
      range: { start: decl.name.start, end: decl.name.end },
      markdown: formatSymbol(sym),
      expectedValue: name,
      documentation: buildDocumentation(sym),
    })
  }

  if (decl.returnType) {
    collectHoversFromType(decl.returnType, scope, hovers, ctx)
  }

  if (decl.parameters?.parameters) {
    for (const param of decl.parameters.parameters) {
      collectHoversFromParameter(param, scope, hovers, ctx)
    }
  }

  if (decl.body) {
    collectHoversFromFunctionBody(decl.body, scope, hovers, ctx)
  }
}

function collectHoversFromParameter(
  param: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const paramName = param.name.lexeme
  const sym = scope.resolve(paramName)
  
  if (sym) {
    hovers.push({
      range: { start: param.name.start, end: param.name.end },
      markdown: formatSymbol(sym),
      expectedValue: paramName,
      documentation: buildDocumentation(sym),
    })
  }

  // Collect hovers from parameter type
  if (param.type) {
    collectHoversFromType(param.type, scope, hovers, ctx)
  }

  // Collect hovers from default value
  if (param.defaultValue) {
    collectHoversFromExpression(param.defaultValue, scope, hovers, ctx)
  }
}

function collectHoversFromTypeParameter(
  tp: any,
  hovers: Hover[]
): void {
  // Type parameters are declarations, not references to existing symbols
  // We could show a simple hover for them
  hovers.push({
    range: { start: tp.name.start, end: tp.name.end },
    markdown: `\`${tp.name.lexeme}\``,
    expectedValue: tp.name.lexeme,
  })

  // If there's a bound, we could show it too
  if (tp.bound) {
    // The bound is a type reference
  }
}

function collectHoversFromType(
  type: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  if (!type) return

  if (type.kind === 'TypeAnnotation') {
    collectHoversFromTypeName(type.typeName, scope, hovers, ctx)
    
    // Collect hovers from type arguments
    if (type.typeArguments?.types) {
      for (const arg of type.typeArguments.types) {
        collectHoversFromType(arg, scope, hovers, ctx)
      }
    }
  }
}

function collectHoversFromTypeName(
  typeName: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  if (!typeName) return

  if (typeName.kind === 'FunctionTypeName') {
    // Function type: ReturnType Function(Params)
    if (typeName.returnType) {
      collectHoversFromType(typeName.returnType, scope, hovers, ctx)
    }
    if (typeName.parameters?.parameters) {
      for (const param of typeName.parameters.parameters) {
        if (param.type) {
          collectHoversFromType(param.type, scope, hovers, ctx)
        }
      }
    }
    return
  }

  if (typeName.kind === 'RecordTypeName') {
    // Hover for the whole record type
    const display = typeNameToString(typeName)
    hovers.push({
      range: { start: typeName.range[0], end: typeName.range[1] },
      markdown: display,
      expectedValue: display,
    })

    // Named fields get their own hover entries with their types
    for (const field of typeName.namedFields || []) {
      const fieldType = typeAnnotationToString(field.type)
      const fieldDisplay = `${field.name.lexeme}: ${fieldType}`
      hovers.push({
        range: { start: field.name.start, end: field.name.end },
        markdown: fieldDisplay,
        expectedValue: field.name.lexeme,
      })
      collectHoversFromType(field.type, scope, hovers, ctx)
    }

    // Positional fields: still collect nested types for completeness
    for (const positional of typeName.positionalFields || []) {
      collectHoversFromType(positional, scope, hovers, ctx)
    }
    return
  }

  // Regular type name with parts
  if (typeName.parts && typeName.parts.length > 0) {
    const firstPart = typeName.parts[0]
    const typeLexeme = firstPart.lexeme

    const typeArgs = typeName.typeArguments?.types?.map((t: any) => typeAnnotationToString(t)) ?? []

    // Try to resolve the type in scope
    const sym = scope.resolve(typeLexeme) || ctx.fileScope.resolve(typeLexeme)
    
    if (sym) {
      // If this is a typedef and has type arguments, substitute them into the aliased type
      let markdown = formatSymbol(sym)
      if (sym.kind === SymbolKind.Typedef && typeArgs.length > 0) {
        const substituted = substituteTypeParameters(sym.node.type ?? 'dynamic', sym.node.typeParameters ?? [], typeArgs)
        markdown = `typedef ${sym.name}${renderTypeParams(sym.node.typeParameters)} = ${substituted}`
      }

      hovers.push({
        range: { start: firstPart.start, end: firstPart.end },
        markdown,
        expectedValue: typeLexeme,
        documentation: sym.node.documentation,
      })
    }

    // For qualified types (a.b.c), resolve subsequent parts
    // This is simplified - we just show the first part as the main type
  }
}

function collectHoversFromFunctionBody(
  body: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  if (!body) return

  switch (body.kind) {
    case 'BlockFunctionBody':
      if (body.statements) {
        for (const stmt of body.statements) {
          collectHoversFromStatement(stmt, scope, hovers, ctx)
        }
      }
      break
    case 'ExpressionFunctionBody':
      if (body.expression) {
        collectHoversFromExpression(body.expression, scope, hovers, ctx)
      }
      break
  }
}

function collectHoversFromStatement(
  stmt: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  if (!stmt) return
  switch (stmt.kind) {
    case 'VariableDeclarationStatement':
      collectHoversFromVariable(stmt, scope, hovers, ctx)
      break
    case 'ExpressionStatement':
      if (stmt.expression) {
        collectHoversFromExpression(stmt.expression, scope, hovers, ctx)
      }
      break
    case 'ReturnStatement':
      if (stmt.expression) {
        collectHoversFromExpression(stmt.expression, scope, hovers, ctx)
      }
      break
    case 'IfStatement':
      if (stmt.condition) collectHoversFromExpression(stmt.condition, scope, hovers, ctx)
      if (stmt.thenBranch) collectHoversFromStatement(stmt.thenBranch, scope, hovers, ctx)
      if (stmt.elseBranch) collectHoversFromStatement(stmt.elseBranch, scope, hovers, ctx)
      break
    case 'ForStatement':
      if (stmt.initializer) collectHoversFromExpression(stmt.initializer, scope, hovers, ctx)
      if (stmt.condition) collectHoversFromExpression(stmt.condition, scope, hovers, ctx)
      if (stmt.increment) collectHoversFromExpression(stmt.increment, scope, hovers, ctx)
      if (stmt.body) collectHoversFromStatement(stmt.body, scope, hovers, ctx)
      break
    case 'ForInStatement':
      if (stmt.iterable) collectHoversFromExpression(stmt.iterable, scope, hovers, ctx)
      if (stmt.body) collectHoversFromStatement(stmt.body, scope, hovers, ctx)
      break
    case 'WhileStatement':
    case 'DoWhileStatement':
      if (stmt.condition) collectHoversFromExpression(stmt.condition, scope, hovers, ctx)
      if (stmt.body) collectHoversFromStatement(stmt.body, scope, hovers, ctx)
      break
    case 'SwitchStatement':
      if (stmt.expression) collectHoversFromExpression(stmt.expression, scope, hovers, ctx)
      // Handle cases
      break
    case 'TryStatement':
      if (stmt.body) collectHoversFromStatement(stmt.body, scope, hovers, ctx)
      // Handle catch clauses
      if (stmt.finallyBlock) collectHoversFromStatement(stmt.finallyBlock, scope, hovers, ctx)
      break
    case 'Block':
      if (stmt.statements) {
        for (const s of stmt.statements) {
          collectHoversFromStatement(s, scope, hovers, ctx)
        }
      }
      break
    default:
      // Handle any statements that have sub-statements
      if (stmt.statements) {
        for (const s of stmt.statements) {
          collectHoversFromStatement(s, scope, hovers, ctx)
        }
      }
  }
}

function collectHoversFromExpression(
  expr: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  if (!expr) return
  switch (expr.kind) {
    case 'Identifier':
      collectHoversFromIdentifier(expr, scope, hovers, ctx)
      break
    case 'PropertyAccess':
      collectHoversFromPropertyAccess(expr, scope, hovers, ctx)
      break
    case 'MethodInvocation':
      collectHoversFromMethodCall(expr, scope, hovers, ctx)
      break
    case 'FunctionCall':
      collectHoversFromFunctionCall(expr, scope, hovers, ctx)
      break
    case 'BinaryExpression':
      collectHoversFromExpression(expr.left, scope, hovers, ctx)
      collectHoversFromExpression(expr.right, scope, hovers, ctx)
      break
    case 'UnaryExpression':
    case 'PostfixExpression':
      collectHoversFromExpression(expr.operand, scope, hovers, ctx)
      break
    case 'ConditionalExpression':
      collectHoversFromExpression(expr.condition, scope, hovers, ctx)
      collectHoversFromExpression(expr.thenBranch, scope, hovers, ctx)
      collectHoversFromExpression(expr.elseBranch, scope, hovers, ctx)
      break
    case 'ParenthesizedExpression':
      collectHoversFromExpression(expr.expression, scope, hovers, ctx)
      break
    case 'AssignmentExpression':
      collectHoversFromExpression(expr.left, scope, hovers, ctx)
      collectHoversFromExpression(expr.right, scope, hovers, ctx)
      break
    case 'IndexExpression':
      collectHoversFromExpression(expr.target, scope, hovers, ctx)
      collectHoversFromExpression(expr.index, scope, hovers, ctx)
      break
    case 'AsExpression':
    case 'IsExpression':
      collectHoversFromExpression(expr.expression, scope, hovers, ctx)
      if (expr.type) collectHoversFromType(expr.type, scope, hovers, ctx)
      break
    case 'ThisExpression':
    case 'SuperExpression':
      // These don't need hovers - they're keywords
      break
    case 'FunctionExpression':
      collectHoversFromFunctionExpression(expr, scope, hovers, ctx)
      break
    case 'ListLiteral':
      for (const element of expr.elements || []) {
        collectHoversFromExpression(element, scope, hovers, ctx)
      }
      break
    case 'MapLiteral':
    case 'SetLiteral':
      for (const entry of expr.entries || []) {
        if (entry.key) collectHoversFromExpression(entry.key, scope, hovers, ctx)
        if (entry.value) collectHoversFromExpression(entry.value, scope, hovers, ctx)
      }
      break
    case 'RecordLiteral': {
      // Basic hover for the whole record literal
      hovers.push({
        range: { start: expr.range[0], end: expr.range[1] },
        markdown: 'record literal',
      })
      for (const field of expr.namedFields || []) {
        collectHoversFromExpression(field.value, scope, hovers, ctx)
      }
      for (const value of expr.positionalFields || []) {
        collectHoversFromExpression(value, scope, hovers, ctx)
      }
      break
    }
    case 'CascadeExpression':
      collectHoversFromExpression(expr.target, scope, hovers, ctx)
      for (const section of expr.sections || []) {
        collectHoversFromExpression(section, scope, hovers, ctx)
      }
      break
  }
}

function collectHoversFromIdentifier(
  expr: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  const name = expr.name.lexeme
  const sym = scope.resolve(name) || ctx.fileScope.resolve(name)
  
  if (sym) {
    hovers.push({
      range: { start: expr.name.start, end: expr.name.end },
      markdown: formatSymbol(sym),
      expectedValue: name,
      documentation: buildDocumentation(sym),
    })
  }
}

function collectHoversFromPropertyAccess(
  expr: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  // First collect hovers from the target
  collectHoversFromExpression(expr.target, scope, hovers, ctx)

  // Then try to resolve the property
  const propertyName = expr.propertyName?.lexeme
  if (!propertyName) return
  
  // Get the type of the target and resolve the property in that type's scope
  const targetType = inferExpressionType(expr.target, scope, ctx)
  if (targetType) {
    const propertySym = resolveClassMember(targetType, propertyName, ctx)
    if (propertySym) {
      // Substitute inherited type parameters with concrete types from the child class
      const substitutedSym = formatSymbolWithInheritanceSubstitution(propertySym, targetType, ctx)
      hovers.push({
        range: { start: expr.propertyName.start, end: expr.propertyName.end },
        markdown: substitutedSym,
        expectedValue: propertyName,
        documentation: buildDocumentation(propertySym),
      })
    }
  }
}

function collectHoversFromMethodCall(
  expr: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  // Collect hovers from target
  collectHoversFromExpression(expr.target, scope, hovers, ctx)

  // Collect hovers from method name
  const methodName = expr.methodName?.lexeme
  if (!methodName) return
  
  const targetType = inferExpressionType(expr.target, scope, ctx)
  
  if (targetType) {
    const methodSym = resolveClassMember(targetType, methodName, ctx)
    if (methodSym) {
      // Substitute inherited type parameters with concrete types from the child class
      const substitutedSym = formatSymbolWithInheritanceSubstitution(methodSym, targetType, ctx)
      hovers.push({
        range: { start: expr.methodName.start, end: expr.methodName.end },
        markdown: substitutedSym,
        expectedValue: methodName,
        documentation: buildDocumentation(methodSym),
      })
    }
  }

  // Collect hovers from arguments
  if (expr.arguments?.arguments) {
    for (const arg of expr.arguments.arguments) {
      if (arg.kind === 'NamedArgument') {
        collectHoversFromExpression(arg.value, scope, hovers, ctx)
      } else if (arg.kind === 'PositionalArgument') {
        collectHoversFromExpression(arg.expression, scope, hovers, ctx)
      } else {
        collectHoversFromExpression(arg, scope, hovers, ctx)
      }
    }
  }
}

function collectHoversFromFunctionCall(
  expr: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  // Check if this is a constructor call (target is Identifier that refers to a class)
  if (expr.target?.kind === 'Identifier') {
    const name = expr.target.name.lexeme
    const sym = ctx.fileScope.resolve(name)
    if (sym?.kind === SymbolKind.Class) {
      // This is a constructor call - find the constructor and show its signature
      const constructorSym = sym.node.scope?.resolve(sym.name)
      if (constructorSym?.kind === SymbolKind.Constructor) {
        const formattedSig = formatSymbolWithGenericSubstitution(constructorSym, expr.arguments, scope, ctx)
        hovers.push({
          range: { start: expr.target.name.start, end: expr.target.name.end },
          markdown: formattedSig,
          expectedValue: name,
          documentation: buildDocumentation(constructorSym),
        })
      } else {
        // Fallback to just showing class
        hovers.push({
          range: { start: expr.target.name.start, end: expr.target.name.end },
          markdown: formatSymbol(sym),
          expectedValue: name,
          documentation: buildDocumentation(sym),
        })
      }
    } else if (sym) {
      // It's a regular function call
      hovers.push({
        range: { start: expr.target.name.start, end: expr.target.name.end },
        markdown: formatSymbol(sym),
        expectedValue: name,
        documentation: buildDocumentation(sym),
      })
    }
  } else {
    // For non-identifier targets, recursively collect hovers
    collectHoversFromExpression(expr.target, scope, hovers, ctx)
  }

  // Collect hovers from arguments
  if (expr.arguments?.arguments) {
    for (const arg of expr.arguments.arguments) {
      if (arg.kind === 'NamedArgument') {
        collectHoversFromExpression(arg.value, scope, hovers, ctx)
      } else if (arg.kind === 'PositionalArgument') {
        collectHoversFromExpression(arg.expression, scope, hovers, ctx)
      } else {
        collectHoversFromExpression(arg, scope, hovers, ctx)
      }
    }
  }
}

function collectHoversFromFunctionExpression(
  expr: any,
  scope: Scope,
  hovers: Hover[],
  ctx: HoverContext
): void {
  // Create hover for the function expression itself
  // Build the function signature and create a temporary scope for parameters
  const funcScope = new Scope(ScopeKind.Function, scope)
  const params: string[] = []
  if (expr.parameters?.parameters) {
    for (const param of expr.parameters.parameters) {
      const paramType = param.type ? typeAnnotationToString(param.type) : 'dynamic'
      const paramName = param.name.lexeme
      params.push(`${paramType} ${paramName}`)
      
      // Create node for the parameter
      const paramNode: Node = {
        kind: NodeKind.Parameter,
        name: paramName,
        start: param.name.start,
        end: param.name.end,
        type: paramType,
        scope: funcScope,
      }
      
      // Add parameter to the function scope so we can resolve it in return statements
      const paramSymbol: SymbolEntry = {
        name: paramName,
        kind: SymbolKind.Parameter,
        node: paramNode,
      }
      funcScope.define(paramSymbol)
      
      // Add hover for the parameter name
      hovers.push({
        range: { start: param.name.start, end: param.name.end },
        markdown: formatSymbol(paramSymbol, funcScope),
        expectedValue: paramName,
        documentation: 'Parameter',
      })
      
      // Also collect hovers from parameter types
      if (param.type) {
        collectHoversFromType(param.type, scope, hovers, ctx)
      }
    }
  }
  
  // Infer return type from body if possible
  let returnType = 'dynamic'
  if (expr.body?.kind === 'ExpressionFunctionBody') {
    returnType = inferExpressionType(expr.body.expression, funcScope, ctx) || 'dynamic'
  } else if (expr.body?.kind === 'BlockFunctionBody') {
    // Try to infer from return statements
    const retType = inferReturnTypeFromBlock(expr.body, funcScope, ctx)
    if (retType) returnType = retType
  }
  
  const signature = `${returnType} Function(${params.join(', ')})`
  
  // Add hover for the function expression at its starting position
  if (expr.range) {
    hovers.push({
      range: { start: expr.range[0], end: expr.range[0] + 1 },
      markdown: signature,
      expectedValue: '(',
      documentation: 'Anonymous function expression',
    })
  }

  // Process function body with funcScope so parameters can be resolved
  if (expr.body) {
    collectHoversFromFunctionBody(expr.body, funcScope, hovers, ctx)
  }
}

/**
 * Infer return type from block function body by looking at return statements
 */
function inferReturnTypeFromBlock(body: any, scope: Scope, ctx: HoverContext): string | undefined {
  if (!body?.statements) return undefined
  
  for (const stmt of body.statements) {
    if (stmt.kind === 'ReturnStatement' && stmt.expression) {
      return inferExpressionType(stmt.expression, scope, ctx)
    }
  }
  return undefined
}

/**
 * Resolve a class member by name, traversing the inheritance hierarchy
 */
function resolveClassMember(className: string, memberName: string, ctx: HoverContext): SymbolEntry | undefined {
  const visited = new Set<string>()
  
  function searchInClass(typeName: string): SymbolEntry | undefined {
    if (visited.has(typeName)) return undefined
    visited.add(typeName)
    if (typeName.includes('<')) {
      typeName = typeName.split('<')[0]
    }
    const typeSym = ctx.fileScope.resolve(typeName)
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

// Helper to infer the type of an expression (simplified)
function inferExpressionType(expr: any, scope: Scope, ctx: HoverContext): string | undefined {
  if (!expr) return undefined

  switch (expr.kind) {
    case 'Identifier': {
      const sym = scope.resolve(expr.name.lexeme) || ctx.fileScope.resolve(expr.name.lexeme)
      return sym?.node.type
    }
    case 'PropertyAccess': {
      const targetType = inferExpressionType(expr.target, scope, ctx)
      if (targetType) {
        const propSym = resolveClassMember(targetType, expr.propertyName?.lexeme, ctx)
        return propSym?.node.type
      }
      return undefined
    }
    case 'FunctionCall': {
      // FunctionCall with Identifier target could be a constructor call or function call
      if (expr.target?.kind === 'Identifier') {
        const name = expr.target.name.lexeme
        const sym = scope.resolve(name) || ctx.fileScope.resolve(name)
        if (sym?.kind === SymbolKind.Class) {
          // Constructor call - return the class name as type
          return name
        } else if (sym?.kind === SymbolKind.Function) {
          // Function call - return the function's return type
          return sym.node.type
        }
      }
      return undefined
    }
    case 'MethodInvocation': {
      // Infer return type from the method
      const targetType = inferExpressionType(expr.target, scope, ctx)
      if (targetType) {
        const methodSym = resolveClassMember(targetType, expr.methodName?.lexeme, ctx)
        if (methodSym?.node.type) {
          // Apply inheritance type substitution to the return type
          const typeMap = buildInheritanceTypeMap(methodSym, targetType, ctx)
          if (typeMap && typeMap.size > 0) {
            return typeMap.get(methodSym.node.type) ?? methodSym.node.type
          }
          return methodSym.node.type
        }
      }
      return undefined
    }
    case 'ThisExpression':
      return ctx.currentClass
    case 'FunctionExpression': {
      // Build the function type signature and create a scope for parameters
      const funcScope = new Scope(ScopeKind.Function, scope)
      const params: string[] = []
      if (expr.parameters?.parameters) {
        for (const param of expr.parameters.parameters) {
          const paramType = param.type ? typeAnnotationToString(param.type) : 'dynamic'
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
              } as Node,
            })
          }
        }
      }
      // Try to infer return type from body
      let returnType = 'dynamic'
      if (expr.body?.kind === 'ExpressionFunctionBody' && expr.body.expression) {
        const exprType = inferExpressionType(expr.body.expression, funcScope, ctx)
        if (exprType) returnType = exprType
      } else if (expr.body?.kind === 'BlockFunctionBody') {
        const retType = inferReturnTypeFromBlock(expr.body, funcScope, ctx)
        if (retType) returnType = retType
      }
      return `${returnType} Function(${params.join(', ')})`
    }
    case 'StringLiteral':
      return 'String'
    case 'NumberLiteral':
      return expr.value?.lexeme?.includes('.') ? 'double' : 'int'
    case 'BooleanLiteral':
      return 'bool'
    case 'NullLiteral':
      return 'Null'
    case 'ListLiteral':
      // Try to infer generic argument if present or from first element
      if (expr.typeArguments?.types?.[0]) {
        const inner = typeAnnotationToString(expr.typeArguments.types[0])
        return inner ? `List<${inner}>` : 'List<dynamic>'
      }
      const first = (expr.elements || [])[0]
      if (first) {
        const elemType = inferExpressionType(first, scope, ctx) || 'dynamic'
        return `List<${elemType}>`
      }
      return 'List<dynamic>'
    case 'MapLiteral':
      // Try to infer key/value generic args
      if (expr.typeArguments?.types?.length === 2) {
        const k = typeAnnotationToString(expr.typeArguments.types[0]) || 'dynamic'
        const v = typeAnnotationToString(expr.typeArguments.types[1]) || 'dynamic'
        return `Map<${k}, ${v}>`
      }
      const firstEntry = (expr.entries || [])[0]
      if (firstEntry && firstEntry.key && firstEntry.value) {
        const k = inferExpressionType(firstEntry.key, scope, ctx) || 'dynamic'
        const v = inferExpressionType(firstEntry.value, scope, ctx) || 'dynamic'
        return `Map<${k}, ${v}>`
      }
      return 'Map<dynamic, dynamic>'
    case 'SetLiteral':
      if (expr.typeArguments?.types?.[0]) {
        const inner = typeAnnotationToString(expr.typeArguments.types[0])
        return inner ? `Set<${inner}>` : 'Set<dynamic>'
      }
      const firstSet = (expr.elements || [])[0]
      if (firstSet) {
        const elemType = inferExpressionType(firstSet, scope, ctx) || 'dynamic'
        return `Set<${elemType}>`
      }
      return 'Set<dynamic>'
    default:
      return undefined
  }
}

function getTypeBaseName(type: any): string {
  if (!type) return ''
  if (type.kind === 'TypeAnnotation' && type.typeName?.parts?.length > 0) {
    return type.typeName.parts[0].lexeme
  }
  return ''
}

// Convert a TypeAnnotation node (from the CST) to a string like "Foo<Bar>".


// Formatting functions (kept from original resolve.ts)
/**
 * Format a symbol with generic type substitution based on actual arguments
 */
function formatSymbolWithGenericSubstitution(
  sym: SymbolEntry,
  argList: any,
  scope: Scope,
  ctx: HoverContext
): string {
  // If no type parameters, just use the regular format
  if (!sym.node.typeParameters || sym.node.typeParameters.length === 0) {
    return formatSymbol(sym)
  }
  
  // Build a map of type parameter to inferred type
  const typeMap = new Map<string, string>()
  const typeParams = sym.node.typeParameters
  
  // Get the parameters of the method
  const parameters = sym.node.scope 
    ? Array.from(sym.node.scope.symbols.values()).filter(s => s.kind === SymbolKind.Parameter)
    : []
  const positionalParams = parameters.filter(p => p.node.parameterKind === ParameterKind.Positional)
  
  // Match arguments to parameters and infer types
  const args = argList?.arguments ?? []
  let argIndex = 0
  
  for (const arg of args) {
    if (arg.kind === 'PositionalArgument' && argIndex < positionalParams.length) {
      const param = positionalParams[argIndex]
      const paramType = param.node.type
      
      // Check if the parameter type is a type parameter
      if (paramType && typeParams.includes(paramType)) {
        // Infer the actual type from the argument
        const argExpr = arg.expression
        const inferredType = inferExpressionType(argExpr, scope, ctx)
        if (inferredType) {
          typeMap.set(paramType, inferredType)
        }
      }
      argIndex++
    } else if (arg.kind !== 'NamedArgument') {
      // Direct expression (not wrapped)
      if (argIndex < positionalParams.length) {
        const param = positionalParams[argIndex]
        const paramType = param.node.type
        
        if (paramType && typeParams.includes(paramType)) {
          const inferredType = inferExpressionType(arg, scope, ctx)
          if (inferredType) {
            typeMap.set(paramType, inferredType)
          }
        }
        argIndex++
      }
    }
  }
  
  // If we didn't infer any types, just use the regular format
  if (typeMap.size === 0) {
    return formatSymbol(sym)
  }
  
  // Build the formatted symbol with substituted types
  return formatSymbolWithSubstitution(sym, typeMap)
}

/**
 * Format a symbol with type substitution map
 */
function formatSymbolWithSubstitution(sym: SymbolEntry, typeMap: Map<string, string>): string {
  const substituteType = (type: string): string => {
    const substituted = typeMap.get(type) ?? type
    return resolveTypeAlias(substituted, sym.node.scope?.parent)
  }
  
  const type = substituteType(sym.node.type ?? 'dynamic')
  const parameters = sym.node.scope 
    ? Array.from(sym.node.scope.symbols.values()).filter(s => s.kind === SymbolKind.Parameter) 
    : []

  const positional = parameters.filter(p => p.node.parameterKind === ParameterKind.Positional)
  const optionalPositional = parameters.filter(p => p.node.parameterKind === ParameterKind.OptionalPositional)
  const named = parameters.filter(p => p.node.parameterKind === ParameterKind.Named)

  const paramLines: string[] = []

  // Positional parameters
  for (const p of positional) {
    const pType = substituteType(p.node.type ?? 'dynamic')
    paramLines.push(`  ${pType}${p.node.nullable ? '?' : ''} ${p.name},`)
  }

  // Optional positional (enclosed in [])
  if (optionalPositional.length > 0) {
    paramLines.push('  [')
    for (const p of optionalPositional) {
      const pType = substituteType(p.node.type ?? 'dynamic')
      paramLines.push(`    ${pType}${p.node.nullable ? '?' : ''} ${p.name}${p.node.defaultValue ? ` = ${p.node.defaultValue}` : ''},`)
    }
    if (paramLines[paramLines.length - 1].endsWith(',')) {
      paramLines[paramLines.length - 1] = paramLines[paramLines.length - 1].replace(/,$/, '')
    }
    paramLines.push('  ],')
  }

  // Named parameters (enclosed in {})
  if (named.length > 0) {
    paramLines.push('  {')
    for (const p of named) {
      const pType = substituteType(p.node.type ?? 'dynamic')
      const modifiers = (p.node.modifiers?.length ?? 0) > 0 ? p.node.modifiers?.join(' ') + ' ' : ''
      paramLines.push(`    ${modifiers}${pType}${p.node.nullable ? '?' : ''} ${p.name}${p.node.defaultValue ? ` = ${p.node.defaultValue}` : ''},`)
    }
    if (paramLines[paramLines.length - 1].endsWith(',')) {
      paramLines[paramLines.length - 1] = paramLines[paramLines.length - 1].replace(/,$/, '')
    }
    paramLines.push('  }')
  }

  let parameterBlock = ''
  if (paramLines.length > 0) {
    parameterBlock = '\n' + paramLines.join('\n') + '\n'
  }

  // For methods, return without the type parameters since they're now concrete
  if (sym.kind === SymbolKind.Method || sym.kind === SymbolKind.Function) {
    return `${type}${sym.node.nullable ? '?' : ''} ${sym.name}(${parameterBlock})`
  }
  
  // Fallback to normal formatting
  return formatSymbol(sym)
}

/**
 * Build a map of type parameter substitutions for inherited members
 * Returns a map from parent class type parameters to concrete types
 */
function buildInheritanceTypeMap(
  sym: SymbolEntry,
  childClassName: string,
  ctx: HoverContext
): Map<string, string> | null {
  
  // If the symbol is not from a parent class, no substitution needed
  if (!sym.node.parentClass || sym.node.parentClass === childClassName) {
    return null
  }
  
  // Get the child class to find its extends clause
  const childClassSym = ctx.fileScope.resolve(childClassName)
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
  const parentClassSym = ctx.fileScope.resolve(parentClassName)
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
  
  return typeMap
}

/**
 * Format a symbol with inherited type parameter substitution
 * For members inherited from generic parent classes, substitute the parent's type parameters
 * with the concrete types from the child class's extends clause
 */
function formatSymbolWithInheritanceSubstitution(
  sym: SymbolEntry,
  childClassName: string,
  ctx: HoverContext
): string {
  // If the symbol is not from a parent class, just format normally
  if (!sym.node.parentClass || sym.node.parentClass === childClassName) {
    return formatSymbol(sym)
  }
  
  // Get the child class to find its extends clause
  const childClassSym = ctx.fileScope.resolve(childClassName)
  if (!childClassSym || childClassSym.kind !== SymbolKind.Class) {
    return formatSymbol(sym)
  }
  
  // Find the parent class in the extends types
  const parentClassName = sym.node.parentClass
  const extendsType = childClassSym.node.extendsTypes?.find((t: string) => 
    t.startsWith(parentClassName)
  )
  
  if (!extendsType) {
    return formatSymbol(sym)
  }
  
  // Get the parent class to find its type parameters
  const parentClassSym = ctx.fileScope.resolve(parentClassName)
  if (!parentClassSym || parentClassSym.kind !== SymbolKind.Class) {
    return formatSymbol(sym)
  }
  
  const parentTypeParams = parentClassSym.node.typeParameters || []
  if (parentTypeParams.length === 0) {
    return formatSymbol(sym) // Parent is not generic
  }
  
  // Extract type arguments from the extends clause
  // Format: "Animal<String, int>" or "Animal" (defaults to dynamic)
  const typeArgs: string[] = []
  const match = extendsType.match(/<(.+)>/)
  if (match) {
    // Parse type arguments
    typeArgs.push(...match[1].split(',').map((s: string) => s.trim()))
  } else {
    // No type arguments provided, use dynamic for each parameter
    typeArgs.push(...parentTypeParams.map(() => 'dynamic'))
  }
  
  // Build substitution map
  const typeMap = new Map<string, string>()
  for (let i = 0; i < Math.min(parentTypeParams.length, typeArgs.length); i++) {
    typeMap.set(parentTypeParams[i], typeArgs[i])
  }
  // Use formatSymbolWithSubstitution to apply the map
  return formatSymbolWithSubstitution(sym, typeMap)
}

/**
 * Resolve a typedef type to its actual signature
 * @param typeName The type name to resolve (e.g., "StringCallback")
 * @param scope The scope to search for the typedef
 * @returns The resolved type signature, or undefined if not a typedef
 */
function resolveTypedefType(typeName: string, scope: Scope | undefined): string | undefined {
  if (!scope || !typeName) return undefined

  // Preserve nullability suffix while resolving the alias
  const isNullable = typeName.endsWith('?')
  const coreType = isNullable ? typeName.slice(0, -1) : typeName

  // Split out generic arguments, e.g. StringCallback<String>
  let baseName = coreType
  let typeArgs: string[] = []
  const genericMatch = coreType.match(/^(.*?)<(.+)>$/)
  if (genericMatch) {
    baseName = genericMatch[1]
    typeArgs = genericMatch[2].split(',').map(arg => arg.trim())
  }

  const typedefSym = scope.resolve(baseName)
  if (typedefSym?.kind !== SymbolKind.Typedef) return undefined

  const params = typedefSym.node.typeParameters ?? []
  const targetType = typedefSym.node.type ?? 'dynamic'

  if (params.length === 0) {
    return isNullable ? `${targetType}?` : targetType
  }

  // Fill missing args with dynamic to keep arity aligned
  const filledArgs = typeArgs.length > 0 ? typeArgs : params.map(() => 'dynamic')
  const substituted = substituteTypeParameters(targetType, params, filledArgs)
  return isNullable ? `${substituted}?` : substituted
}

function resolveTypeAlias(typeName: string | undefined, scope: Scope | undefined): string {
  if (!typeName) return 'dynamic'
  const resolved = resolveTypedefType(typeName, scope)
  return resolved ?? typeName
}

function formatSymbol(sym: SymbolEntry, scope?: Scope): string {
  const resolutionScope = scope ?? sym.node.scope?.parent
  let type = resolveTypeAlias(sym.node.type, resolutionScope)
  
  const parameters = sym.node.scope 
    ? Array.from(sym.node.scope.symbols.values()).filter(s => s.kind === SymbolKind.Parameter) 
    : []

  const positional = parameters.filter(p => p.node.parameterKind === ParameterKind.Positional)
  const optionalPositional = parameters.filter(p => p.node.parameterKind === ParameterKind.OptionalPositional)
  const named = parameters.filter(p => p.node.parameterKind === ParameterKind.Named)

  const paramLines: string[] = []

  // Positional parameters
  for (const p of positional) {
    const pType = resolveTypeAlias(p.node.type, resolutionScope)
    paramLines.push(`  ${pType}${p.node.nullable ? '?' : ''} ${p.name},`)
  }

  // Optional positional (enclosed in [])
  if (optionalPositional.length > 0) {
    paramLines.push('  [')
    for (const p of optionalPositional) {
      const pType = resolveTypeAlias(p.node.type, resolutionScope)
      paramLines.push(`    ${pType}${p.node.nullable ? '?' : ''} ${p.name}${p.node.defaultValue ? ` = ${p.node.defaultValue}` : ''},`)
    }
    if (paramLines[paramLines.length - 1].endsWith(',')) {
      paramLines[paramLines.length - 1] = paramLines[paramLines.length - 1].replace(/,$/, '')
    }
    paramLines.push('  ],')
  }

  // Named parameters (enclosed in {})
  if (named.length > 0) {
    paramLines.push('  {')
    for (const p of named) {
      const pType = resolveTypeAlias(p.node.type, resolutionScope)
      const modifiers = (p.node.modifiers?.length ?? 0) > 0 ? p.node.modifiers?.join(' ') + ' ' : ''
      paramLines.push(`    ${modifiers}${pType}${p.node.nullable ? '?' : ''} ${p.name}${p.node.defaultValue ? ` = ${p.node.defaultValue}` : ''},`)
    }
    if (paramLines[paramLines.length - 1].endsWith(',')) {
      paramLines[paramLines.length - 1] = paramLines[paramLines.length - 1].replace(/,$/, '')
    }
    paramLines.push('  }')
  }

  let parameterBlock = ''
  if (paramLines.length > 0) {
    parameterBlock = '\n' + paramLines.join('\n') + '\n'
  }
  switch (sym.kind) {
    case SymbolKind.Class:
      const additionalParts: string[] = []
      const generics = renderTypeParams(sym.node.typeParameters)
      if ((sym.node.extendsTypes?.length ?? 0) > 0) {
        const resolvedTypes = sym.node.extendsTypes?.map(t => {
          const resolved = resolveInheritanceType(t, sym.node.scope)
          return resolved ?? t
        })
        additionalParts.push(`extends ${resolvedTypes?.join(', ')}`)
      }
      if ((sym.node.implementsTypes?.length ?? 0) > 0) {
        additionalParts.push(`implements ${sym.node.implementsTypes?.join(', ')}`)
      }
      if ((sym.node.mixins?.length ?? 0) > 0) {
        additionalParts.push(`with ${sym.node.mixins?.join(', ')}`)
      }
      return `\`class ${sym.name}${generics}${additionalParts.length > 0 ? ' ' + additionalParts.join(' ') : ''}\``
    
    case SymbolKind.Variable:
    case SymbolKind.Field:
      return `${type}${sym.node.nullable ? '?' : ''} ${sym.name}`
    
    case SymbolKind.Parameter:
      if (sym.node.parameterKind === ParameterKind.OptionalPositional) {
        return `[${type}${sym.node.nullable ? '?' : ''} ${sym.name}${sym.node.defaultValue ? ` = ${sym.node.defaultValue}` : ''}]`
      }
      if (sym.node.parameterKind === ParameterKind.Named) {
        return `{${(sym.node.modifiers?.length ?? 0) > 0 ? sym.node.modifiers?.join(' ') + ' ' : ''}${type}${sym.node.nullable ? '?' : ''} ${sym.name}${sym.node.defaultValue ? ` = ${sym.node.defaultValue}` : ''}}`
      }
      return `${type}${sym.node.nullable ? '?' : ''} ${sym.name}`
    
    case SymbolKind.Function:
    case SymbolKind.Method:
      return `${type}${sym.node.nullable ? '?' : ''} ${sym.name}${renderTypeParams(sym.node.typeParameters)}(${parameterBlock})`
    
    case SymbolKind.Constructor:
      const modifier = sym.node.modifiers?.[0] === undefined ? '' : `${sym.node.modifiers?.join(' ')} `
      return `${modifier}${sym.name}${renderTypeParams(sym.node.typeParameters)}(${parameterBlock})`
    
    case SymbolKind.Accessor:
      const accessorMod = sym.node.modifiers?.includes('get') ? 'get ' : 
                          sym.node.modifiers?.includes('set') ? 'set ' : ''
      return `${type}${sym.node.nullable ? '?' : ''} ${accessorMod}${sym.name}`
    
    case SymbolKind.Typedef:
      // Show alias name and resolved target signature
      return `typedef ${sym.name}${renderTypeParams(sym.node.typeParameters)} = ${type}`
    
    default:
      return `**${sym.name}**`
  }
}

function renderTypeParams(params?: string[]): string {
  if (!params || params.length === 0) return ''
  return `<${params.join(', ')}>`
}

function substituteTypeParameters(typeStr: string, typeParams: string[], typeArgs: string[]): string {
  if (!typeParams || typeParams.length === 0) return typeStr
  let result = typeStr
  const count = Math.min(typeParams.length, typeArgs.length)
  for (let i = 0; i < count; i++) {
    const from = typeParams[i]
    const to = typeArgs[i]
    const re = new RegExp(`\\b${from}\\b`, 'g')
    result = result.replace(re, to)
  }
  return result
}

function buildDocumentation(sym: SymbolEntry): string | undefined {
  const parts: string[] = []
  
  if (sym.node.parentClass) {
    let declared = `Declared in \`${sym.node.parentClass}\``
    if (sym.node.package) declared += ` in \`${sym.node.package}\``
    parts.push(declared)
  }
  
  if (sym.node.documentation) {
    if (parts.length > 0) {
      parts.push('')
    }
    parts.push(sym.node.documentation)
  }
  
  return parts.length > 0 ? parts.join('\n\n') : undefined
}

function deduplicateHovers(hovers: Hover[]): Hover[] {
  const seen = new Set<string>()
  return hovers.filter(h => {
    const key = `${h.range.start}:${h.range.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function resolveInheritanceType(typeName: string, scope: Scope | undefined): string | undefined {
  if (!scope) return undefined
  
  // Check if typeName already has type arguments (e.g., "Animal<String>")
  if (typeName.includes('<')) {
    return typeName // Already has type arguments
  }
  
  // Look up the class to see if it's generic
  const classSym = scope.resolve(typeName) || scope.parent?.resolve(typeName)
  if (classSym?.kind === SymbolKind.Class) {
    if (classSym.node.typeParameters && classSym.node.typeParameters.length > 0) {
      // Generic class without type arguments - add <dynamic> for each parameter
      const dynamicArgs = classSym.node.typeParameters.map(() => 'dynamic').join(', ')
      return `${typeName}<${dynamicArgs}>`
    }
  }
  
  return typeName
}

