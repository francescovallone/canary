import { CustomType, Parameter } from '../define-types'
import { Token, TokenKind } from './lexer'
import {
  Node,
  NodeKind,
  ParameterKind,
} from './node'
import { Scope, ScopeKind } from './scope'
import { SymbolKind } from './symbol-entry'

export function collect(tokens: Token[], customTypes?: CustomType[]) {
  const fileScope = new Scope(ScopeKind.File)
  const nodes: Node[] = []
  const parameterListEndByScope = new WeakMap<Scope, number>()

  // Register custom types as class-like scopes so member resolution works
  if (customTypes?.length) {
    for (const ct of customTypes) {
      registerCustomType(ct, fileScope, nodes)
    }
  }

  let scope = fileScope
  let currentClass: string | null = null

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    // Top-level function Foo(...) { ... } or Foo(...) =>
    if (
      scope.kind === ScopeKind.File &&
      t.kind === TokenKind.Identifier &&
      nextNonTrivia(tokens, i + 1)?.text === '('
    ) {
      const closeParenIndex = findMatchingParenIndex(tokens, i + 1)
      const afterParen = closeParenIndex !== undefined ? nextNonTrivia(tokens, closeParenIndex + 1) : undefined
      const isFunctionLike = afterParen && (afterParen.text === '{' || afterParen.text === '=>')
      if (isFunctionLike) {
        const returnTypeTok = prevNonTrivia(tokens, i - 1, TokenKind.Keyword, undefined, TokenKind.Symbol) ??
          prevNonTrivia(tokens, i - 1, TokenKind.Identifier, undefined, TokenKind.Symbol)
        const fnScope = new Scope(ScopeKind.Function, scope)
        const node: Node = {
          kind: NodeKind.Function,
          name: t.text,
          start: t.start,
          end: t.end,
          scope: fnScope,
          type: returnTypeTok?.text,
        }
        nodes.push(node)
        scope.define({
          name: node.name,
          kind: SymbolKind.Function,
          node,
        })
        if (closeParenIndex !== undefined) {
          parameterListEndByScope.set(fnScope, closeParenIndex)
        }
        scope = fnScope
        continue
      }
    }
    if (t.kind === TokenKind.StringLiteral && (t.text.includes('${') || t.text.includes('$')) && (!t.text.startsWith('r') && prevNonTrivia(tokens, i - 1, TokenKind.Identifier)?.text !== 'r')) {
      const templateInString = t.text.includes('$') ? t.text.match(/\$\{*([^}]+)\}*/g)?.map(m => {
        const clean = m.startsWith('${') ? m.slice(2, -1) : m.slice(1)
        if (clean.endsWith('"') || clean.endsWith("'")) {
          return clean.slice(0, -1)
        }
        return clean.trim()
      }) : []
      
      if (templateInString?.length) {
        const elementScope = scope
        for (const expr of templateInString) {
          let currentScope: Scope | undefined = scope
          do {
            const resolvedValue = currentScope.resolve(expr)
            if (resolvedValue) {
              const node: Node = {
                kind: NodeKind.TemplateString,
                name: t.text,
                start: t.start,
                end: t.end,
                scope,
                type: resolvedValue.node.type,
              }
              nodes.push(node)
              elementScope.define({
                name: node.name,
                kind: SymbolKind.TemplateString,
                node,
              })
              break;
            }
            currentScope = currentScope?.parent
          } while(currentScope?.parent)
        }
      }
      continue
    }
    // class Foo {
    if (
      t.kind === TokenKind.Keyword &&
      t.text === 'class'
    ) {
      const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (!nameTok) continue
      const nameIndex = tokens.indexOf(nameTok)
      const heritage = parseClassHeritage(tokens, nameIndex + 1)
      const classScope = new Scope(ScopeKind.Class, scope)
      const node: Node = {
        kind: NodeKind.Class,
        name: nameTok.text,
        start: t.start,
        end: nameTok.end,
        scope: classScope, // class members live in this scope
        extendsTypes: heritage.extendsTypes,
        implementsTypes: heritage.implementsTypes,
        mixins: heritage.mixins,
      }

      nodes.push(node)
      scope.define({
        name: node.name,
        kind: SymbolKind.Class,
        node,
      })

      scope = classScope
      currentClass = node.name
      continue
    }

    // Field: final Type name;
    // Field: final name = ...
    // Field: Type name;
    if (
      (t.text === 'final' || t.text === 'var' || t.text === 'static') || 
      (scope.kind !== ScopeKind.Class && t.text === 'const') ||
      (t.kind === TokenKind.Keyword)
    ) {
      const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (!nameTok) continue
      let type = undefined
      let nullable = false
      if (t.kind === TokenKind.Keyword && ['final', 'static', 'var', 'const'].includes(t.text)) {
        type = nextNonTrivia(tokens, i + 1, TokenKind.Keyword, undefined, TokenKind.Identifier)
        const nullabilityTok = nextNonTrivia(tokens, i + 2, TokenKind.Symbol, '?', TokenKind.Identifier)
        if (nullabilityTok) {
          nullable = true
        }
      } else {
        type = t
        const nullabilityTok = nextNonTrivia(tokens, i + 1, TokenKind.Symbol, '?', TokenKind.Identifier)
        if (nullabilityTok) {
          nullable = true
        }
      }
      let initStart: number | undefined
      let initEnd: number | undefined
      const equalTok = nextNonTrivia(tokens, i + 2, TokenKind.Symbol, '=')
      if (equalTok?.text === '=') {
        initStart = tokens[i + 3]?.start
        let j = i + 3
        while (tokens[j] && tokens[j].text !== ';') j++
        initEnd = tokens[j - 1]?.end
      }
      const node: Node = {
        kind: scope.kind === ScopeKind.Class ? NodeKind.Field : NodeKind.Variable,
        name: nameTok.text,
        start: t.start,
        end: nameTok.end,
        scope,
        type: initStart && initEnd && !type ? undefined : type?.text ?? 'undefined',
        initializerStart: initStart,
        initializerEnd: initEnd,
        parentClass: currentClass ?? undefined,
        nullable
      }

      nodes.push(node)

      scope.define({
        name: node.name,
        kind: scope.kind === ScopeKind.Class ? SymbolKind.Field : SymbolKind.Variable,
        node,        
      })
      continue
    }
    // Method or constructor
    if (
      scope.kind === ScopeKind.Class &&
      t.kind === TokenKind.Identifier &&
      nextNonTrivia(tokens, i + 1)?.text === '('
    ) {
      const isCtor = t.text === currentClass
      const closeParenIndex = findMatchingParenIndex(tokens, i + 1)
      const newScope = new Scope(
        isCtor ? ScopeKind.Constructor : ScopeKind.Method,
        scope
      )
      const modifier = prevNonTrivia(tokens, i - 1, TokenKind.Keyword, undefined, TokenKind.Symbol)
      const annotation = prevNonTrivia(tokens, i - 1, TokenKind.Symbol, '@', TokenKind.Symbol)
      const node: Node = {
        kind: isCtor ? NodeKind.Constructor : NodeKind.Method,
        name: t.text,
        start: t.start,
        end: t.end,
        scope: newScope,
        type: isCtor ? undefined : prevNonTrivia(tokens, i - 1, TokenKind.Keyword, undefined, TokenKind.Symbol)?.text,
        parentClass: currentClass!,
        modifiers: modifier ? [modifier.text] : [],
      }
      nodes.push(node)

      scope.define({
        name: node.name,
        kind: isCtor ? SymbolKind.Constructor : SymbolKind.Method,
        node,
      })

      if (closeParenIndex !== undefined) {
        parameterListEndByScope.set(newScope, closeParenIndex)
      }
      scope = newScope
      continue
    }
    if (scope.kind === ScopeKind.Method || scope.kind === ScopeKind.Constructor || scope.kind === ScopeKind.Function) {
      // Parameter for constructor: Type name or this.name or super.name
      // Parameter for method: Type name, final Type name, or required Type name
      const prevToken = prevNonTrivia(tokens, i - 1)
      const nextToken = nextNonTrivia(tokens, i + 1)
      const parameterListEnd = parameterListEndByScope.get(scope)
      const withinParameterList = parameterListEnd !== undefined ? i <= parameterListEnd : true
      if (
        t.kind === TokenKind.Identifier &&
        prevToken &&
        withinParameterList &&
        (prevToken.text === 'this.' ||
          prevToken.text === 'super.' ||
          (nextToken && (nextToken.text === ',' || nextToken.text === ')' || nextToken.text === '}' || nextToken.text === ']' || nextToken.text === '=')))) {
        const typeIdentifier = prevNonTrivia(tokens, i - 2, TokenKind.Keyword, undefined, TokenKind.Symbol)
        const typeIdentifierAlt = prevNonTrivia(tokens, i - 2, TokenKind.Identifier, undefined, TokenKind.Symbol)
        const restrictedIdentifiers = [
          'this',
          'super',
        ]
        const parameterKind = detectParameterKind(tokens, i)
        let defaultValueToken: string | undefined = undefined
        let modifiers: string[] = []
        if (parameterKind !== ParameterKind.Positional) {
          const equalTok = nextNonTrivia(tokens, i + 1, TokenKind.Symbol, '=' , TokenKind.Symbol)
          if (equalTok?.text === '=') {
            const defaultValueStartTok = nextNonTrivia(tokens, tokens.indexOf(equalTok) + 1)
            defaultValueToken = ''
            if (defaultValueStartTok) {
              let j = tokens.indexOf(defaultValueStartTok)
              const parts: string[] = []
              let squareDepth = 0
              let curlyDepth = 0
              let parenDepth = 0
              for (; j < tokens.length; j++) {
                const dvTok = tokens[j]
                if (isTriviaToken(dvTok)) continue
                // Stop if we hit a boundary and we are not inside a nested literal
                if (squareDepth === 0 && curlyDepth === 0 && parenDepth === 0 && (dvTok.text === ',' || dvTok.text === ')' || dvTok.text === '}')) {
                  break
                }
                if (dvTok.kind === TokenKind.Keyword) {
                  defaultValueToken += dvTok.text + ' '
                } else {
                  parts.push(dvTok.text)
                }
                // Track nesting so we keep the matching closing bracket/brace/paren
                if (dvTok.text === '[') squareDepth++
                else if (dvTok.text === ']') {
                  if (squareDepth > 0) squareDepth--
                  else { break }
                }
                else if (dvTok.text === '{') curlyDepth++
                else if (dvTok.text === '}') {
                  if (curlyDepth > 0) curlyDepth--
                  else { break }
                }
                else if (dvTok.text === '(') parenDepth++
                else if (dvTok.text === ')') {
                  if (parenDepth > 0) parenDepth--
                  else { break }
                }
                // When all nesting closes, stop if the next meaningful token is a boundary
                if (squareDepth === 0 && curlyDepth === 0 && parenDepth === 0) {
                  const peek = nextNonTrivia(tokens, j + 1)
                  if (peek && (peek.text === ',' || peek.text === ')' || peek.text === '}' || peek.text === ']')) {
                    break
                  }
                }
              }
              defaultValueToken += parts.join('')
            }
          }
          if (parameterKind === ParameterKind.Named) {
            const modifierTok = prevNonTrivia(tokens, i - 1, TokenKind.Keyword, 'required', TokenKind.Symbol)
            if (modifierTok?.text === 'required') {
              modifiers.push('required')
            }
          }
        }
        const referenceIdentifier = prevNonTrivia(tokens, i - 1, TokenKind.Identifier)
        const node: Node = {
          kind: NodeKind.Parameter,
          name: t.text,
          start: t.start,
          end: t.end,
          type: typeIdentifier?.text ?? (restrictedIdentifiers.includes(typeIdentifierAlt?.text ?? '') ? undefined : typeIdentifierAlt?.text),
          scope,
          parameterKind,
          reference: referenceIdentifier?.text === 'this' ? 'this' :
            referenceIdentifier?.text === 'super' ? 'super' : undefined,
          defaultValue: defaultValueToken,
          modifiers,
        }
        nodes.push(node)
        scope.define({
          name: node.name,
          kind: SymbolKind.Parameter,
          node,
        })
        continue
      }
    }

    // Leave scope on }
    if (
      t.text === '}' && scope.parent ||
      (t.text === ';' || t.text === '}') && scope.kind === ScopeKind.Constructor && scope.parent
    ) {
      const parameterListEnd = parameterListEndByScope.get(scope)
      if (parameterListEnd !== undefined && i <= parameterListEnd) {
        // Still inside parameter list; do not pop the scope yet
        continue
      }
      scope = scope.parent
      if (scope.kind === ScopeKind.File) currentClass = null
    }
  }

  applyHeritage(nodes, fileScope)

  return { fileScope, nodes }
}

function applyHeritage(nodes: Node[], fileScope: Scope) {
  const classNodes = nodes.filter(n => n.kind === NodeKind.Class)
  const classMap = new Map<string, Node>()
  for (const node of classNodes) {
    classMap.set(node.name, node)
  }

  const visited = new Set<string>()
  const visiting = new Set<string>()

  const ensureMerged = (node: Node) => {
    if (visited.has(node.name)) return
    if (visiting.has(node.name)) return
    visiting.add(node.name)

    const heritage = [
      ...(node.extendsTypes ?? []),
      ...(node.mixins ?? []),
      ...(node.implementsTypes ?? []),
    ]

    for (const parentName of heritage) {
      const parentNode = classMap.get(parentName)
      if (parentNode) ensureMerged(parentNode)
      const parentSym = fileScope.resolve(parentName)
      const parentScope = parentSym?.node.scope
      if (parentSym?.kind === SymbolKind.Class && parentScope?.kind === ScopeKind.Class) {
        mergeScopeMembers(node.scope, parentScope, parentName)
      }
    }

    visited.add(node.name)
    visiting.delete(node.name)
  }

  for (const node of classNodes) {
    ensureMerged(node)
  }
}

function mergeScopeMembers(target: Scope, source: Scope, parentClassName: string) {
  for (const entry of source.symbols.values()) {
    if (entry.kind === SymbolKind.Constructor || entry.kind === SymbolKind.Parameter) continue
    if (target.symbols.has(entry.name)) continue
    target.define({
      ...entry,
      node: {
        ...entry.node,
        parentClass: parentClassName,
      }
    })
  }
}

function parseClassHeritage(tokens: Token[], startIndex: number) {
  const extendsTypes: string[] = []
  const implementsTypes: string[] = []
  const mixins: string[] = []
  let i = startIndex

  while (i < tokens.length) {
    const tok = tokens[i]
    if (isTriviaToken(tok)) {
      i++
      continue
    }
    if (tok.text === '{') break
    if (tok.kind === TokenKind.Keyword && isHeritageKeyword(tok.text)) {
      const { types, nextIndex } = collectTypeList(tokens, i + 1)
      if (tok.text === 'extends') {
        extendsTypes.push(...types)
      } else if (tok.text === 'implements') {
        implementsTypes.push(...types)
      } else if (tok.text === 'with') {
        mixins.push(...types)
      }
      i = nextIndex
      continue
    }
    i++
  }

  return {
    extendsTypes: extendsTypes.length ? extendsTypes : undefined,
    implementsTypes: implementsTypes.length ? implementsTypes : undefined,
    mixins: mixins.length ? mixins : undefined,
  }
}

function collectTypeList(tokens: Token[], startIndex: number) {
  const types: string[] = []
  let current: Token[] = []
  let i = startIndex

  for (; i < tokens.length; i++) {
    const tok = tokens[i]
    if (isTriviaToken(tok)) continue
    if (tok.text === ',') {
      const name = joinNameTokens(current)
      if (name) types.push(name)
      current = []
      continue
    }
    if (tok.text === '{' || (tok.kind === TokenKind.Keyword && isHeritageKeyword(tok.text))) {
      break
    }
    current.push(tok)
  }

  const trailing = joinNameTokens(current)
  if (trailing) types.push(trailing)

  return { types, nextIndex: i }
}

function joinNameTokens(tokens: Token[]): string | undefined {
  const parts = tokens
    .filter(tok => !isTriviaToken(tok))
    .map(tok => tok.text)
  const joined = parts.join('')
  return joined.length ? joined : undefined
}

function isHeritageKeyword(text?: string) {
  return text === 'extends' || text === 'implements' || text === 'with'
}

function isTriviaToken(tok: Token) {
  return tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment
}

function detectParameterKind(tokens: Token[], index: number): ParameterKind {
  let curlyBalance = 0
  let squareBalance = 0
  let parenBalance = 0
  for (let i = index - 1; i >= 0; i--) {
    const tok = tokens[i]
    if (isTriviaToken(tok)) continue
    if (tok.text === ')') {
      parenBalance++
      continue
    }
    if (tok.text === '(') {
      if (parenBalance > 0) {
        parenBalance--
        continue
      }
      return ParameterKind.Positional
    }
    if (tok.text === ']') {
      squareBalance++
      continue
    }
    if (tok.text === '[') {
      if (squareBalance > 0) {
        squareBalance--
        continue
      }
      return ParameterKind.OptionalPositional
    }
    if (tok.text === '}') {
      curlyBalance++
      continue
    }
    if (tok.text === '{') {
      if (curlyBalance > 0) {
        curlyBalance--
        continue
      }
      return ParameterKind.Named
    }
  }

  return ParameterKind.Positional
}

function nextNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string, until?: TokenKind): Token | undefined {
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
    if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) return tok
    if (until && tok.kind === until) return undefined
  }
  return undefined
}

function nextsNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string, until?: TokenKind): Token[] {
  const collectedTokens: Token[] = []
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
    if (until && tok.kind === until) return collectedTokens
    if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) collectedTokens.push(tok)
  }
  return collectedTokens
}

function nextNonTriviaOneOf(tokens: Token[], start: number, desiredKinds: TokenKind[], until?: TokenKind, ignoredValue?: string): Token | undefined {
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment || tok.text === ignoredValue) continue
    if (desiredKinds.includes(tok.kind)) return tok
    if (until && tok.kind === until) return undefined
  }
  return undefined
}

function prevNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string, until?: TokenKind): Token | undefined {
  for (let i = start; i >= 0; i--) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
    if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) return tok
    if (until && tok.kind === until) return undefined
  }
  return undefined
}

function findMatchingParenIndex(tokens: Token[], startIndex: number): number | undefined {
  let depth = 0
  for (let i = startIndex; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.text === '(') depth++
    if (tok.text === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return undefined
}

function registerCustomType(customType: CustomType, fileScope: Scope, nodes: Node[]) {
  const classScope = new Scope(ScopeKind.Class, fileScope)
  const classNode: Node = {
    kind: NodeKind.Class,
    name: customType.name,
    start: -1,
    end: -1,
    scope: classScope,
    extendsTypes: customType.extends ? [customType.extends] : undefined,
  }
  nodes.push(classNode)

  fileScope.define({
    name: customType.name,
    kind: SymbolKind.Class,
    node: classNode,
  })

  const addMember = (name: string, value: string | { type: string; description?: string } | {type: string; description?: string; parameters: Parameter[]}, isStatic = false) => {
    const memberType = typeof value === 'string' ? value : value.type
    if (value.hasOwnProperty('parameters')) {
      // Method
      const methodScope = new Scope(ScopeKind.Method, classScope)
      const methodNode: Node = {
        kind: NodeKind.Method,
        name,
        start: -1,
        end: -1,
        scope: methodScope,
        type: memberType,
        modifiers: isStatic ? ['static'] : [],
        parentClass: customType.name,
        documentation: (value as any).description,
      }
      nodes.push(methodNode)
      for (const paramName of (value as any).parameters) {
        const param: Parameter = paramName
        const paramNode: Node = {
          kind: NodeKind.Parameter,
          name: param.name,
          start: -1,
          end: -1,
          scope: methodScope,
          type: param.type,
          parameterKind: param.kind === 'positional' ? ParameterKind.Positional :
            param.kind === 'optionalPositional' ? ParameterKind.OptionalPositional :
            ParameterKind.Named,
          defaultValue: param.defaultValue,
          modifiers: [
            param.required ? 'required' : ''
          ],
          documentation: param.description,
        }
        nodes.push(paramNode)
        methodScope.define({
          name: param.name,
          kind: SymbolKind.Parameter,
          node: paramNode,
        })
      }
      classScope.define({
        name,
        kind: SymbolKind.Method,
        node: methodNode,
      })

    } else {
      const memberNode: Node = {
        kind: NodeKind.Field,
        name,
        start: -1,
        end: -1,
        scope: classScope,
        type: memberType,
        parentClass: customType.name,
        modifiers: isStatic ? ['static'] : [],
      }
      nodes.push(memberNode)
      classScope.define({
        name,
        kind: SymbolKind.Field,
        node: memberNode,
      })
    }
  }

  if (customType.members) {
    for (const [memberName, memberValue] of Object.entries(customType.members)) {
      addMember(memberName, memberValue, false)
    }
  }

  if (customType.staticMembers) {
    for (const [memberName, memberValue] of Object.entries(customType.staticMembers)) {
      addMember(memberName, memberValue, true)
    }
  }

  if (customType.constructors?.length) {
    for (const ctor of customType.constructors) {
      const ctorScope = new Scope(ScopeKind.Constructor, classScope)
      const ctorNode: Node = {
        kind: NodeKind.Constructor,
        name: ctor.name ?? customType.name,
        start: -1,
        end: -1,
        scope: ctorScope,
        parentClass: customType.name,
        documentation: ctor.description,
      }
      nodes.push(ctorNode)
      classScope.define({
        name: ctor.name ?? customType.name,
        kind: SymbolKind.Constructor,
        node: ctorNode,
      })
      for (const param of ctor.parameters) {
        const paramNode: Node = {
          kind: NodeKind.Parameter,
          name: param.name,
          start: -1,
          end: -1,
          scope: ctorScope,
          type: param.type,
          parameterKind: param.kind === 'positional' ? ParameterKind.Positional :
            param.kind === 'optionalPositional' ? ParameterKind.OptionalPositional :
            ParameterKind.Named,
          defaultValue: param.defaultValue,
          modifiers: [
            param.required ? 'required' : ''
          ],
          documentation: param.description,
        }
        nodes.push(paramNode)
        ctorScope.define({
          name: param.name,
          kind: SymbolKind.Parameter,
          node: paramNode,
          
        })
      }
    }
  }
}
