import { Token, TokenKind } from './lexer'
import {
  Node,
  NodeKind,
} from './node'
import { Scope, ScopeKind } from './scope'
import { FieldSymbolEntry, ParameterSymbolEntry, SymbolKind } from './symbol-entry'

export function collect(tokens: Token[]) {
  const fileScope = new Scope(ScopeKind.File)
  const nodes: Node[] = []

  let scope = fileScope
  let currentClass: string | null = null

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]

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
      scope.kind === ScopeKind.Class &&
      (t.text === 'final' || t.text === 'var')
    ) {
      const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (!nameTok) continue
      const type = nextNonTrivia(tokens, i + 1, TokenKind.Keyword, undefined, TokenKind.Identifier)
      let initStart: number | undefined
      let initEnd: number | undefined
      if (tokens[i + 2]?.text === '=') {
        initStart = tokens[i + 3]?.start
        let j = i + 3
        while (tokens[j] && tokens[j].text !== ';') j++
        initEnd = tokens[j - 1]?.end
      }

      const node: Node = {
        kind: NodeKind.Field,
        name: nameTok.text,
        start: t.start,
        end: nameTok.end,
        scope,
        type: type?.text ?? 'dynamic',
        initializerStart: initStart,
        initializerEnd: initEnd,
      }

      nodes.push(node)

      scope.define({
        name: node.name,
        kind: SymbolKind.Field,
        node,
        type: type?.text ?? 'dynamic',
        parentClass: currentClass!,
      } as FieldSymbolEntry)
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

      const node: Node = {
        kind: isCtor ? NodeKind.Constructor : NodeKind.Method,
        name: t.text,
        start: t.start,
        end: t.end,
        scope: newScope,
      }

      nodes.push(node)

      scope.define({
        name: node.name,
        kind: isCtor ? SymbolKind.Constructor : SymbolKind.Method,
        node,
      })

      scope = newScope
      continue
    }
    if (scope.kind === ScopeKind.Method || scope.kind === ScopeKind.Constructor) {

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
        const node: Node = {
          kind: NodeKind.Parameter,
          name: t.text,
          start: t.start,
          end: t.end,
          type: typeIdentifier?.text,
          scope,
        }
        nodes.push(node)
        const referenceIdentifier = prevNonTrivia(tokens, i - 1, TokenKind.Identifier)
        scope.define({
          name: node.name,
          kind: SymbolKind.Parameter,
          node,
          type: typeIdentifier?.text,
          referenceType: referenceIdentifier?.text === 'this' ? 'this' :
            referenceIdentifier?.text === 'super' ? 'super' : undefined,
        } as ParameterSymbolEntry)
      }
    }

    // Leave scope on }
    if (t.text === '}' && scope.parent) {
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
