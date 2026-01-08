/**
 * Collection Literal Parsing & Resolution Test Cases
 * 
 * This file demonstrates the parsing and resolution behavior for Dart collection literals.
 */

import { DartLexer, TokenType } from './lexer';
import { DartParser, CST } from './parser';
import { 
  resolveSetOrMapLiteral, 
  determineCollectionKind,
  ResolutionContext,
  DynamicType,
  makeInterfaceType,
  getResolutionReason,
  elementToString
} from './collection-resolver';

// ========== Test Helper Functions ==========

function parseExpression(code: string): CST.Expression {
  // Wrap in a variable declaration to make it a complete program
  const fullCode = `var x = ${code};`;
  const lexer = new DartLexer();
  const tokens = lexer.tokenize(fullCode);
  const parser = new DartParser();
  const unit = parser.parse(tokens);
  
  // Extract the initializer from the variable declaration
  const decl = unit.declarations[0] as CST.VariableDeclaration;
  return decl.initializer!;
}

function testCase(description: string, code: string, expected: 'set' | 'map' | 'list', context?: ResolutionContext): void {
  console.log(`\n--- ${description} ---`);
  console.log(`Code: ${code}`);
  
  try {
    const expr = parseExpression(code);
    
    if (expr.kind === 'SetOrMapLiteral') {
      const ctx = context ?? { expectedType: null };
      const { resolved, result } = resolveSetOrMapLiteral(expr, ctx);
      
      console.log(`Parsed as: SetOrMapLiteral`);
      console.log(`Resolved to: ${resolved.kind}`);
      console.log(`Reason: ${getResolutionReason(expr, result)}`);
      console.log(`Elements: [${expr.elements.map(elementToString).join(', ')}]`);
      
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.map(e => e.message).join('; ')}`);
      }
      
      const actualKind = resolved.kind === 'SetLiteral' ? 'set' : 'map';
      console.log(`Expected: ${expected}, Actual: ${actualKind} ${expected === actualKind ? '✓' : '✗'}`);
    } else if (expr.kind === 'ListLiteral') {
      console.log(`Parsed as: ListLiteral`);
      console.log(`Elements: ${expr.elements.length}`);
      console.log(`Expected: ${expected}, Actual: list ${expected === 'list' ? '✓' : '✗'}`);
    } else {
      console.log(`Unexpected expression kind: ${expr.kind}`);
    }
  } catch (e) {
    console.log(`Error: ${e}`);
  }
}

// ========== Test Cases ==========

export function runAllTests(): void {
  console.log('='.repeat(60));
  console.log('DART COLLECTION LITERAL PARSING & RESOLUTION TESTS');
  console.log('='.repeat(60));

  // ========== Empty Literals ==========
  console.log('\n\n### Empty Literals ###');
  
  testCase('Empty braces (default)', '{}', 'map');
  
  testCase('Empty braces with Set context', '{}', 'set', {
    expectedType: makeInterfaceType('Set', [DynamicType])
  });
  
  testCase('Empty braces with Map context', '{}', 'map', {
    expectedType: makeInterfaceType('Map', [DynamicType, DynamicType])
  });
  
  testCase('Empty braces with Iterable context', '{}', 'set', {
    expectedType: makeInterfaceType('Iterable', [DynamicType])
  });

  // ========== Type Arguments ==========
  console.log('\n\n### Type Arguments ###');
  
  testCase('Single type arg = Set', '<int>{}', 'set');
  testCase('Two type args = Map', '<String, int>{}', 'map');
  testCase('Empty list', '[]', 'list');
  testCase('Typed empty list', '<String>[]', 'list');

  // ========== Plain Elements ==========
  console.log('\n\n### Plain Elements ###');
  
  testCase('Set with expressions', '{1, 2, 3}', 'set');
  testCase('Set with identifiers', '{a, b, c}', 'set');
  testCase('Map with entries', '{1: "a", 2: "b"}', 'map');
  testCase('Map with string keys', '{"name": "John", "age": 30}', 'map');

  // ========== Spread Elements ==========
  console.log('\n\n### Spread Elements ###');
  
  testCase('Spread expression', '{...items}', 'set');  // Default to set with spreads
  testCase('Null-aware spread', '{...?maybeItems}', 'set');
  testCase('List with spread', '[...items]', 'list');

  // ========== If Elements ==========
  console.log('\n\n### If Elements ###');
  
  testCase('Set with if element', '{if (true) 1}', 'set');
  testCase('Set with if-else element', '{if (cond) 1 else 2}', 'set');
  testCase('Map with if element', '{if (true) "key": "value"}', 'map');
  testCase('List with if element', '[if (true) 1]', 'list');

  // ========== For Elements ==========
  console.log('\n\n### For Elements ###');
  
  testCase('Set with for-in element', '{for (var x in items) x}', 'set');
  testCase('Map with for-in element', '{for (var x in items) x: x}', 'map');
  testCase('List with for-in element', '[for (var x in items) x]', 'list');

  // ========== Combined Elements ==========
  console.log('\n\n### Combined Elements ###');
  
  testCase('Set with mixed elements', '{1, if (cond) 2, ...items}', 'set');
  testCase('Map with mixed elements', '{"a": 1, if (cond) "b": 2}', 'map');
  testCase('Nested collection in set', '{{1, 2}, {3, 4}}', 'set');
  testCase('Nested collection in map', '{1: {2: 3}}', 'map');

  console.log('\n\n' + '='.repeat(60));
  console.log('TESTS COMPLETE');
  console.log('='.repeat(60));
}

// ========== Resolution Decision Tree (for documentation) ==========

export function printDecisionTree(): void {
  console.log(`
DART COLLECTION LITERAL RESOLUTION DECISION TREE
=================================================

1. BRACKETS: [...]
   └── Always List<T>

2. BRACES WITH TYPE ARGS: <T1, ...>{...}
   ├── 1 type arg  → Set<T>
   ├── 2 type args → Map<K, V>
   └── Other count → ERROR

3. BRACES WITH ELEMENTS: {...}
   ├── Any MapEntry (key: value) present?
   │   └── YES → Map
   │
   ├── Any plain expression (no colon)?
   │   └── YES → Set
   │
   ├── Only spreads?
   │   ├── All spread Map sources → Map
   │   ├── All spread Iterable sources → Set
   │   └── Mixed → ERROR
   │
   └── No elements?
       ├── Context type is Set<T> → Set<T>
       ├── Context type is Map<K,V> → Map<K,V>
       ├── Context type is Iterable<T> → Set<T>
       └── No context → Map<dynamic, dynamic> (DEFAULT)

4. VALIDATION ERRORS:
   - Mixed map entries and set elements in same literal
   - Mixed Map and Iterable spreads in same literal
   - If-element branches with inconsistent structure
   - Invalid type argument count

`);
}

// ========== Element Structure Analysis ==========

export function analyzeElement(element: CST.CollectionElement): string {
  switch (element.kind) {
    case 'ExpressionElement':
      return `Expression: (indicates Set)`;
    
    case 'MapEntryElement':
      return `MapEntry: key:value (indicates Map)`;
    
    case 'SpreadElement':
      return `Spread: ${element.isNullAware ? '...?' : '...'}expr (type-dependent)`;
    
    case 'IfElement':
      const thenPart = `then: ${analyzeElement(element.thenElement)}`;
      const elsePart = element.elseElement 
        ? `, else: ${analyzeElement(element.elseElement)}`
        : '';
      return `If: ${thenPart}${elsePart}`;
    
    case 'ForElement':
      return `For: body=${analyzeElement(element.body)}`;
    
    default:
      return 'Unknown element type';
  }
}

// Exports are already done inline via 'export function'
