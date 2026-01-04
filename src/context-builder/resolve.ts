import { Token, TokenKind } from './lexer'
import { Scope, ScopeKind } from './scope'
import { FieldSymbolEntry, SymbolEntry, SymbolKind } from './symbol-entry'
import { Node } from './node'
import { inferTypeFromTokens } from './infer'

export interface Hover {
  range: { start: number; end: number }
  markdown: string
  expectedValue?: string
  documentation?: string
}


function attachType(sym: any, tokens: Token[]) {
  if (sym.type) return

  const node = sym.node
  const inferred = inferTypeFromTokens(
    tokens,
    node.initializerStart,
    node.initializerEnd
  )

  if (inferred) {
    sym.type = inferred
    node.type = inferred
  }
}


export function resolve(
  tokens: Token[],
  rootScope: Scope
): Hover[] {
  const hovers: Hover[] = []
  let scope: Scope = rootScope
  let currentClass: string | null = null

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const prev = prevNonTrivia(tokens, i - 1)
    const next = nextNonTrivia(tokens, i + 1)
    // console.log(tokens[i - 1], tokens[i], tokens[i + 1])
    // console.log(scope)

    // Enter class scope
    if (t.kind === TokenKind.Keyword && t.text === 'class') {
      const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (nameTok) {
        const sym = rootScope.resolve(nameTok.text)
        if (sym?.node.scope) {
          console.log('Entering class scope for', nameTok.text)
          scope = sym.node.scope
          currentClass = nameTok.text
        }
      }
      continue
    }

    // Leave scope on closing brace
    if (t.text === '}' && scope.parent) {
      scope = scope.parent
      if (scope.kind === ScopeKind.File) currentClass = null
      continue
    }

    if (t.text === ';' || t.text === '{' && scope?.kind === ScopeKind.Constructor) {
      if (scope.parent) {
        scope = scope.parent
        if (scope.kind === ScopeKind.File) currentClass = null
      }
      continue
    }

    if (scope.kind === ScopeKind.Constructor) {
      // Parameter for constructor: Type name or this.name or super.name
      // Parameter for method: Type name, final Type name, or required Type name
      if (
        t.kind === TokenKind.Identifier &&
        prev &&
        (prev.text === 'this.' ||
          prev.text === 'super.' ||
          (next && (next.text === ',' || next.text === ')'))))
      {
        console.log('Found parameter:', t.text, 'in method/ctor', scope)
        const sym = scope.resolve(t.text)
        console.log('Resolved to', sym)
        if (sym) {
          attachType(sym, tokens)
          hovers.push({
            range: { start: t.start, end: t.end },
            expectedValue: t.text,
            markdown: format(sym),
          })
        }
      }
    }

    if (t.kind !== TokenKind.Identifier) continue

    // member access: a.b
    if (tokens[i - 1]?.text === '.') {
      const left = tokens[i - 2]
      if (!left) continue

      // resolve the base symbol in current scope first, then file scope
      const baseSym = scope.resolve(left.text) ?? rootScope.resolve(left.text)
      if (!baseSym) continue

      // Determine the member scope: prefer class scope from the base symbol's type
      let memberScope: Scope | undefined = baseSym.node.scope?.kind === ScopeKind.Class ? baseSym.node.scope : undefined

      if (!memberScope && baseSym.type) {
        const classSym = rootScope.resolve(baseSym.type)
        if (classSym && classSym.node.scope?.kind === ScopeKind.Class) {
          memberScope = classSym.node.scope
        }
      }

      // Fallback: if we are inside a class and base resolves to that class, use current class scope
      if (!memberScope && currentClass) {
        const classSym = rootScope.resolve(currentClass)
        if (classSym && classSym.node.scope?.kind === ScopeKind.Class) {
          memberScope = classSym.node.scope
        }
      }

      if (!memberScope) continue

      const member = memberScope.resolve(t.text)
      if (!member) continue

      attachType(member, tokens)
      
      hovers.push({
        range: { start: t.start, end: t.end },
        markdown: format(member),
        documentation: (member.kind === SymbolKind.Field ? `Defined in \`${(member as FieldSymbolEntry).parentClass}\`` : undefined),
      })
      continue
    }
    // simple identifier
    let sym: SymbolEntry | undefined

    // Prefer the class symbol when parsing the declaration itself
    if (prev?.text === 'class') {
      sym = rootScope.resolve(t.text)
    }
    // Treat call-like identifiers as constructor invocations when a matching constructor exists
    else if (next?.text === '(') {
      const classSym = rootScope.resolve(t.text)
      const ctorSym = classSym?.node.scope?.resolve(t.text)
      if (ctorSym?.kind === SymbolKind.Constructor) {
        sym = ctorSym
        if (ctorSym?.node.scope) {
          scope = ctorSym.node.scope
        }
      } else {
        sym = scope.resolve(t.text) ?? classSym ?? rootScope.resolve(t.text)
      }
    } else {
      sym = scope.resolve(t.text) ?? rootScope.resolve(t.text)
    }

    if (!sym) continue
    attachType(sym, tokens)
    hovers.push({
      range: { start: t.start, end: t.end },
      markdown: format(sym),
      documentation: (sym.kind === SymbolKind.Field ? `Defined in \`${(sym as FieldSymbolEntry).parentClass}\`` : undefined),
    })
  }

  return dedupe(hovers)
}

function format(sym: SymbolEntry): string {
  const type = sym.type ?? 'unknown'
  switch (sym.kind) {
    case SymbolKind.Class:
      return `\`class ${sym.name}\``

    case SymbolKind.Field:
        return `${type} ${sym.name}`
    case SymbolKind.Variable:
    case SymbolKind.Parameter:
      return `**${sym.name}**: \`${type}\``

    case SymbolKind.Method:
      return `**${sym.name}**(): \`${type}\``

    case SymbolKind.Constructor:
      return `**${sym.name}**(...)`

    default:
      return `**${sym.name}**`
  }
}


function dedupe(hovers: Hover[]): Hover[] {
  const seen = new Set<string>()
  return hovers.filter(h => {
    const key = `${h.range.start}:${h.range.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function prevNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind): Token | undefined {
  for (let i = start; i >= 0; i--) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
    if (!desiredKind || tok.kind === desiredKind) return tok
    return undefined
  }
  return undefined
}

function nextNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind): Token | undefined {
  for (let i = start; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
    if (!desiredKind || tok.kind === desiredKind) return tok
    return undefined
  }
  return undefined
}
