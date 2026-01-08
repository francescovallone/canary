import { describe, it, expect } from 'vitest'
import { DartLexer } from '../src/context-builder/lexer'
import { DartParser } from '../src/context-builder/parser'
import { collectFromCST } from '../src/context-builder/collect-from-cst'
import { generateHoversFromCST } from '../src/context-builder/hover-from-cst'

const sample = `
final details = [
  (
    title: 'Is it acceptable?',
    content: 'Yes. It adheres to the WAI-ARIA design pattern.',
  ),
  (
    title: 'Is it styled?',
    content: "Yes. It comes with default styles that matches the other components' aesthetic.",
  ),
];
`

describe('record and list hovers', () => {
  it('creates hover with inferred List<Record> type', () => {
    const lexer = new DartLexer()
    const tokens = lexer.tokenize(sample)
    const parser = new DartParser()
    const cst = parser.parse(tokens)

    const { fileScope } = collectFromCST(cst)
    const hovers = generateHoversFromCST(cst, fileScope)

    const names = Array.from(fileScope.symbols.keys())
    expect(names).toContain('details')

    // Symbol should be defined with inferred record list type
    const detailsSym = fileScope.resolve('details')
    expect(detailsSym).toBeDefined()
    expect(detailsSym?.node.type).toContain('List<({String title, String content})>')

    // Hover should also surface the same type
    const detailsHover = hovers.find(h => h.expectedValue === 'details')
    expect(detailsHover).toBeDefined()
    expect(detailsHover?.markdown).toContain('List<({String title, String content})>')
  })
})
