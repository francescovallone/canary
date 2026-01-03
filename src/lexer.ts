export enum TokenKind {
  Whitespace = 'Whitespace',
  LineComment = 'LineComment',
  BlockComment = 'BlockComment',
  Identifier = 'Identifier',
  Keyword = 'Keyword',
  NumberLiteral = 'NumberLiteral',
  StringLiteral = 'StringLiteral',
  Symbol = 'Symbol',
  Unknown = 'Unknown',
}

export interface Token {
  kind: TokenKind
  text: string
  start: number
  end: number
}

const keywordSet = new Set([
  'class',
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
  'extends',
])

const isIdentifierStart = (ch: string) => /[A-Za-z_]/.test(ch)
const isIdentifierPart = (ch: string) => /[A-Za-z0-9_]/.test(ch)
const isDigit = (ch: string) => /[0-9]/.test(ch)

export function lexDart(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  const push = (kind: TokenKind, start: number, end: number) => {
    tokens.push({ kind, text: code.slice(start, end), start, end })
  }

  while (i < code.length) {
    const start = i
    const ch = code[i]

    // Whitespace
    if (/\s/.test(ch)) {
      i++
      while (i < code.length && /\s/.test(code[i])) i++
      push(TokenKind.Whitespace, start, i)
      continue
    }

    // Line comment
    if (ch === '/' && code[i + 1] === '/') {
      i += 2
      while (i < code.length && code[i] !== '\n') i++
      push(TokenKind.LineComment, start, i)
      continue
    }

    // Block comment (potentially unterminated)
    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      if (i < code.length) i += 2
      push(TokenKind.BlockComment, start, i)
      continue
    }

    // String literal (single or double)
    if (ch === '"' || ch === "'") {
      const quote = ch
      i++
      while (i < code.length) {
        const current = code[i]
        if (current === '\\') {
          i += 2
          continue
        }
        if (current === quote) {
          i++
          break
        }
        i++
      }
      push(TokenKind.StringLiteral, start, i)
      continue
    }

    // Number literal (naive)
    if (isDigit(ch)) {
      i++
      let hasDot = false
      while (i < code.length) {
        const current = code[i]
        if (isDigit(current)) {
          i++
          continue
        }
        if (current === '.' && !hasDot && isDigit(code[i + 1])) {
          hasDot = true
          i++
          continue
        }
        break
      }
      push(TokenKind.NumberLiteral, start, i)
      continue
    }

    // Identifier / keyword
    if (isIdentifierStart(ch)) {
      i++
      while (i < code.length && isIdentifierPart(code[i])) i++
      const text = code.slice(start, i)
      const kind = keywordSet.has(text) ? TokenKind.Keyword : TokenKind.Identifier
      tokens.push({ kind, text, start, end: i })
      continue
    }

    // Symbols (single char fallback)
    if (ch) {
      i++
      push(TokenKind.Symbol, start, i)
      continue
    }

    // Unknown safety
    i++
    push(TokenKind.Unknown, start, i)
  }

  return tokens
}
