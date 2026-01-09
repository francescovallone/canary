import { describe, it, expect } from 'vitest'
import { DartLexer } from '../src/context-builder/lexer'
import { DartParser } from '../src/context-builder/parser'
import { collectFromCST } from '../src/context-builder/collect-from-cst'
import { generateHoversFromCST } from '../src/context-builder/hover-from-cst'

const sample = `
final testString = 'Is it acceptable?';
final details = '$testString';
final detailsWithInterpolation = 'Answer: \${testString}';
final complexString = 'Details: \${'Title: \$testString'}';
`

describe('Check if string interpolation hovers are generated correctly', () => {
  it('creates hover with inferred List<Record> type', () => {
    const lexer = new DartLexer()
    const tokens = lexer.tokenize(sample)
    const parser = new DartParser()
	const cst = parser.parse(tokens)

	const { fileScope } = collectFromCST(cst)
	const hovers = generateHoversFromCST(cst, fileScope)
	console.log(hovers)
  })
})
