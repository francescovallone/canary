/**
 * Collection Literal Resolution
 * 
 * This module handles the semantic resolution of Dart collection literals.
 * During parsing, `{...}` creates a `SetOrMapLiteral` node because the parser
 * cannot determine the collection type syntactically in all cases.
 * 
 * This resolver transforms SetOrMapLiteral into either SetLiteral or MapLiteral
 * based on:
 * 
 * 1. Explicit type arguments (<T> → Set, <K,V> → Map)
 * 2. Element structure (MapEntryElement → Map, plain expressions → Set)
 * 3. Spread element source types (Iterable → Set, Map → Map)
 * 4. Context type (expected type from surrounding code)
 * 5. Default: empty {} with no context → Map<dynamic, dynamic>
 */

import { CST } from './parser';

// ========== Type Representations ==========

export interface DartType {
  kind: 'interface' | 'function' | 'record' | 'dynamic' | 'void' | 'never';
  name: string;
  typeArguments: DartType[];
  isNullable: boolean;
}

export const DynamicType: DartType = {
  kind: 'dynamic',
  name: 'dynamic',
  typeArguments: [],
  isNullable: false,
};

export function makeInterfaceType(name: string, typeArgs: DartType[] = [], nullable = false): DartType {
  return {
    kind: 'interface',
    name,
    typeArguments: typeArgs,
    isNullable: nullable,
  };
}

export function isSubtypeOf(subtype: DartType | null, supertype: DartType): boolean {
  if (!subtype) return false;
  if (supertype.kind === 'dynamic') return true;
  if (subtype.kind === 'dynamic') return true;
  
  // Simple name-based check (full subtyping would need class hierarchy)
  if (subtype.name === supertype.name) return true;
  
  // Set is Iterable
  if (subtype.name === 'Set' && supertype.name === 'Iterable') return true;
  if (subtype.name === 'List' && supertype.name === 'Iterable') return true;
  
  return false;
}

// ========== Resolution Result Types ==========

export type CollectionKind = 'list' | 'set' | 'map' | 'ambiguous';

export interface ElementAnalysisResult {
  kind: CollectionKind;
  hasMapEntries: boolean;
  hasExpressions: boolean;
  hasSpreadsOnly: boolean;
  spreadSourceKinds: ('map' | 'iterable' | 'unknown')[];
}

export interface ResolutionError {
  message: string;
  range: CST.Range;
}

export interface CollectionResolutionResult {
  resolvedKind: 'set' | 'map';
  elementType?: DartType;      // For Set<T>
  keyType?: DartType;          // For Map<K, V>
  valueType?: DartType;        // For Map<K, V>
  errors: ResolutionError[];
}

// ========== Resolution Context ==========

export interface ResolutionContext {
  /** Expected type from context (e.g., variable declaration, return type) */
  expectedType: DartType | null;
  
  /** Type resolver for looking up expression types */
  getExpressionType?: (expr: CST.Expression) => DartType | null;
  
  /** Type resolver for spread elements */
  getSpreadSourceType?: (expr: CST.Expression) => DartType | null;
}

// ========== Main Resolution Functions ==========

/**
 * Resolve a SetOrMapLiteral to either a SetLiteral or MapLiteral.
 * This is the main entry point for collection resolution.
 */
export function resolveSetOrMapLiteral(
  node: CST.SetOrMapLiteral,
  context: ResolutionContext
): { resolved: CST.SetLiteral | CST.MapLiteral; result: CollectionResolutionResult } {
  const result = determineCollectionKind(node, context);
  
  if (result.resolvedKind === 'set') {
    const setLiteral: CST.SetLiteral = {
      kind: 'SetLiteral',
      constKeyword: node.constKeyword,
      typeArguments: node.typeArguments,
      openBrace: node.openBrace,
      closeBrace: node.closeBrace,
      elements: node.elements,
      range: node.range,
    };
    return { resolved: setLiteral, result };
  } else {
    const mapLiteral: CST.MapLiteral = {
      kind: 'MapLiteral',
      constKeyword: node.constKeyword,
      typeArguments: node.typeArguments,
      openBrace: node.openBrace,
      closeBrace: node.closeBrace,
      entries: node.elements,
      range: node.range,
    };
    return { resolved: mapLiteral, result };
  }
}

/**
 * Determine whether a SetOrMapLiteral should resolve to Set or Map.
 * Implements the Dart specification's resolution algorithm.
 */
export function determineCollectionKind(
  node: CST.SetOrMapLiteral,
  context: ResolutionContext
): CollectionResolutionResult {
  const errors: ResolutionError[] = [];

  // ========== Step 1: Check explicit type arguments ==========
  if (node.typeArguments) {
    const typeArgCount = node.typeArguments.types.length;
    
    if (typeArgCount === 1) {
      // <T>{} → Set<T>
      return {
        resolvedKind: 'set',
        elementType: typeAnnotationToDartType(node.typeArguments.types[0]),
        errors,
      };
    } else if (typeArgCount === 2) {
      // <K, V>{} → Map<K, V>
      return {
        resolvedKind: 'map',
        keyType: typeAnnotationToDartType(node.typeArguments.types[0]),
        valueType: typeAnnotationToDartType(node.typeArguments.types[1]),
        errors,
      };
    } else {
      // Invalid type argument count
      errors.push({
        message: `Collection literal requires 1 type argument for Set or 2 for Map, got ${typeArgCount}`,
        range: node.typeArguments.range,
      });
      // Default to map
      return {
        resolvedKind: 'map',
        keyType: DynamicType,
        valueType: DynamicType,
        errors,
      };
    }
  }

  // ========== Step 2: Analyze elements ==========
  const elementAnalysis = analyzeElements(node.elements, context);

  // Check for mixed elements (both map entries and set expressions)
  if (elementAnalysis.hasMapEntries && elementAnalysis.hasExpressions) {
    errors.push({
      message: 'Cannot mix map entries and set elements in the same literal',
      range: node.range,
    });
    // Prefer map since map entries are more explicit
    return {
      resolvedKind: 'map',
      keyType: DynamicType,
      valueType: DynamicType,
      errors,
    };
  }

  // If we have map entries, it's definitely a map
  if (elementAnalysis.hasMapEntries) {
    return {
      resolvedKind: 'map',
      keyType: DynamicType,  // Would need full type inference
      valueType: DynamicType,
      errors,
    };
  }

  // If we have plain expressions (not map entries), it's a set
  if (elementAnalysis.hasExpressions) {
    return {
      resolvedKind: 'set',
      elementType: DynamicType,  // Would need full type inference
      errors,
    };
  }

  // ========== Step 3: All spreads - analyze spread sources ==========
  if (elementAnalysis.hasSpreadsOnly && elementAnalysis.spreadSourceKinds.length > 0) {
    const hasMapSpread = elementAnalysis.spreadSourceKinds.includes('map');
    const hasIterableSpread = elementAnalysis.spreadSourceKinds.includes('iterable');

    if (hasMapSpread && hasIterableSpread) {
      errors.push({
        message: 'Cannot spread both Map and Iterable in the same literal',
        range: node.range,
      });
      return {
        resolvedKind: 'map',
        keyType: DynamicType,
        valueType: DynamicType,
        errors,
      };
    }

    if (hasMapSpread) {
      return {
        resolvedKind: 'map',
        keyType: DynamicType,
        valueType: DynamicType,
        errors,
      };
    }

    if (hasIterableSpread) {
      return {
        resolvedKind: 'set',
        elementType: DynamicType,
        errors,
      };
    }
  }

  // ========== Step 4: Empty literal - use context type ==========
  if (node.elements.length === 0) {
    return resolveEmptyLiteralFromContext(context, errors, node.range);
  }

  // ========== Step 5: Default to Map ==========
  return {
    resolvedKind: 'map',
    keyType: DynamicType,
    valueType: DynamicType,
    errors,
  };
}

/**
 * Analyze collection elements to determine their structure.
 */
function analyzeElements(
  elements: CST.CollectionElement[],
  context: ResolutionContext
): ElementAnalysisResult {
  let hasMapEntries = false;
  let hasExpressions = false;
  let hasSpreadsOnly = true;
  const spreadSourceKinds: ('map' | 'iterable' | 'unknown')[] = [];

  for (const element of elements) {
    const analysis = analyzeElement(element, context);
    
    if (analysis.isMapEntry) hasMapEntries = true;
    if (analysis.isExpression) hasExpressions = true;
    if (!analysis.isSpread) hasSpreadsOnly = false;
    if (analysis.spreadKind) spreadSourceKinds.push(analysis.spreadKind);
  }

  // If we have no elements, it's not "spreads only"
  if (elements.length === 0) hasSpreadsOnly = false;

  return {
    kind: hasMapEntries ? 'map' : hasExpressions ? 'set' : 'ambiguous',
    hasMapEntries,
    hasExpressions,
    hasSpreadsOnly: hasSpreadsOnly && elements.length > 0,
    spreadSourceKinds,
  };
}

interface SingleElementAnalysis {
  isMapEntry: boolean;
  isExpression: boolean;
  isSpread: boolean;
  spreadKind: 'map' | 'iterable' | 'unknown' | null;
}

/**
 * Analyze a single collection element.
 */
function analyzeElement(
  element: CST.CollectionElement,
  context: ResolutionContext
): SingleElementAnalysis {
  switch (element.kind) {
    case 'MapEntryElement':
      return {
        isMapEntry: true,
        isExpression: false,
        isSpread: false,
        spreadKind: null,
      };

    case 'ExpressionElement':
      return {
        isMapEntry: false,
        isExpression: true,
        isSpread: false,
        spreadKind: null,
      };

    case 'SpreadElement':
      const spreadKind = determineSpreadKind(element, context);
      return {
        isMapEntry: false,
        isExpression: false,
        isSpread: true,
        spreadKind,
      };

    case 'IfElement':
      // Recursively analyze branches
      const thenAnalysis = analyzeElement(element.thenElement, context);
      const elseAnalysis = element.elseElement 
        ? analyzeElement(element.elseElement, context)
        : null;

      // Both branches must agree on kind
      return {
        isMapEntry: thenAnalysis.isMapEntry || (elseAnalysis?.isMapEntry ?? false),
        isExpression: thenAnalysis.isExpression || (elseAnalysis?.isExpression ?? false),
        isSpread: thenAnalysis.isSpread && (elseAnalysis?.isSpread ?? true),
        spreadKind: thenAnalysis.spreadKind ?? elseAnalysis?.spreadKind ?? null,
      };

    case 'ForElement':
      // Analyze the body
      return analyzeElement(element.body, context);

    default:
      return {
        isMapEntry: false,
        isExpression: false,
        isSpread: false,
        spreadKind: null,
      };
  }
}

/**
 * Determine if a spread expression is spreading a Map or Iterable.
 */
function determineSpreadKind(
  spread: CST.SpreadElement,
  context: ResolutionContext
): 'map' | 'iterable' | 'unknown' {
  if (!context.getSpreadSourceType) {
    return 'unknown';
  }

  const sourceType = context.getSpreadSourceType(spread.expression);
  if (!sourceType) {
    return 'unknown';
  }

  if (sourceType.name === 'Map') {
    return 'map';
  }

  if (sourceType.name === 'List' || 
      sourceType.name === 'Set' || 
      sourceType.name === 'Iterable') {
    return 'iterable';
  }

  // Check if it implements Iterable or Map
  // This would need full type hierarchy analysis
  return 'unknown';
}

/**
 * Resolve an empty literal {} based on context type.
 */
function resolveEmptyLiteralFromContext(
  context: ResolutionContext,
  errors: ResolutionError[],
  range: CST.Range
): CollectionResolutionResult {
  const expected = context.expectedType;

  if (!expected) {
    // No context - default to Map<dynamic, dynamic>
    return {
      resolvedKind: 'map',
      keyType: DynamicType,
      valueType: DynamicType,
      errors,
    };
  }

  // Check if context expects a Set
  if (expected.name === 'Set') {
    return {
      resolvedKind: 'set',
      elementType: expected.typeArguments[0] ?? DynamicType,
      errors,
    };
  }

  // Check if context expects a Map
  if (expected.name === 'Map') {
    return {
      resolvedKind: 'map',
      keyType: expected.typeArguments[0] ?? DynamicType,
      valueType: expected.typeArguments[1] ?? DynamicType,
      errors,
    };
  }

  // Check if context expects Iterable (implies Set)
  if (expected.name === 'Iterable') {
    return {
      resolvedKind: 'set',
      elementType: expected.typeArguments[0] ?? DynamicType,
      errors,
    };
  }

  // Unknown context - default to Map
  return {
    resolvedKind: 'map',
    keyType: DynamicType,
    valueType: DynamicType,
    errors,
  };
}

/**
 * Convert a CST TypeAnnotation to a DartType.
 */
function typeAnnotationToDartType(annotation: CST.TypeAnnotation): DartType {
  const typeName = annotation.typeName;
  
  let name: string;
  if (typeName.kind === 'TypeName') {
    name = typeName.parts.map(p => p.lexeme).join('.');
  } else if (typeName.kind === 'FunctionTypeName') {
    // Function types are complex - simplified here
    name = 'Function';
  } else if (typeName.kind === 'RecordTypeName') {
    name = 'Record';
  } else {
    name = 'dynamic';
  }

  const typeArgs = annotation.typeArguments?.types.map(typeAnnotationToDartType) ?? [];

  return {
    kind: 'interface',
    name,
    typeArguments: typeArgs,
    isNullable: annotation.isNullable,
  };
}

// ========== Validation Functions ==========

/**
 * Validate that if-element branches have consistent structure.
 * Both branches must produce the same kind of element (both map entries or both set elements).
 */
export function validateIfElementConsistency(
  element: CST.IfElement,
  context: ResolutionContext
): ResolutionError[] {
  const errors: ResolutionError[] = [];

  if (!element.elseElement) {
    return errors; // No else branch, nothing to check
  }

  const thenAnalysis = analyzeElement(element.thenElement, context);
  const elseAnalysis = analyzeElement(element.elseElement, context);

  if (thenAnalysis.isMapEntry !== elseAnalysis.isMapEntry) {
    errors.push({
      message: 'If-element branches must have consistent structure: ' +
        'both must be map entries or both must be set elements',
      range: element.range,
    });
  }

  return errors;
}

/**
 * Validate that a collection doesn't mix Map entries with Set elements.
 */
export function validateCollectionConsistency(
  elements: CST.CollectionElement[],
  context: ResolutionContext
): ResolutionError[] {
  const errors: ResolutionError[] = [];
  const analysis = analyzeElements(elements, context);

  if (analysis.hasMapEntries && analysis.hasExpressions) {
    errors.push({
      message: 'Cannot mix map entries (key: value) with set elements in the same collection literal',
      range: [elements[0].range[0], elements[elements.length - 1].range[1]],
    });
  }

  // Also validate spread consistency
  if (analysis.spreadSourceKinds.includes('map') && analysis.spreadSourceKinds.includes('iterable')) {
    errors.push({
      message: 'Cannot spread both Map and Iterable sources in the same collection literal',
      range: [elements[0].range[0], elements[elements.length - 1].range[1]],
    });
  }

  return errors;
}

// ========== Helper for AST Transformation ==========

/**
 * Transform a resolved SetOrMapLiteral into a type-specific literal.
 * This function recursively processes the expression tree.
 */
export function transformExpression(
  expr: CST.Expression,
  context: ResolutionContext
): CST.Expression {
  if (expr.kind === 'SetOrMapLiteral') {
    const { resolved } = resolveSetOrMapLiteral(expr, context);
    return resolved;
  }
  
  // Recursively transform nested expressions
  // This would need to handle all expression types...
  // For brevity, just return the expression
  return expr;
}

/**
 * Check if an expression is a collection literal that needs resolution.
 */
export function needsResolution(expr: CST.Expression): boolean {
  return expr.kind === 'SetOrMapLiteral';
}

// ========== Debug/Utility Functions ==========

/**
 * Pretty-print a collection element for debugging.
 */
export function elementToString(element: CST.CollectionElement): string {
  switch (element.kind) {
    case 'ExpressionElement':
      return `expr`;
    case 'MapEntryElement':
      return `key: value`;
    case 'SpreadElement':
      return element.isNullAware ? `...?expr` : `...expr`;
    case 'IfElement':
      return element.elseElement 
        ? `if (...) ${elementToString(element.thenElement)} else ${elementToString(element.elseElement)}`
        : `if (...) ${elementToString(element.thenElement)}`;
    case 'ForElement':
      return `for (...) ${elementToString(element.body)}`;
    default:
      return 'unknown';
  }
}

/**
 * Get a human-readable description of why a literal resolved to Set or Map.
 */
export function getResolutionReason(
  node: CST.SetOrMapLiteral,
  result: CollectionResolutionResult
): string {
  if (node.typeArguments) {
    const count = node.typeArguments.types.length;
    if (count === 1) return 'Resolved to Set because of single type argument <T>';
    if (count === 2) return 'Resolved to Map because of two type arguments <K, V>';
  }

  if (node.elements.length === 0) {
    return `Resolved to ${result.resolvedKind} based on context type (empty literal)`;
  }

  const hasMapEntry = node.elements.some(e => e.kind === 'MapEntryElement');
  if (hasMapEntry) {
    return 'Resolved to Map because elements contain key: value pairs';
  }

  const hasExpression = node.elements.some(e => e.kind === 'ExpressionElement');
  if (hasExpression) {
    return 'Resolved to Set because elements are plain expressions (no colons)';
  }

  return `Resolved to ${result.resolvedKind} (default fallback)`;
}
