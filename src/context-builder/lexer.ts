export enum TokenKind {
  Whitespace = 'Whitespace',
  LineComment = 'LineComment',
  BlockComment = 'BlockComment',
  Identifier = 'Identifier',
  ClassIdentifier = 'ClassIdentifier',
  InstanceExpression = 'InstanceExpression',
  Keyword = 'Keyword',
  NumberLiteral = 'NumberLiteral',
  StringLiteral = 'StringLiteral',
  Symbol = 'Symbol',
  Unknown = 'Unknown',
}

export interface Token {
  kind: TokenKind
  text: string
  parameters?: Token[]
  start: number
  end: number
}

const keywordSet = new Set([
  'class',
  'const',
  'factory',
  'final',
  'var',
  'true',
  'false',
  'return',
  'int',
  'double',
  'bool',
  'String',
  'dynamic',
  'Object',
  'extends',
  'implements',
  'required',
  'static',
  'with',
  'get',
  'set',
  'void',
])

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isDigitOrDot(ch: string): boolean {
  return isDigit(ch) || ch === '.'
}

function isIdentifierStart(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    ch === '_'
  )
}

function isIdentifierPart(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch)
}

export function lex(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  const len = source.length

  while (i < len) {
    const start = i
    const ch = source[i]

    // 1. Whitespace
    if (isWhitespace(ch)) {
      i++
      while (i < len && isWhitespace(source[i])) i++
      tokens.push(token(TokenKind.Whitespace, start))
      continue
    }

    // 2. Line comment //
    if (ch === '/' && source[i + 1] === '/') {
      i += 2
      while (i < len && source[i] !== '\n') i++
      tokens.push(token(TokenKind.LineComment, start))
      continue
    }

    // 3. Block comment /* */
    if (ch === '/' && source[i + 1] === '*') {
      i += 2
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i++
      if (i < len) i += 2 // consume */
      tokens.push(token(TokenKind.BlockComment, start))
      continue
    }

    // 4. String literal
    if (ch === '"' || ch === "'") {
      const quote = ch
      i++
      while (i < len) {
        if (source[i] === '\\') {
          i += 2 // escape
          continue
        }
        if (source[i] === quote) {
          i++
          break
        }
        i++
      }
      tokens.push(token(TokenKind.StringLiteral, start))
      continue
    }

    // 5. Number literal
    if (isDigit(ch)) {
      i++
      while (i < len && isDigitOrDot(source[i])) i++
      tokens.push(token(TokenKind.NumberLiteral, start))
      continue
    }

    // 6. Identifier / Keyword
    if (isIdentifierStart(ch)) {
      i++
      while (i < len && isIdentifierPart(source[i])) i++
      const text = source.slice(start, i)
      tokens.push({
        kind: keywordSet.has(text) ? TokenKind.Keyword : TokenKind.Identifier,
        text,
        start,
        end: i,
      })
      continue
    }

    // 7. Symbol (single-char on purpose)
    i++
    tokens.push(token(TokenKind.Symbol, start))
  }

  return tokens

  // ---- helpers ----

  function token(kind: TokenKind, start:number): Token {
    return {
      kind,
      text: source.slice(start, i),
      start,
      end: i,
    }
  }
}

