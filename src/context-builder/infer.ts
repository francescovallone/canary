import { Token, TokenKind } from './lexer'

export function inferTypeFromTokens(
  tokens: Token[],
  start?: number,
  end?: number
): string | undefined {
  if (start == null || end == null) return

  const slice = tokens.filter(
    t => t.start >= start && t.end <= end
  )

  if (slice.length === 0) return

  // Constructor call: Foo(...)
  if (
    slice[0].kind === TokenKind.Identifier &&
    slice[1]?.text === '('
  ) {
    return slice[0].text
  }

  // Literal inference
  const t = slice[0]

  if (t.kind === TokenKind.NumberLiteral) {
    return t.text.includes('.') ? 'double' : 'int'
  }

  if (t.kind === TokenKind.StringLiteral) {
    return 'String'
  }

  if (t.text === 'true' || t.text === 'false') {
    return 'bool'
  }

  return
}
