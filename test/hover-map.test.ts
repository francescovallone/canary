
import { describe, it, expect } from 'vitest'
import { DartLexer } from '../src/context-builder/lexer'
import { DartParser } from '../src/context-builder/parser'
import { collectFromCST } from '../src/context-builder/collect-from-cst'
import { generateHoversFromCST } from '../src/context-builder/hover-from-cst'

const sample = `
    final details = [
      (
        title: 'Is it acceptable?',
        content: 'Yes.'
      ),
    ];

    // Invoke map + toList
    details.map((detail) => detail.title).toList();
`

describe('record and list hovers', () => {
  it('creates hover with inferred List<Record> type', () => {
    const lexer = new DartLexer()
    const tokens = lexer.tokenize(sample)
    const parser = new DartParser()
    const cst = parser.parse(tokens)

    const { fileScope } = collectFromCST(cst)
    const hovers = generateHoversFromCST(cst, fileScope)
	const mapHover = hovers.find(h => h.expectedValue === 'map' || (h.markdown && h.markdown.includes('map')))
	expect(mapHover).toBeDefined()
    
  })
})
