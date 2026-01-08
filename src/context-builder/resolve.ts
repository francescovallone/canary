import { Token, TokenKind } from './lexer'
import { Scope, ScopeKind } from './scope'
import { SymbolEntry, SymbolKind } from './symbol-entry'
import { inferTypeFromTokens } from './infer'
import { ParameterKind } from './node'

export interface Hover {
  range: { start: number; end: number }
  markdown: string
  expectedValue?: string
  documentation?: string
}


function attachType(sym: SymbolEntry, tokens: Token[]) {
  const node = sym.node
  if (node.type !== undefined) return
  const checkAccessChain = node.reference === undefined && (sym.kind === SymbolKind.Field || sym.kind === SymbolKind.Variable)
  const inferred = inferTypeFromTokens(
    tokens,
    node.initializerStart,
    node.initializerEnd,
    checkAccessChain
  )
  if (inferred) {
    if (checkAccessChain && inferred.includes('.')) {
      // For access chains, only take the final property as the type
      let currentScope = sym.node.scope
      const parts = inferred.split('.')
      for (let i = 0; i < parts.length; i++) {
        let part = parts[i]
        if (part.includes('(')) {
          part = part.substring(0, part.indexOf('('))
        }
        const partSym = currentScope?.resolve(part)
        if (partSym) {
          if (partSym.kind === SymbolKind.Class) {
            currentScope = partSym.node.scope
            continue
          }
          if (i === parts.length - 1) {
            node.type = partSym.node.type
          } else {
            const classSym = partSym.node.scope.resolve(partSym.node.type || '');
            if (!classSym) continue;
            currentScope = classSym.node.scope
          }
        }
      }
      if (node.type !== undefined) {
        return
      }
      if (node.type === undefined) {
        node.type = undefined
        return
      }
    }
    /// Check if the inferred type is a valid type in the current scope or in the parent scopes
    let currentScope: Scope | undefined = node.scope
    let typeExists = false
    while (currentScope) {
      const typeSym = currentScope.resolve(inferred)
      if (typeSym) {
        typeExists = true
        node.type = typeSym.node.type
        break
      }
      currentScope = currentScope.parent
    }
    if (typeExists) return
    node.type = inferred
  }
  if (node.reference === 'this' && sym.kind === SymbolKind.Parameter) {
    const classSym = node.scope?.parent?.resolve(sym.name)
    if (classSym) {
      node.type = classSym.node.type
      node.parentClass = classSym.node.parentClass ?? classSym.name
      node.type = classSym.node.type
      node.nullable = classSym.node.nullable
    }
    return
  }
  if (node.reference === 'super' && sym.kind === SymbolKind.Parameter) {
    const fieldSym = node.scope?.parent?.resolve(sym.name)
    const fieldParentClass = fieldSym?.node.parentClass ?? fieldSym?.name
    let currentScope: Scope | undefined = node.scope
    let parentClassSym: SymbolEntry | undefined = undefined
    do {
      parentClassSym = currentScope?.parent?.resolve(fieldParentClass || '')
      if (parentClassSym) break;
      currentScope = currentScope?.parent
    } while (currentScope?.parent)
    const classSym = parentClassSym?.node.scope?.resolve(fieldParentClass || '')
    const superParameter = classSym?.node.scope?.resolve(sym.name)
    if (superParameter !== undefined) {
      node.type = superParameter.node.type
      node.parentClass = superParameter.node.parentClass ?? superParameter.name
      node.defaultValue = superParameter.node.defaultValue
      node.modifiers = superParameter.node.modifiers
      node.nullable = superParameter.node.nullable
    }
    return
  }
  if (node.reference) {
    const refSym = node.scope?.resolve(node.reference)
    if (refSym && refSym.node.type === undefined) {
      attachType(refSym, tokens)
    }
    /// The type maybe still undefined here or not available in the snippet. Use the reference as a type fallback.
    if(!refSym) {
      node.type = node.reference
    }
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

    // Enter class scope
    if (t.kind === TokenKind.Keyword && t.text === 'class') {
      const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
      if (nameTok) {
        const sym = rootScope.resolve(nameTok.text)
        if (sym?.node.scope) {
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
    if ((t.text === ';' || t.text === '}') && scope?.kind === ScopeKind.Constructor) {
      if (scope.parent) {
        scope = scope.parent
        if (scope.kind === ScopeKind.File) currentClass = null
      }
      continue
    }
    if (scope.kind === ScopeKind.Constructor || scope.kind === ScopeKind.Method || scope.kind === ScopeKind.Function) {
      // Parameter for constructor: Type name or this.name or super.name
      // Parameter for method: Type name, final Type name, or required Type name
      if (
        t.kind === TokenKind.Identifier &&
        prev &&
        (prev.text === 'this.' ||
          prev.text === 'super.' ||
          (next && (next.text === ',' || next.text === ')' || next.text === '}' || next.text === ']' || next.text === '=')))) {
        const sym = scope.resolve(t.text)
        if (sym) {
          attachType(sym, tokens)
          hovers.push({
            range: { start: t.start, end: t.end },
            expectedValue: t.text,
            markdown: format(sym),
            documentation: (sym.node.parentClass !== undefined ? `Declared in \`${sym.node.parentClass}\`${sym.node.documentation !== undefined ? `\n\n${sym.node.documentation}` : ''}` : sym.node.documentation),
          })
        }
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
      if (templateInString) {
        for (const expr of templateInString) {
          let currentScope: Scope | undefined = scope
          do {
            const resolvedValue = currentScope.resolve(expr)
            if (resolvedValue) {
              attachType(resolvedValue, tokens)
              const exprOffset = t.text.indexOf(expr)
              const exprStart = t.start + exprOffset
              const exprEnd = exprStart + expr.length
              hovers.push({
                range: { start: exprStart, end: exprEnd },
                markdown: format(resolvedValue),
                expectedValue: expr,
                documentation: (resolvedValue.node.parentClass !== undefined ? `Declared in \`${resolvedValue.node.parentClass}\`${resolvedValue.node.documentation !== undefined ? `\n\n${resolvedValue.node.documentation}` : ''}` : resolvedValue.node.documentation),
              })
              break;
            }
            currentScope = currentScope?.parent
          } while(currentScope?.parent)
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

      const baseTypeRef = parseTypeReference(baseSym.node.type)
      // Determine the member scope: prefer class scope from the base symbol's type
      let memberScope: Scope | undefined = baseSym.node.scope?.kind === ScopeKind.Class ? baseSym.node.scope : undefined
      let classSym = baseSym.node.scope?.kind === ScopeKind.Class ? baseSym : undefined

      if (!memberScope && baseTypeRef.base) {
        const resolvedClassSym = rootScope.resolve(baseTypeRef.base)
        if (resolvedClassSym && resolvedClassSym.node.scope?.kind === ScopeKind.Class) {
          classSym = resolvedClassSym
          memberScope = resolvedClassSym.node.scope
        }
      }

      // Fallback: if we are inside a class and base resolves to that class, use current class scope
      if (!memberScope && currentClass) {
        const classSymCurrent = rootScope.resolve(currentClass)
        if (classSymCurrent && classSymCurrent.node.scope?.kind === ScopeKind.Class) {
          classSym = classSymCurrent
          memberScope = classSymCurrent.node.scope
        }
      }
      if (!memberScope) continue

      const member = memberScope.resolve(t.text)
      if (!member) continue

      const mapping = buildTypeArgumentMap(classSym?.node.typeParameters, baseTypeRef.args)
      const substitutedMember = applyTypeMapping(member, mapping)

      attachType(substitutedMember, tokens)
      hovers.push({
        range: { start: t.start, end: t.end },
        markdown: format(substitutedMember),
        documentation: (substitutedMember.node.parentClass !== undefined ? `Declared in \`${substitutedMember.node.parentClass}\`${substitutedMember.node.documentation !== undefined ? `\n\n${substitutedMember.node.documentation}` : ''}` : substitutedMember.node.documentation),
        expectedValue: t.text,
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
      if (classSym?.node.scope?.kind !== ScopeKind.Class) {
        sym = scope.resolve(t.text) ?? rootScope.resolve(t.text)
        if (sym) {
          attachType(sym, tokens)
          hovers.push({
            range: { start: t.start, end: t.end },
            markdown: format(sym),
            documentation: (sym.node.parentClass !== undefined ? `Declared in \`${sym.node.parentClass}\`${sym.node.documentation !== undefined ? `\n\n${sym.node.documentation}` : ''}` : sym.node.documentation),
            expectedValue: t.text,
          })
          scope = sym.node.scope || scope
        }
        continue
      }
      const ctorSym = classSym?.node.scope?.resolve(t.text)
      let currentScope = scope
      if (ctorSym?.kind === SymbolKind.Constructor) {
        sym = ctorSym
        if (ctorSym?.node.scope) {
          scope = ctorSym.node.scope
        }
      } else {
        sym = scope.resolve(t.text) ?? classSym ?? rootScope.resolve(t.text)
      }
      if (scope.kind !== ScopeKind.Constructor) {
        if (!sym) continue
        attachType(sym, tokens)
        hovers.push({
          range: { start: t.start, end: t.end },
          markdown: format(sym),
          documentation: (sym.node.parentClass !== undefined ? `Declared in \`${sym.node.parentClass}\`${sym.node.documentation !== undefined ? `\n\n${sym.node.documentation}` : ''}` : sym.node.documentation),
          expectedValue: t.text,
        })
        scope = currentScope
        continue
      }
    } else {
      sym = scope.resolve(t.text) ?? rootScope.resolve(t.text)
    }
    if (!sym) continue
    attachType(sym, tokens)
    hovers.push({
      range: { start: t.start, end: t.end },
      markdown: format(sym),
      documentation: (sym.node.parentClass !== undefined ? `Declared in \`${sym.node.parentClass}\`${sym.node.documentation !== undefined ? `\n\n${sym.node.documentation}` : ''}` : sym.node.documentation),
      expectedValue: t.text,
    })
  }

  return dedupe(hovers)
}

function format(sym: SymbolEntry): string {
  const type = sym.node.type ?? 'dynamic'
  const parameters = sym.node.scope ? Array.from(sym.node.scope.symbols.values()).filter(s => s.kind === SymbolKind.Parameter) : []

  const positional = parameters.filter(p => p.node.parameterKind === ParameterKind.Positional)
  const optionalPositional = parameters.filter(p => p.node.parameterKind === ParameterKind.OptionalPositional)
  const named = parameters.filter(p => p.node.parameterKind === ParameterKind.Named)

  const paramLines: string[] = []

  // Positional parameters (first, no enclosure)
  for (const p of positional) {
    attachType(p, [])
    const pType = p.node.type ?? 'dynamic'
    paramLines.push(`  ${pType}${p.node.nullable ? '?' : ''} ${p.name},`)
  }

  // Optional positional (second, enclosed in [])
  if (optionalPositional.length > 0) {
    paramLines.push('  [')
    for (const p of optionalPositional) {
      attachType(p, [])
      const pType = p.node.type ?? 'dynamic'
      paramLines.push(`    ${pType}${p.node.nullable ? '?' : ''} ${p.name}${p.node.defaultValue ? ` = ${p.node.defaultValue}` : ''},`)
    }
    // remove trailing comma on last inner param
    if (paramLines[paramLines.length - 1].endsWith(',')) {
      paramLines[paramLines.length - 1] = paramLines[paramLines.length - 1].replace(/,$/, '')
    }
    paramLines.push('  ],')
  }

  // Named parameters (last, enclosed in {})
  if (named.length > 0) {
    paramLines.push('  {')
    for (const p of named) {
      attachType(p, [])
      const pType = p.node.type ?? 'dynamic'
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
        additionalParts.push(`extends ${sym.node.extendsTypes?.join(', ')}`)
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
      console.log('modifier', modifier.length)
      return `${modifier}${sym.name}${renderTypeParams(sym.node.typeParameters)}(${parameterBlock})`
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

function renderTypeParams(params?: string[]): string {
  if (!params || params.length === 0) return ''
  return `<${params.join(', ')}>`
}

function parseTypeReference(typeText?: string): { base: string; args: string[] } {
  if (!typeText) return { base: '', args: [] }
  const lt = typeText.indexOf('<')
  if (lt === -1) return { base: typeText.trim(), args: [] }
  const base = typeText.slice(0, lt).trim()
  const rest = typeText.slice(lt + 1)
  const lastGt = rest.lastIndexOf('>')
  const inner = lastGt !== -1 ? rest.slice(0, lastGt) : rest
  const args = splitTopLevel(inner).map(a => a.trim()).filter(Boolean)
  return { base, args }
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '<') {
      depth++
      current += ch
      continue
    }
    if (ch === '>') {
      depth = Math.max(0, depth - 1)
      current += ch
      continue
    }
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.length) parts.push(current)
  return parts
}

function buildTypeArgumentMap(typeParameters?: string[], args?: string[]): Record<string, string> | undefined {
  if (!typeParameters?.length || !args?.length) return undefined
  const map: Record<string, string> = {}
  for (let i = 0; i < typeParameters.length; i++) {
    const param = typeParameters[i]
    if (!param) continue
    const arg = args[i]
    if (arg) {
      map[param] = arg
    }
  }
  return Object.keys(map).length ? map : undefined
}

function substituteTypeParams(typeText: string, mapping?: Record<string, string>): string {
  if (!mapping || !Object.keys(mapping).length) return typeText
  let result = typeText
  for (const [param, arg] of Object.entries(mapping)) {
    const re = new RegExp(`\\b${param}\\b`, 'g')
    result = result.replace(re, arg)
  }
  return result
}

function applyTypeMapping(sym: SymbolEntry, mapping?: Record<string, string>): SymbolEntry {
  if (!mapping || !Object.keys(mapping).length) return sym
  return {
    ...sym,
    node: {
      ...sym.node,
      type: sym.node.type ? substituteTypeParams(sym.node.type, mapping) : sym.node.type,
      typeArguments: sym.node.typeArguments?.map(arg => substituteTypeParams(arg, mapping)),
    }
  }
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
