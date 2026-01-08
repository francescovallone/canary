// import { CustomFunction, CustomType, Parameter } from '../define-types'
// import { Token, TokenKind } from './lexer'
// import {
//   Node,
//   NodeKind,
//   ParameterKind,
// } from './node'
// import { Scope, ScopeKind } from './scope'
// import { SymbolKind } from './symbol-entry'

// export function collect(tokens: Token[], customTypes?: (CustomType | CustomFunction)[]) {
//   const fileScope = new Scope(ScopeKind.File)
//   const nodes: Node[] = []
//   const parameterListEndByScope = new WeakMap<Scope, number>()

//   // Register custom types as class-like scopes so member resolution works
//   if (customTypes?.length) {
//     for (const ct of customTypes) {
//       if (ct.kind === 'function') {
//         registerCustomTopLevelFunction(ct, fileScope, nodes)
//       }else if (ct.kind === 'class') {
//         registerCustomType(ct, fileScope, nodes)
//       }
//     }
//   }

//   let scope = fileScope
//   let currentClass: string | null = null

//   for (let i = 0; i < tokens.length; i++) {
//     const t = tokens[i]
//     // Top-level function Foo(...) { ... } or Foo(...) =>
//     if (
//       scope.kind === ScopeKind.File &&
//       t.kind === TokenKind.Identifier &&
//       nextNonTrivia(tokens, i + 1)?.text === '('
//     ) {
//       const closeParenIndex = findMatchingParenIndex(tokens, i + 1)
//       const afterParen = closeParenIndex !== undefined ? nextNonTrivia(tokens, closeParenIndex + 1) : undefined
//       const isFunctionLike = afterParen && (afterParen.text === '{' || afterParen.text === '=>')
//       if (isFunctionLike) {
//         const returnTypeText = readTypeBeforeName(tokens, i)
//         const fnScope = new Scope(ScopeKind.Function, scope)
//         const node: Node = {
//           kind: NodeKind.Function,
//           name: t.text,
//           start: t.start,
//           end: t.end,
//           scope: fnScope,
//           type: returnTypeText,
//           typeArguments: extractTypeArguments(returnTypeText),
//         }
//         nodes.push(node)
//         scope.define({
//           name: node.name,
//           kind: SymbolKind.Function,
//           node,
//         })
//         if (closeParenIndex !== undefined) {
//           parameterListEndByScope.set(fnScope, closeParenIndex)
//         }
//         scope = fnScope
//         continue
//       }
//     }
//     if (t.kind === TokenKind.StringLiteral && (t.text.includes('${') || t.text.includes('$')) && (!t.text.startsWith('r') && prevNonTrivia(tokens, i - 1, TokenKind.Identifier)?.text !== 'r')) {
//       const templateInString = t.text.includes('$') ? t.text.match(/\$\{*([^}]+)\}*/g)?.map(m => {
//         const clean = m.startsWith('${') ? m.slice(2, -1) : m.slice(1)
//         if (clean.endsWith('"') || clean.endsWith("'")) {
//           return clean.slice(0, -1)
//         }
//         return clean.trim()
//       }) : []
      
//       if (templateInString?.length) {
//         const elementScope = scope
//         for (const expr of templateInString) {
//           let currentScope: Scope | undefined = scope
//           do {
//             const resolvedValue = currentScope.resolve(expr)
//             if (resolvedValue) {
//               const node: Node = {
//                 kind: NodeKind.TemplateString,
//                 name: t.text,
//                 start: t.start,
//                 end: t.end,
//                 scope,
//                 type: resolvedValue.node.type,
//               }
//               nodes.push(node)
//               elementScope.define({
//                 name: node.name,
//                 kind: SymbolKind.TemplateString,
//                 node,
//               })
//               break;
//             }
//             currentScope = currentScope?.parent
//           } while(currentScope?.parent)
//         }
//       }
//       continue
//     }
//     // class Foo {
//     if (
//       t.kind === TokenKind.Keyword &&
//       t.text === 'class'
//     ) {
//       const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
//       if (!nameTok) continue
//       const nameIndex = tokens.indexOf(nameTok)
//       const { params: typeParameters, nextIndex: heritageStart } = parseTypeParameters(tokens, nameIndex + 1)
//       const heritage = parseClassHeritage(tokens, heritageStart ?? nameIndex + 1)
//       const classScope = new Scope(ScopeKind.Class, scope)
//       const node: Node = {
//         kind: NodeKind.Class,
//         name: nameTok.text,
//         start: t.start,
//         end: nameTok.end,
//         scope: classScope, // class members live in this scope
//         extendsTypes: heritage.extendsTypes,
//         implementsTypes: heritage.implementsTypes,
//         mixins: heritage.mixins,
//         typeParameters,
//       }

//       nodes.push(node)
//       scope.define({
//         name: node.name,
//         kind: SymbolKind.Class,
//         node,
//       })

//       scope = classScope
//       currentClass = node.name
//       continue
//     }
//     // Field: final Type name;
//     // Field: final name = ...
//     // Field: Type name;
//     if (
//       (t.text === 'final' || t.text === 'var' || t.text === 'static') || 
//       (scope.kind !== ScopeKind.Class && t.text === 'const') ||
//       (t.kind === TokenKind.Keyword && isHeritageKeyword(t.text) === false)
//     ) {
//       const nameTok = nextNonTrivia(tokens, i + 1, TokenKind.Identifier)
//       if (!nameTok) continue
//       const typeTextRaw = readTypeBeforeName(tokens, tokens.indexOf(nameTok))
//       console.log('Detected variable/field:', nameTok.text, 'with type text:', typeTextRaw)
//       const nullable = typeTextRaw?.endsWith('?') ?? false
//       const typeText = nullable ? typeTextRaw?.slice(0, -1) : typeTextRaw
//       let initStart: number | undefined
//       let initEnd: number | undefined
//       const equalTok = nextNonTrivia(tokens, i + 2, TokenKind.Symbol, '=')
//       if (equalTok?.text === '=') {
//         const equalIndex = tokens.indexOf(equalTok)
//         const firstValueTok = nextNonTrivia(tokens, equalIndex + 1)
//         initStart = firstValueTok?.start
//         let j = equalIndex + 1
//         let lastNonTriviaEnd: number | undefined = firstValueTok?.end
//         for (; j < tokens.length; j++) {
//           const tok = tokens[j]
//           if (tok.text === ';') break
//           if (!isTriviaToken(tok)) {
//             lastNonTriviaEnd = tok.end
//           }
//         }
//         initEnd = lastNonTriviaEnd
//       }
//       const node: Node = {
//         kind: scope.kind === ScopeKind.Class ? NodeKind.Field : NodeKind.Variable,
//         name: nameTok.text,
//         start: t.start,
//         end: nameTok.end,
//         scope,
//         type: initStart && initEnd && !typeText ? undefined : typeText ?? 'undefined',
//         typeArguments: extractTypeArguments(typeText ?? undefined),
//         initializerStart: initStart,
//         initializerEnd: initEnd,
//         parentClass: currentClass ?? undefined,
//         nullable
//       }

//       nodes.push(node)

//       scope.define({
//         name: node.name,
//         kind: scope.kind === ScopeKind.Class ? SymbolKind.Field : SymbolKind.Variable,
//         node,        
//       })
//       continue
//     }
//     // Method or constructor
//     if (
//       scope.kind === ScopeKind.Class &&
//       t.kind === TokenKind.Identifier &&
//       nextNonTrivia(tokens, i + 1)?.text === '('
//     ) {
//       const isCtor = t.text === currentClass
//       const closeParenIndex = findMatchingParenIndex(tokens, i + 1)
//       const newScope = new Scope(
//         isCtor ? ScopeKind.Constructor : ScopeKind.Method,
//         scope
//       )
//       const modifier = prevNonTrivia(tokens, i - 1, TokenKind.Keyword, undefined, TokenKind.Symbol)
//       const annotation = prevNonTrivia(tokens, i - 1, TokenKind.Symbol, '@', TokenKind.Symbol)
//       const typeText = isCtor ? undefined : readTypeBeforeName(tokens, i)
//       const node: Node = {
//         kind: isCtor ? NodeKind.Constructor : NodeKind.Method,
//         name: t.text,
//         start: t.start,
//         end: t.end,
//         scope: newScope,
//         type: isCtor ? undefined : typeText,
//         typeArguments: isCtor ? undefined : extractTypeArguments(typeText ?? undefined),
//         parentClass: currentClass!,
//         modifiers: modifier ? [modifier.text] : [],
//       }
//       nodes.push(node)

//       scope.define({
//         name: node.name,
//         kind: isCtor ? SymbolKind.Constructor : SymbolKind.Method,
//         node,
//       })

//       if (closeParenIndex !== undefined) {
//         parameterListEndByScope.set(newScope, closeParenIndex)
//       }
//       scope = newScope
//       continue
//     }
//     if (scope.kind === ScopeKind.Method || scope.kind === ScopeKind.Constructor || scope.kind === ScopeKind.Function) {
//       // Parameter for constructor: Type name or this.name or super.name
//       // Parameter for method: Type name, final Type name, or required Type name
//       const prevToken = prevNonTrivia(tokens, i - 1)
//       const nextToken = nextNonTrivia(tokens, i + 1)
//       const parameterListEnd = parameterListEndByScope.get(scope)
//       const withinParameterList = parameterListEnd !== undefined ? i <= parameterListEnd : true
//       if (
//         t.kind === TokenKind.Identifier &&
//         prevToken &&
//         withinParameterList &&
//         (prevToken.text === 'this.' ||
//           prevToken.text === 'super.' ||
//           (nextToken && (nextToken.text === ',' || nextToken.text === ')' || nextToken.text === '}' || nextToken.text === ']' || nextToken.text === '=')))) {
//         const typeIdentifier = prevNonTrivia(tokens, i - 2, TokenKind.Keyword, undefined, TokenKind.Symbol)
//         const typeIdentifierAlt = prevNonTrivia(tokens, i - 2, TokenKind.Identifier, undefined, TokenKind.Symbol)
//         const restrictedIdentifiers = [
//           'this',
//           'super',
//         ]
//         const parameterKind = detectParameterKind(tokens, i)
//         let defaultValueToken: string | undefined = undefined
//         let modifiers: string[] = []
//         if (parameterKind !== ParameterKind.Positional) {
//           const equalTok = nextNonTrivia(tokens, i + 1, TokenKind.Symbol, '=' , TokenKind.Symbol)
//           if (equalTok?.text === '=') {
//             const defaultValueStartTok = nextNonTrivia(tokens, tokens.indexOf(equalTok) + 1)
//             defaultValueToken = ''
//             if (defaultValueStartTok) {
//               let j = tokens.indexOf(defaultValueStartTok)
//               const parts: string[] = []
//               let squareDepth = 0
//               let curlyDepth = 0
//               let parenDepth = 0
//               for (; j < tokens.length; j++) {
//                 const dvTok = tokens[j]
//                 if (isTriviaToken(dvTok)) continue
//                 // Stop if we hit a boundary and we are not inside a nested literal
//                 if (squareDepth === 0 && curlyDepth === 0 && parenDepth === 0 && (dvTok.text === ',' || dvTok.text === ')' || dvTok.text === '}')) {
//                   break
//                 }
//                 if (dvTok.kind === TokenKind.Keyword) {
//                   defaultValueToken += dvTok.text + ' '
//                 } else {
//                   parts.push(dvTok.text)
//                 }
//                 // Track nesting so we keep the matching closing bracket/brace/paren
//                 if (dvTok.text === '[') squareDepth++
//                 else if (dvTok.text === ']') {
//                   if (squareDepth > 0) squareDepth--
//                   else { break }
//                 }
//                 else if (dvTok.text === '{') curlyDepth++
//                 else if (dvTok.text === '}') {
//                   if (curlyDepth > 0) curlyDepth--
//                   else { break }
//                 }
//                 else if (dvTok.text === '(') parenDepth++
//                 else if (dvTok.text === ')') {
//                   if (parenDepth > 0) parenDepth--
//                   else { break }
//                 }
//                 // When all nesting closes, stop if the next meaningful token is a boundary
//                 if (squareDepth === 0 && curlyDepth === 0 && parenDepth === 0) {
//                   const peek = nextNonTrivia(tokens, j + 1)
//                   if (peek && (peek.text === ',' || peek.text === ')' || peek.text === '}' || peek.text === ']')) {
//                     break
//                   }
//                 }
//               }
//               defaultValueToken += parts.join('')
//             }
//           }
//           if (parameterKind === ParameterKind.Named) {
//             const modifierTok = prevNonTrivia(tokens, i - 1, TokenKind.Keyword, 'required', TokenKind.Symbol)
//             if (modifierTok?.text === 'required') {
//               modifiers.push('required')
//             }
//           }
//         }
//         const referenceIdentifier = prevNonTrivia(tokens, i - 1, TokenKind.Identifier)
//         const typeText = referenceIdentifier ? undefined : (readTypeBeforeName(tokens, i) ?? (restrictedIdentifiers.includes(typeIdentifierAlt?.text ?? '') ? undefined : (typeIdentifier?.text ?? typeIdentifierAlt?.text)))
//         const nullable = typeText?.endsWith('?') ?? false
//         const cleanType = nullable ? typeText?.slice(0, -1) : typeText
//         const node: Node = {
//           kind: NodeKind.Parameter,
//           name: t.text,
//           start: t.start,
//           end: t.end,
//           type: cleanType,
//           typeArguments: extractTypeArguments(cleanType),
//           scope,
//           parameterKind,
//           reference: referenceIdentifier?.text === 'this' ? 'this' :
//             referenceIdentifier?.text === 'super' ? 'super' : referenceIdentifier?.text,
//           defaultValue: defaultValueToken,
//           modifiers,
//           nullable,
//         }
//         nodes.push(node)
//         scope.define({
//           name: node.name,
//           kind: SymbolKind.Parameter,
//           node,
//         })
//         continue
//       }
//     }
//     // Leave scope on }
//     if (
//       t.text === '}' && scope.parent ||
//       (t.text === ';' || t.text === '}') && scope.kind === ScopeKind.Constructor && scope.parent
//     ) {
//       const parameterListEnd = parameterListEndByScope.get(scope)
//       if (parameterListEnd !== undefined && i <= parameterListEnd) {
//         // Still inside parameter list; do not pop the scope yet
//         continue
//       }
//       scope = scope.parent
//       if (scope.kind === ScopeKind.File) currentClass = null
//     }
//   }

//   applyHeritage(nodes, fileScope)

//   return { fileScope, nodes }
// }

// function applyHeritage(nodes: Node[], fileScope: Scope) {
//   const classNodes = nodes.filter(n => n.kind === NodeKind.Class)
//   const classMap = new Map<string, Node>()
//   for (const node of classNodes) {
//     classMap.set(node.name, node)
//   }

//   const visited = new Set<string>()
//   const visiting = new Set<string>()

//   const ensureMerged = (node: Node) => {
//     if (visited.has(node.name)) return
//     if (visiting.has(node.name)) return
//     visiting.add(node.name)

//     const heritage = [
//       ...(node.extendsTypes ?? []),
//       ...(node.mixins ?? []),
//       ...(node.implementsTypes ?? []),
//     ]

//     for (const parentRef of heritage) {
//       const { base, args } = parseTypeReference(parentRef)
//       const parentNode = classMap.get(base)
//       if (parentNode) ensureMerged(parentNode)
//       const parentSym = fileScope.resolve(base)
//       const parentScope = parentSym?.node.scope
//       if (parentSym?.kind === SymbolKind.Class && parentScope?.kind === ScopeKind.Class) {
//         const mapping = buildTypeArgumentMap(parentSym.node.typeParameters, args)
//         mergeScopeMembers(node.scope, parentScope, base, mapping)
//       }
//     }

//     visited.add(node.name)
//     visiting.delete(node.name)
//   }

//   for (const node of classNodes) {
//     ensureMerged(node)
//   }
// }

// function mergeScopeMembers(target: Scope, source: Scope, parentClassName: string, mapping?: Record<string, string>) {
//   for (const entry of source.symbols.values()) {
//     if (entry.kind === SymbolKind.Constructor || entry.kind === SymbolKind.Parameter) continue
//     if (target.symbols.has(entry.name)) continue
//     target.define({
//       ...entry,
//       node: {
//         ...entry.node,
//         parentClass: parentClassName,
//         type: entry.node.type ? substituteTypeParams(entry.node.type, mapping) : entry.node.type,
//         typeArguments: entry.node.typeArguments?.map(arg => substituteTypeParams(arg, mapping)),
//       }
//     })
//     if (entry.kind === SymbolKind.Method) {
//       for (const methodEntry of entry.node.scope.symbols.values()) {
//         entry.node.scope.define({
//           ...methodEntry,
//           node: {
//             ...methodEntry.node,
//             parentClass: parentClassName,
//             type: methodEntry.node.type ? substituteTypeParams(methodEntry.node.type, mapping) : methodEntry.node.type,
//             typeArguments: methodEntry.node.typeArguments?.map(arg => substituteTypeParams(arg, mapping)),
//           }
//         })
//       }
//     }
//   }
// }

// function parseClassHeritage(tokens: Token[], startIndex: number) {
//   const extendsTypes: string[] = []
//   const implementsTypes: string[] = []
//   const mixins: string[] = []
//   let i = startIndex

//   while (i < tokens.length) {
//     const tok = tokens[i]
//     if (isTriviaToken(tok)) {
//       i++
//       continue
//     }
//     if (tok.text === '{') break
//     if (tok.kind === TokenKind.Keyword && isHeritageKeyword(tok.text)) {
//       const { types, nextIndex } = collectTypeList(tokens, i + 1)
//       if (tok.text === 'extends') {
//         extendsTypes.push(...types)
//       } else if (tok.text === 'implements') {
//         implementsTypes.push(...types)
//       } else if (tok.text === 'with') {
//         mixins.push(...types)
//       }
//       i = nextIndex
//       continue
//     }
//     i++
//   }

//   return {
//     extendsTypes: extendsTypes.length ? extendsTypes : undefined,
//     implementsTypes: implementsTypes.length ? implementsTypes : undefined,
//     mixins: mixins.length ? mixins : undefined,
//   }
// }

// function collectTypeList(tokens: Token[], startIndex: number) {
//   const types: string[] = []
//   let current: Token[] = []
//   let i = startIndex

//   for (; i < tokens.length; i++) {
//     const tok = tokens[i]
//     if (isTriviaToken(tok)) continue
//     if (tok.text === ',') {
//       const name = joinNameTokens(current)
//       if (name) types.push(name)
//       current = []
//       continue
//     }
//     if (tok.text === '{' || (tok.kind === TokenKind.Keyword && isHeritageKeyword(tok.text))) {
//       break
//     }
//     current.push(tok)
//   }

//   const trailing = joinNameTokens(current)
//   if (trailing) types.push(trailing)

//   return { types, nextIndex: i }
// }

// function joinNameTokens(tokens: Token[]): string | undefined {
//   const parts = tokens
//     .filter(tok => !isTriviaToken(tok))
//     .map(tok => tok.text)
//   const joined = parts.join('')
//   return joined.length ? joined : undefined
// }

// function isHeritageKeyword(text?: string) {
//   return text === 'extends' || text === 'implements' || text === 'with'
// }

// function isTriviaToken(tok: Token) {
//   return tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment
// }

// function detectParameterKind(tokens: Token[], index: number): ParameterKind {
//   let curlyBalance = 0
//   let squareBalance = 0
//   let parenBalance = 0
//   for (let i = index - 1; i >= 0; i--) {
//     const tok = tokens[i]
//     if (isTriviaToken(tok)) continue
//     if (tok.text === ')') {
//       parenBalance++
//       continue
//     }
//     if (tok.text === '(') {
//       if (parenBalance > 0) {
//         parenBalance--
//         continue
//       }
//       return ParameterKind.Positional
//     }
//     if (tok.text === ']') {
//       squareBalance++
//       continue
//     }
//     if (tok.text === '[') {
//       if (squareBalance > 0) {
//         squareBalance--
//         continue
//       }
//       return ParameterKind.OptionalPositional
//     }
//     if (tok.text === '}') {
//       curlyBalance++
//       continue
//     }
//     if (tok.text === '{') {
//       if (curlyBalance > 0) {
//         curlyBalance--
//         continue
//       }
//       return ParameterKind.Named
//     }
//   }

//   return ParameterKind.Positional
// }

// function joinTypeTokens(tokens: Token[], start: number, end: number): string | undefined {
//   if (start >= end) return undefined
//   const parts = tokens
//     .slice(start, end)
//     .filter(tok => !isTriviaToken(tok))
//     .map(tok => tok.text)
//   const joined = parts.join('')
//   return joined.length ? joined : undefined
// }

// function readTypeBeforeName(tokens: Token[], nameIndex: number): string | undefined {
//   const collected: Token[] = []
//   for (let i = nameIndex - 1; i >= 0; i--) {
//     const tok = tokens[i]
//     console.log('Reading type token before name:', tok, nameIndex);
//     if (isTriviaToken(tok)) continue
//     if (
//       tok.kind === TokenKind.Symbol
//     ) {
//       if (tok.text === '@') {
//         collected.pop()
//       }
//       if (tok.text === ';' || tok.text === '{' || tok.text === '@') {
//         break
//       }
//     }
//     if (tok.text === 'required' || tok.text === 'final' || tok.text === 'const' || tok.text === 'var' || tok.text === 'static') {
//       break
//     }
//     collected.push(tok)
//   }
//   collected.reverse()
//   const joined: string[] = []
//   let insideFunctionType = false
//   const functionStack: string[] = []
//   for (const tok of collected) {
//     console.log('Processing collected type token:', tok, insideFunctionType, functionStack);
//     if (tok.text === ')' && insideFunctionType) {
//       insideFunctionType = false
//       joined[joined.length - 1] += functionStack.join(', ')  
//     }
//     if (insideFunctionType) {
//       if (tok.text === ',') {
//         continue
//       }
//       functionStack.push(tok.text)
//     } else {
//       if (tok.text === '(') {
//         joined[joined.length - 1] += tok.text
//       } else if (tok.text === ')') {
//         joined[joined.length - 1] += tok.text
//       } else {
//         joined.push(tok.text)
//       }
//     }
//     if (tok.text === '(') {
//       insideFunctionType = true
//     }
//   }
//   return joined.length ? joined.join(' ') : undefined
// }

// function parseTypeParameters(tokens: Token[], startIndex: number): { params?: string[]; nextIndex: number } {
//   const first = nextNonTrivia(tokens, startIndex)
//   if (!first || first.text !== '<') return { params: undefined, nextIndex: startIndex }
//   let depth = 0
//   let buffer = ''
//   let i = startIndex
//   for (; i < tokens.length; i++) {
//     const tok = tokens[i]
//     if (isTriviaToken(tok)) continue
//     buffer += tok.text
//     if (tok.text === '<') depth++
//     else if (tok.text === '>') {
//       depth--
//       if (depth === 0) {
//         i++
//         break
//       }
//     }
//   }
//   const inner = buffer.slice(1, -1)
//   const params = splitTopLevel(inner).map(p => p.trim()).filter(Boolean)
//   return { params: params.length ? params : undefined, nextIndex: i }
// }

// function extractTypeArguments(typeText?: string): string[] | undefined {
//   if (!typeText) return undefined
//   const { args } = parseTypeReference(typeText)
//   return args.length ? args : undefined
// }

// function parseTypeReference(typeText?: string): { base: string; args: string[] } {
//   if (!typeText) return { base: '', args: [] }
//   const lt = typeText.indexOf('<')
//   if (lt === -1) return { base: typeText.trim(), args: [] }
//   const base = typeText.slice(0, lt).trim()
//   const rest = typeText.slice(lt + 1)
//   const lastGt = rest.lastIndexOf('>')
//   const inner = lastGt !== -1 ? rest.slice(0, lastGt) : rest
//   const args = splitTopLevel(inner).map(a => a.trim()).filter(Boolean)
//   return { base, args }
// }

// function splitTopLevel(text: string): string[] {
//   const parts: string[] = []
//   let current = ''
//   let depth = 0
//   for (let i = 0; i < text.length; i++) {
//     const ch = text[i]
//     if (ch === '<') {
//       depth++
//       current += ch
//       continue
//     }
//     if (ch === '>') {
//       depth = Math.max(0, depth - 1)
//       current += ch
//       continue
//     }
//     if (ch === ',' && depth === 0) {
//       parts.push(current)
//       current = ''
//       continue
//     }
//     current += ch
//   }
//   if (current.length) parts.push(current)
//   return parts
// }

// function buildTypeArgumentMap(typeParameters?: string[], args?: string[]): Record<string, string> | undefined {
//   if (!typeParameters?.length || !args?.length) return undefined
//   const map: Record<string, string> = {}
//   for (let i = 0; i < typeParameters.length; i++) {
//     const param = typeParameters[i]
//     if (!param) continue
//     const arg = args[i]
//     if (arg) {
//       map[param] = arg
//     }
//   }
//   return Object.keys(map).length ? map : undefined
// }

// function substituteTypeParams(typeText: string, mapping?: Record<string, string>): string {
//   if (!mapping || !Object.keys(mapping).length) return 'dynamic'
//   let result = typeText
//   for (const [param, arg] of Object.entries(mapping)) {
//     const re = new RegExp(`\\b${param}\\b`, 'g')
//     result = result.replace(re, arg)
//   }
//   return result
// }

// function nextNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string, until?: TokenKind): Token | undefined {
//   for (let i = start; i < tokens.length; i++) {
//     const tok = tokens[i]
//     if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
//     if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) return tok
//     if (until && tok.kind === until) return undefined
//   }
//   return undefined
// }

// function nextsNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string, until?: TokenKind): Token[] {
//   const collectedTokens: Token[] = []
//   for (let i = start; i < tokens.length; i++) {
//     const tok = tokens[i]
//     if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
//     if (until && tok.kind === until) return collectedTokens
//     if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) collectedTokens.push(tok)
//   }
//   return collectedTokens
// }

// function nextNonTriviaOneOf(tokens: Token[], start: number, desiredKinds: TokenKind[], until?: TokenKind, ignoredValue?: string): Token | undefined {
//   for (let i = start; i < tokens.length; i++) {
//     const tok = tokens[i]
//     if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment || tok.text === ignoredValue) continue
//     if (desiredKinds.includes(tok.kind)) return tok
//     if (until && tok.kind === until) return undefined
//   }
//   return undefined
// }

// function prevNonTrivia(tokens: Token[], start: number, desiredKind?: TokenKind, value?: string, until?: TokenKind): Token | undefined {
//   for (let i = start; i >= 0; i--) {
//     const tok = tokens[i]
//     if (tok.kind === TokenKind.Whitespace || tok.kind === TokenKind.LineComment || tok.kind === TokenKind.BlockComment) continue
//     if ((!desiredKind || tok.kind === desiredKind) && (!value || tok.text === value)) return tok
//     if (until && tok.kind === until) return undefined
//   }
//   return undefined
// }

// function findMatchingParenIndex(tokens: Token[], startIndex: number): number | undefined {
//   let depth = 0
//   for (let i = startIndex; i < tokens.length; i++) {
//     const tok = tokens[i]
//     if (tok.text === '(') depth++
//     if (tok.text === ')') {
//       depth--
//       if (depth === 0) return i
//     }
//   }
//   return undefined
// }

// function registerCustomType(customType: CustomType, fileScope: Scope, nodes: Node[]) {
//   const classScope = new Scope(ScopeKind.Class, fileScope)
//   const classNode: Node = {
//     kind: NodeKind.Class,
//     name: customType.name,
//     start: -1,
//     end: -1,
//     scope: classScope,
//     extendsTypes: customType.extends ? [customType.extends] : undefined,
//     typeParameters: customType.typeParameters,
//   }
//   nodes.push(classNode)

//   fileScope.define({
//     name: customType.name,
//     kind: SymbolKind.Class,
//     node: classNode,
//   })

//   const addMember = (name: string, value: string | { type: string; description?: string; typeParameters?: string[] } | {type: string; description?: string; parameters: Parameter[]; typeParameters?: string[]}, isStatic = false) => {
//     const memberType = typeof value === 'string' ? value : value.type
//     const memberTypeArguments = extractTypeArguments(memberType)
//     const valueObj = typeof value === 'string' ? undefined : value
//     const memberTypeParameters = (valueObj as any)?.typeParameters as string[] | undefined
//     if (value.hasOwnProperty('parameters')) {
//       // Method
//       const methodScope = new Scope(ScopeKind.Method, classScope)
//       const methodNode: Node = {
//         kind: NodeKind.Method,
//         name,
//         start: -1,
//         end: -1,
//         scope: methodScope,
//         type: memberType,
//         typeArguments: memberTypeArguments,
//         typeParameters: memberTypeParameters,
//         modifiers: isStatic ? ['static'] : [],
//         parentClass: customType.name,
//         documentation: (value as any).description,
//       }
//       nodes.push(methodNode)
//       for (const paramName of (value as any).parameters) {
//         const modifiers = []
//         if (paramName.required) {
//           modifiers.push('required')
//         }
//         const param: Parameter = paramName
//         const paramNode: Node = {
//           kind: NodeKind.Parameter,
//           name: param.name,
//           start: -1,
//           end: -1,
//           scope: methodScope,
//           type: param.type,
//           typeArguments: extractTypeArguments(param.type),
//           parameterKind: param.kind === 'positional' ? ParameterKind.Positional :
//             param.kind === 'optionalPositional' ? ParameterKind.OptionalPositional :
//             ParameterKind.Named,
//           defaultValue: param.defaultValue,
//           modifiers: modifiers,
//           documentation: param.description,
//         }
//         nodes.push(paramNode)
//         methodScope.define({
//           name: param.name,
//           kind: SymbolKind.Parameter,
//           node: paramNode,
//         })
//       }
//       classScope.define({
//         name,
//         kind: SymbolKind.Method,
//         node: methodNode,
//       })

//     } else {
//       const memberNode: Node = {
//         kind: NodeKind.Field,
//         name,
//         start: -1,
//         end: -1,
//         scope: classScope,
//         type: memberType,
//         typeArguments: memberTypeArguments,
//         parentClass: customType.name,
//         modifiers: isStatic ? ['static'] : [],
//       }
//       nodes.push(memberNode)
//       classScope.define({
//         name,
//         kind: SymbolKind.Field,
//         node: memberNode,
//       })
//     }
//   }

//   if (customType.members) {
//     for (const [memberName, memberValue] of Object.entries(customType.members)) {
//       addMember(memberName, memberValue, false)
//     }
//   }

//   if (customType.staticMembers) {
//     for (const [memberName, memberValue] of Object.entries(customType.staticMembers)) {
//       addMember(memberName, memberValue, true)
//     }
//   }

//   if (customType.constructors?.length) {
//     for (const ctor of customType.constructors) {
//       const ctorScope = new Scope(ScopeKind.Constructor, classScope)
//       const ctorNode: Node = {
//         kind: NodeKind.Constructor,
//         name: ctor.name ?? customType.name,
//         start: -1,
//         end: -1,
//         scope: ctorScope,
//         parentClass: customType.name,
//         documentation: ctor.description,
//       }
//       nodes.push(ctorNode)
//       classScope.define({
//         name: ctor.name ?? customType.name,
//         kind: SymbolKind.Constructor,
//         node: ctorNode,
//       })
//       for (const param of ctor.parameters) {
//         const modifiers = []
//         if (param.required) {
//           modifiers.push('required')
//         }
//         const paramNode: Node = {
//           kind: NodeKind.Parameter,
//           name: param.name,
//           start: -1,
//           end: -1,
//           scope: ctorScope,
//           type: param.type,
//           parameterKind: param.kind === 'positional' ? ParameterKind.Positional :
//             param.kind === 'optionalPositional' ? ParameterKind.OptionalPositional :
//             ParameterKind.Named,
//           defaultValue: param.defaultValue,
//           modifiers: modifiers,
//           documentation: param.description,
//         }
//         nodes.push(paramNode)
//         ctorScope.define({
//           name: param.name,
//           kind: SymbolKind.Parameter,
//           node: paramNode,
          
//         })
//       }
//     }
//   }
// }

// function registerCustomTopLevelFunction(ct: CustomFunction, fileScope: Scope, nodes: Node[]) {
//   const fnScope = new Scope(ScopeKind.Function, fileScope)
//     const node: Node = {
//     kind: NodeKind.Function,
//     name: ct.name,
//     start: -1,
//     end: -1,
//     scope: fnScope,
//     typeParameters: ct.typeParameters,
//     typeArguments: ct.typeParameters,
//     type: ct.returnType,
//   }
//   nodes.push(node)

//   fileScope.define({
//     name: ct.name,
//     kind: SymbolKind.Function,
//     node: node,
//   })

//   for (const param of ct.parameters ?? []) {
//     const modifiers = []
//     if (param.required) {
//       modifiers.push('required')
//     }
//     const paramNode: Node = {
//       kind: NodeKind.Parameter,
//       name: param.name,
//       start: -1,
//       end: -1,
//       scope: fnScope,
//       type: param.type,
//       parameterKind: param.kind === 'positional' ? ParameterKind.Positional :
//         param.kind === 'optionalPositional' ? ParameterKind.OptionalPositional :
//         ParameterKind.Named,
//       defaultValue: param.defaultValue,
//       modifiers: modifiers,
//     }
//     nodes.push(paramNode)
//     fnScope.define({
//       name: param.name,
//       kind: SymbolKind.Parameter,
//       node: paramNode,
//     })
//   }
    

// }

