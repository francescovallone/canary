import { lexDart, Token, TokenKind } from './lexer'

export interface Hover {
  range: { start: number; end: number }
  content: string
}

export interface InspectResult {
  hovers: Hover[]
  tokens: Token[]
  ignoreErrors: boolean
}

/**
 * Custom type definition for external types JSON.
 * Allows defining classes, their members, and static methods.
 */
export interface CustomType {
  /** The name of the class/type */
  name: string
  /** Description shown on hover (optional) */
  description?: string
  /** Optional base type this custom type extends */
  extends?: string
  /** Members of the class (properties and methods) */
  members?: Record<string, string | { type: string; description?: string }>
  /** Static members accessible via ClassName.member */
  staticMembers?: Record<string, string | { type: string; description?: string }>
  /** Constructors - if present, the type can be instantiated */
  constructors?: string[]
}

export interface CustomTypesConfig {
  types: CustomType[]
}

export interface InspectOptions {
  customTypes?: CustomTypesConfig
}

const PRIMITIVES = new Set(['int', 'double', 'bool', 'String', 'dynamic'])

interface InspectDirective {
  kind: 'type'
  tokenIndex: number
}

export function inspectDart(code: string, options?: InspectOptions): InspectResult {
  const tokens = lexDart(code)
  const { classes, extendsMap } = collectClassesAndExtends(tokens)
  const customTypeMap = buildCustomTypeMap(options?.customTypes)
  
  // Add custom types to known classes
  for (const [typeName, typeDef] of customTypeMap.entries()) {
    classes.add(typeName)
    if (typeDef.extends) {
      extendsMap.set(typeName, typeDef.extends)
      classes.add(typeDef.extends)
    }
  }
  
  const variables = collectVariables(tokens, classes)
  const { directives, ignoreErrors } = collectDirectives(tokens)

  const hovers: Hover[] = []
  for (const directive of directives) {
    const target = findTarget(tokens, directive.tokenIndex)
    if (!target) continue

    const hover = buildHover(target, variables, classes, customTypeMap, extendsMap)
    if (hover) hovers.push(hover)

    if (target.extendsType) {
      const extendsHover = buildExtendsHover(target.extendsType, classes, customTypeMap)
      if (extendsHover) hovers.push(extendsHover)
    }
  }

  return { hovers, tokens, ignoreErrors }
}

function buildCustomTypeMap(config?: CustomTypesConfig): Map<string, CustomType> {
  const map = new Map<string, CustomType>()
  if (!config?.types) return map
  for (const type of config.types) {
    map.set(type.name, type)
  }
  return map
}

function collectDirectives(tokens: Token[]): { directives: InspectDirective[]; ignoreErrors: boolean } {
  const directives: InspectDirective[] = []
  let ignoreErrors = false

  tokens.forEach((token, index) => {
    if (token.kind !== TokenKind.LineComment) return
    if (token.text.includes('inspect:ignore-errors')) ignoreErrors = true
    if (token.text.includes('inspect:type')) directives.push({ kind: 'type', tokenIndex: index })
  })

  return { directives, ignoreErrors }
}

function collectClassesAndExtends(tokens: Token[]): { classes: Set<string>; extendsMap: Map<string, string> } {
  const classes = new Set<string>()
  const extendsMap = new Map<string, string>()

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.kind === TokenKind.Keyword && token.text === 'class') {
      const classIdent = nextNonTrivia(tokens, i + 1, TokenKind.ClassIdentifier)
      if (!classIdent) continue
      classes.add(classIdent.text)

      const maybeExtends = nextNonTrivia(tokens, tokens.indexOf(classIdent) + 1)
      if (maybeExtends && maybeExtends.text === 'extends') {
        const baseIdent = nextNonTrivia(tokens, tokens.indexOf(maybeExtends) + 1, TokenKind.Identifier)
        if (baseIdent) {
          extendsMap.set(classIdent.text, baseIdent.text)
          classes.add(baseIdent.text)
        }
      }
    }
  }

  return { classes, extendsMap }
}

function collectVariables(tokens: Token[], classes: Set<string>): Map<string, string> {
  const variables = new Map<string, string>()

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Typed declaration: <Type> <name> ...
    if (isTypeToken(token, classes)) {
      const nameToken = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (nameToken) {
        const inferred = token.text
        variables.set(nameToken.text, inferred)
        const initializerType = inferInitializerType(tokens, i + 1, classes)
        if (initializerType !== 'unknown') variables.set(nameToken.text, initializerType)
      }
      continue
    }

    // final / var declaration
    if (token.kind === TokenKind.Keyword && (token.text === 'final' || token.text === 'var')) {
      const nameToken = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (!nameToken) continue
      const initializerType = inferInitializerType(tokens, tokens.indexOf(nameToken), classes)
      variables.set(nameToken.text, initializerType)
      continue
    }
  }

  return variables
}

function inferInitializerType(tokens: Token[], startIndex: number, classes: Set<string>): string {
  const equalsToken = findToken(tokens, startIndex + 1, token => token.kind === TokenKind.Symbol && token.text === '=')
  if (!equalsToken) return 'unknown'
  const valueToken = nextNonTrivia(tokens, tokens.indexOf(equalsToken) + 1)
  if (!valueToken) return 'unknown'

  if (valueToken.kind === TokenKind.StringLiteral) return 'String'
  if (valueToken.kind === TokenKind.NumberLiteral) return valueToken.text.includes('.') ? 'double' : 'int'
  if (valueToken.kind === TokenKind.Keyword && (valueToken.text === 'true' || valueToken.text === 'false')) return 'bool'

  if (valueToken.kind === TokenKind.Identifier || valueToken.kind === TokenKind.Keyword) {
    const text = valueToken.text
    if (PRIMITIVES.has(text)) return text
    if (classes.has(text)) return text

    const maybeCall = nextNonTrivia(tokens, tokens.indexOf(valueToken) + 1)
    if (maybeCall && maybeCall.kind === TokenKind.Symbol && maybeCall.text === '(' && classes.has(text)) {
      return text
    }
  }

  return 'unknown'
}

function isTypeToken(token: Token, classes: Set<string>): boolean {
  if (token.kind === TokenKind.Keyword && PRIMITIVES.has(token.text)) return true
  if ((token.kind === TokenKind.Identifier || token.kind === TokenKind.ClassIdentifier) && classes.has(token.text)) return true
  return false
}

interface TargetToken {
  base: Token
  property?: Token
  extendsType?: Token
}

function findTarget(tokens: Token[], directiveIndex: number): TargetToken | null {
  // Grab the very next syntactic token (skip trivia only)
  let cursor = nextNonTrivia(tokens, directiveIndex + 1)
  if (!cursor) return null

  // If the directive precedes "final/var" or a type keyword, move to the following identifier
  if (cursor.kind === TokenKind.Keyword || cursor.kind === TokenKind.Identifier || cursor.kind === TokenKind.ClassIdentifier) {
    // final|var Foo x => jump to the declared identifier
    const maybeName = nextNonTrivia(tokens, tokens.indexOf(cursor) + 1, TokenKind.Identifier)
    if (maybeName) cursor = maybeName
  }

  if (cursor.kind !== TokenKind.Identifier && cursor.kind !== TokenKind.ClassIdentifier) return null

  // Class Foo extends Bar => capture the base type too
  const maybeExtends = nextNonTrivia(tokens, tokens.indexOf(cursor) + 1, TokenKind.Keyword)
  if (maybeExtends && maybeExtends.text === 'extends') {
    const extendsType = nextNonTrivia(tokens, tokens.indexOf(maybeExtends) + 1, TokenKind.Identifier)
    if (extendsType) {
      return { base: cursor, extendsType }
    }
  }

  const dot = nextNonTrivia(tokens, tokens.indexOf(cursor) + 1, TokenKind.Symbol)
  const property = dot && dot.text === '.' ? nextNonTrivia(tokens, tokens.indexOf(dot) + 1, TokenKind.Identifier) : undefined

  if (property) return { base: cursor, property }
  return { base: cursor }
}

function buildHover(
  target: TargetToken,
  variables: Map<string, string>,
  classes: Set<string>,
  customTypes?: Map<string, CustomType>,
  extendsMap?: Map<string, string>
): Hover | null {
  if (target.property) {
    const baseType = resolveBaseType(target.base.text, variables, classes)
    const memberInfo = resolveMemberType(baseType, target.property.text, customTypes, extendsMap)
    
    let content: string
    if (memberInfo.type === 'unknown') {
      content = 'type: unknown'
    } else {
      content = `\`${target.property.text}\`: ${memberInfo.type}`
      const origin = memberInfo.declaredIn ?? baseType
      if (origin && origin !== memberInfo.type) {
        content += ` (from ${origin})`
      }
      if (memberInfo.description) {
        content += `\n\n${memberInfo.description}`
      }
    }

    return {
      range: { start: target.property.start, end: target.property.end },
      content,
    }
  }

  // Check if base is a class name (for static member access or type reference)
  const baseIsClass = classes.has(target.base.text)
  const customType = customTypes?.get(target.base.text)
  
  if (baseIsClass && customType?.description) {
    return {
      range: { start: target.base.start, end: target.base.end },
      content: `\`${target.base.text}\`\n\n${customType.description}`,
    }
  }

  const type = variables.get(target.base.text)
  const classLabel = baseIsClass ? `class ${target.base.text}` : null
  const resolvedType = type ?? classLabel ?? 'unknown'

  let content = resolvedType === 'unknown' ? 'type: unknown' : `${resolvedType}`
  
  // Add description from custom type if available
  const typeInfo = customTypes?.get(type)
  if (typeInfo?.description) {
    content += `\n\n${typeInfo.description}`
  }

  return {
    range: { start: target.base.start, end: target.base.end },
    content,
  }
}

function buildExtendsHover(
  extendsType: Token,
  classes: Set<string>,
  customTypes?: Map<string, CustomType>
): Hover | null {
  const typeName = extendsType.text

  const baseLabel = classes.has(typeName) ? `class ${typeName}` : null
  let content = baseLabel ? `${baseLabel}` : `\`${typeName}\``
  const custom = customTypes?.get(typeName)
  if (custom?.description) {
    content += `\n\n${custom.description}`
  } else if (!classes.has(typeName)) {
    content = 'type: unknown'
  }

  return {
    range: { start: extendsType.start, end: extendsType.end },
    content,
  }
}

function resolveBaseType(name: string, variables: Map<string, string>, classes: Set<string>): string {
  if (variables.has(name)) return variables.get(name) ?? 'unknown'
  if (PRIMITIVES.has(name)) return name
  if (classes.has(name)) return name
  return 'unknown'
}

const MEMBER_TYPES: Record<string, Record<string, string>> = {
  String: {
    length: 'int',
    isEmpty: 'bool',
    isNotEmpty: 'bool'
  },
  int: {
    bitLength: 'int',
  },
  double: {
    toInt: 'int',
  },
}

interface MemberInfo {
  type: string
  description?: string
  declaredIn?: string
}

function resolveMemberType(
  baseType: string,
  member: string,
  customTypes?: Map<string, CustomType>,
  extendsMap?: Map<string, string>
): MemberInfo {
  // Common methods/properties
  if (member === 'toString') return { type: 'String' }
  if (member === 'hashCode') return { type: 'int' }

  const visited = new Set<string>()
  let current: string | undefined = baseType

  while (current && !visited.has(current)) {
    visited.add(current)

    // Check built-in member types
    const baseMembers = MEMBER_TYPES[current]
    if (baseMembers && baseMembers[member]) {
      return { type: baseMembers[member], declaredIn: current }
    }
    
    // Check custom types
    const customType: CustomType | undefined = customTypes?.get(current)
    if (customType?.members && member in customType.members) {
      const memberDef = customType.members[member]
      if (typeof memberDef === 'string') {
        return { type: memberDef, declaredIn: current }
      }
      return { type: memberDef.type, description: memberDef.description, declaredIn: current }
    }
    
    // Check static members
    if (customType?.staticMembers && member in customType.staticMembers) {
      const memberDef = customType.staticMembers[member]
      if (typeof memberDef === 'string') {
        return { type: memberDef, declaredIn: current }
      }
      return { type: memberDef.type, description: memberDef.description, declaredIn: current }
    }
    
    const next: string | undefined = extendsMap?.get(current) ?? customType?.extends
    current = next
  }
  
  return { type: 'unknown' }
}

function nextNonTrivia(tokens: Token[], startIndex: number, desiredKind?: TokenKind): Token | undefined {
  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.kind === TokenKind.Whitespace || token.kind === TokenKind.LineComment || token.kind === TokenKind.BlockComment) continue

    if (!desiredKind) return token
    if (token.kind === desiredKind) return token

    // Treat class identifiers as identifiers for lookup convenience
    if (desiredKind === TokenKind.Identifier && token.kind === TokenKind.ClassIdentifier) return token
    if (desiredKind === TokenKind.ClassIdentifier && token.kind === TokenKind.Identifier) return token

    return undefined
  }
  return undefined
}

function findToken(tokens: Token[], startIndex: number, predicate: (token: Token) => boolean): Token | undefined {
  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i]
    if (predicate(token)) return token
  }
  return undefined
}
