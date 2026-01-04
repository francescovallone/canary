import { Token, TokenKind } from './lexer'
import {
  Node,
  NodeKind,
} from './node'
import { Scope, ScopeKind } from './scope'
import { FieldSymbolEntry, SymbolKind } from './symbol-entry'

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
        const type = nextNonTrivia(tokens, i + 1, TokenKind.Keyword)
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
            type: type?.text,
            initializerStart: initStart,
            initializerEnd: initEnd,
        }

        nodes.push(node)

        scope.define({
            name: node.name,
            kind: SymbolKind.Field,
            node,
            type: type?.text,
            parentClass: currentClass!,
        } as FieldSymbolEntry)
        console.log(scope.symbols)
    }


    // Method or constructor
    if (
      scope.kind === ScopeKind.Class &&
      t.kind === TokenKind.Identifier &&
      nextNonTrivia(tokens, i + 1)?.text === '('
    ) {
      const isCtor = t.text === currentClass
      const node: Node = {
        kind: isCtor ? NodeKind.Constructor : NodeKind.Method,
        name: t.text,
        start: t.start,
        end: t.end,
        scope,
      }

      nodes.push(node)

      const newScope = new Scope(
        isCtor ? ScopeKind.Constructor : ScopeKind.Method,
        scope
      )

      scope.define({
        name: node.name,
        kind: isCtor ? SymbolKind.Constructor : SymbolKind.Method,
        node,
      })

      scope = newScope
      continue
    }

    // Leave scope on }
    if (t.text === '}' && scope.parent) {
      scope = scope.parent
      if (scope.kind === ScopeKind.File) currentClass = null
    }
  }

  return { fileScope, nodes }
}

function nextNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string): Token | undefined {
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
    if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) return tok
  }
  return undefined
}
