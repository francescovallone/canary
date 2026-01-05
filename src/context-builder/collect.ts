import { CustomType, Parameter } from '../define-types'
import { Token, TokenKind } from './lexer'
import {
  Node,
  NodeKind,
} from './node'
import { Scope, ScopeKind } from './scope'
import { SymbolKind } from './symbol-entry'

export function collect(tokens: Token[], customTypes?: CustomType[]) {
  const fileScope = new Scope(ScopeKind.File)
  const nodes: Node[] = []

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
          type: node.type,
        })
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
                type: resolvedValue.type,
              }
              nodes.push(node)
              elementScope.define({
                name: node.name,
                kind: SymbolKind.TemplateString,
                node,
                type: resolvedValue.type,
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
      const classScope = new Scope(ScopeKind.Class, scope)
      const node: Node = {
        kind: NodeKind.Class,
        name: nameTok.text,
        start: t.start,
        end: nameTok.end,
        scope: classScope, // class members live in this scope
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
    if (
      (t.text === 'final' || t.text === 'var')
    ) {
      const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (!nameTok) continue
      const type = nextNonTrivia(tokens, i + 1, TokenKind.Keyword, undefined, TokenKind.Identifier)
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
      }

      nodes.push(node)

      scope.define({
        name: node.name,
        kind: scope.kind === ScopeKind.Class ? SymbolKind.Field : SymbolKind.Variable,
        node,
        type: initStart && initEnd && !type ? undefined : type?.text ?? 'undefined',
        parentClass: currentClass ?? undefined,
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
      const newScope = new Scope(
        isCtor ? ScopeKind.Constructor : ScopeKind.Method,
        scope
      )
      const modifier = prevNonTrivia(tokens, i - 1, TokenKind.Keyword, undefined, TokenKind.Symbol)
      const node: Node = {
        kind: isCtor ? NodeKind.Constructor : NodeKind.Method,
        name: t.text,
        start: t.start,
        end: t.end,
        scope: newScope,
        type: isCtor ? undefined : prevNonTrivia(tokens, i - 1, TokenKind.Keyword, undefined, TokenKind.Symbol)?.text,
      }
      nodes.push(node)

      scope.define({
        name: node.name,
        kind: isCtor ? SymbolKind.Constructor : SymbolKind.Method,
        node,
        type: node.type,
        parentClass: currentClass!,
        modifiers: modifier ? [modifier.text] : [],
      })

      scope = newScope
      continue
    }
    if (scope.kind === ScopeKind.Method || scope.kind === ScopeKind.Constructor || scope.kind === ScopeKind.Function) {
      // Parameter for constructor: Type name or this.name or super.name
      // Parameter for method: Type name, final Type name, or required Type name
      const prevToken = prevNonTrivia(tokens, i - 1)
      const nextToken = nextNonTrivia(tokens, i + 1)
      if (
        t.kind === TokenKind.Identifier &&
        prevToken &&
        (prevToken.text === 'this.' ||
          prevToken.text === 'super.' ||
          (nextToken && (nextToken.text === ',' || nextToken.text === ')')))) {
        const typeIdentifier = prevNonTrivia(tokens, i - 2, TokenKind.Keyword, undefined, TokenKind.Symbol)
        const typeIdentifierAlt = prevNonTrivia(tokens, i - 2, TokenKind.Identifier, undefined, TokenKind.Symbol)
        const restrictedIdentifiers = [
          'this',
          'super',
        ]
        const node: Node = {
          kind: NodeKind.Parameter,
          name: t.text,
          start: t.start,
          end: t.end,
          type: typeIdentifier?.text ?? (restrictedIdentifiers.includes(typeIdentifierAlt?.text ?? '') ? undefined : typeIdentifierAlt?.text),
          scope,
        }
        nodes.push(node)
        const referenceIdentifier = prevNonTrivia(tokens, i - 1, TokenKind.Identifier)
        scope.define({
          name: node.name,
          kind: SymbolKind.Parameter,
          node,
          type: node.type,
          reference: referenceIdentifier?.text === 'this' ? 'this' :
            referenceIdentifier?.text === 'super' ? 'super' : undefined,
        })
        continue
      }
    }

    // Leave scope on }
    if (
      t.text === '}' && scope.parent ||
      (t.text === ';' || t.text === '}') && scope.kind === ScopeKind.Constructor && scope.parent
    ) {
      scope = scope.parent
      if (scope.kind === ScopeKind.File) currentClass = null
    }
  }

  return { fileScope, nodes }
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
        }
        nodes.push(paramNode)
        methodScope.define({
          name: param.name,
          kind: SymbolKind.Parameter,
          node: paramNode,
          type: param.type,
        })
      }
      classScope.define({
        name,
        kind: SymbolKind.Method,
        node: methodNode,
        type: memberType,
        parentClass: customType.name,
        modifiers: isStatic ? ['static'] : [],
      })

    } else {
      const memberNode: Node = {
        kind: NodeKind.Field,
        name,
        start: -1,
        end: -1,
        scope: classScope,
        type: memberType,
      }
      nodes.push(memberNode)
      classScope.define({
        name,
        kind: SymbolKind.Field,
        node: memberNode,
        type: memberType,
        parentClass: customType.name,
        modifiers: isStatic ? ['static'] : [],
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
      }
      nodes.push(ctorNode)
      classScope.define({
        name: ctor.name ?? customType.name,
        kind: SymbolKind.Constructor,
        node: ctorNode,
        parentClass: customType.name,
      })
      for (const param of ctor.parameters) {
        const paramNode: Node = {
          kind: NodeKind.Parameter,
          name: param.name,
          start: -1,
          end: -1,
          scope: ctorScope,
          type: param.type,
        }
        nodes.push(paramNode)
        ctorScope.define({
          name: param.name,
          kind: SymbolKind.Parameter,
          node: paramNode,
          type: param.type,
          modifiers: []
        })
      }
    }
  }
}
