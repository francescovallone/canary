import { hastToHtml, type ShikiTransformer, type ThemedToken } from 'shiki'
import { DartLexer, Token as LexerToken } from './context-builder/lexer'
import { CST, DartParser } from './context-builder/parser'
import { collectFromCST } from './context-builder/collect-from-cst'
import { generateHoversFromCST, type Hover } from './context-builder/hover-from-cst'
import { Element, ElementContent } from 'hast'
import { CustomTypesConfig } from './define-types'
import { Scope } from './context-builder/scope'

interface CanaryMeta {
  canary?: { hovers: Hover[], notations: CST.Notation[] }
}

export interface CanaryTransformerOptions {
  /**
   * If true, the transformer will only run on code blocks
   * that include the `canary` directive in the first line of metadata.
   * If false, it will run on all Dart code blocks.
   * @default false
   */
  explicitTrigger?: boolean,

  /**
   * Custom types to include in the analysis.
   * These types will be merged with the built-in Dart types.
   * You can use this to add types from your own libraries.
   */
  customTypes?: CustomTypesConfig
}

const isDartLang = (lang: string | undefined) => (lang ?? '').toLowerCase() === 'dart'

const getTriggerDirective = (meta: string): boolean => {
  if (meta.length === 0) return false
  const lines = meta.split(' ')
  if (lines.length === 0) return false
  const canaryDirective = lines.find(line => line.trim().startsWith('canary'))
  return Boolean(canaryDirective)
}

// const getFileNameFromMeta = (meta: string): string | undefined => {
//   if (meta.length === 0) return undefined
//   const lines = meta.split(' ')
//   if (lines.length === 0) return undefined
//   const fileDirective = lines.find(line => line.trim().startsWith('canary:'))
//   if (!fileDirective) return undefined
//   const parts = fileDirective.split(':')
//   if (parts.length < 2) return undefined
//   return parts[1].trim()
// }

export function canaryTransformer(options?: CanaryTransformerOptions): ShikiTransformer {
  const explicitTrigger = options?.explicitTrigger ?? false
  const customTypes = options?.customTypes
  const errorLines: { [key: number]: string[] } = {}
  let isDart = false
  return {
    name: 'canary',
    preprocess(code, options) {
      const trigger = getTriggerDirective(options?.meta?.__raw || '')
      if (!isDartLang(String((options as any).lang))) return
      isDart = true
      if (explicitTrigger && !trigger) return
      // Analyse on original code (with directives intact)
      const lexer = new DartLexer()
      const tokens = lexer.tokenize(code)
      const parser = new DartParser()
      const cst = parser.parse(tokens)
      // Collect symbols from CST and build scope tree (inject custom types if provided)
      const { fileScope } = collectFromCST(cst, customTypes?.types)
      // Generate hovers directly from CST (no shallow token-based resolution)
      const hovers = generateHoversFromCST(cst, fileScope)
      ;(this.meta as CanaryMeta).canary = { hovers, notations: cst.notations }

      return code
    },
    code(code) {
      // Get line numbers to hide
      const meta = (this.meta as CanaryMeta).canary
      if (!meta || !meta.notations?.length) return code
      const notations = meta.notations
      const linesToHide = new Set(
        notations
          .map(n => n.line)
      )
      let indexOffset = 0;
      // Filter out hidden lines
      code.children = code.children.filter((lineNode, index) => {
        if (lineNode.type === 'text') {
          if (linesToHide.has(index + 1 - indexOffset + 1)) {
            return false
          }
        }
        if (lineNode.type === 'element' && lineNode.properties.class === 'line') {
          if (linesToHide.has(index + 1 - indexOffset)) {
            return false
          }
          indexOffset++;
        }
        return true
      })
      return code
    },
    span(hast, _line, _col, _lineElement, token) {
      const meta = (this.meta as CanaryMeta).canary
      if (!meta || !meta.hovers?.length) return
      const hovers = findHoversForToken(token, meta.hovers)
      if (!hovers) return
      const notation = meta.notations.find(n => n.line === _line + 1)
      const segments = buildHoverSegments(token, hovers, notation);
      if (segments.length === 0) return
      const tokenText = token.content
      const nextChildren: ElementContent[] = []
      let cursor = 0
      for (const segment of segments) {
        if (cursor < segment.start) {
          nextChildren.push({ type: 'text', value: tokenText.slice(cursor, segment.start) })
        }
        const segmentText = tokenText.slice(segment.start, segment.end)
        const normalized = normalizeSpan(segmentText, segment.hover) ?? {
          adjustedText: segmentText,
          pushBefore: '',
          pushAfter: '',
        }
        if (normalized.pushBefore.length > 0) {
          nextChildren.push({ type: 'text', value: normalized.pushBefore })
        }

        const innerSpan: any = {
          type: 'element',
          tagName: 'span',
          properties: {},
          children: [{ type: 'text', value: normalized.adjustedText }],
        }
        const typeCode: Element = {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: this.codeToHast(
            segment.hover.markdown,
            {
              ...this.options,
              meta: {},
              transformers: [],
              lang: 'dart',
              structure: segment.hover.markdown.trim().includes('\n') ? 'classic' : 'inline',
            },
          ).children as ElementContent[],
        }
        typeCode.properties.className = 'canary-popup-code'
        const wrapperDiv: any = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: mergeClass(undefined, 'dart-inspectable'),
            'data-dart-hover-code': encodeURIComponent(hastToHtml(typeCode)),
            'data-dart-hover-docs': encodeURIComponent(segment.hover.documentation || ''),
            'data-dart-hover-range': `${segment.hover.range.start}-${segment.hover.range.end}`,
            'data-dart-notation': segment.notation ? segment.notation.kind : undefined,
          },
          children: [innerSpan],
        }

        nextChildren.push(wrapperDiv)

        if (normalized.pushAfter.length > 0) {
          nextChildren.push({ type: 'text', value: normalized.pushAfter })
        }
        
        cursor = segment.end
      }

      if (cursor < tokenText.length) {
        nextChildren.push({ type: 'text', value: tokenText.slice(cursor) })
      }

      hast.children = nextChildren
    },
    pre(hast) {
      if (!isDart) return
      this.addClassToHast(hast, 'canary')
      isDart = false
    },
  }
}

function normalizeSpan(sanitized: string, hover: Hover): { adjustedText: string; pushBefore: string; pushAfter: string } | undefined {
  let adjustedText = sanitized
  let pushBefore = ''
  let pushAfter = ''
  const expected = hover.expectedValue || sanitized
  if (expected.length < sanitized.length) {
    const { before, after } = getMissingCharacters(expected, sanitized)
    if (before.length === 0 && after.length === 0) {
      return undefined
    }
    adjustedText = sanitized.slice(before.length, sanitized.length - after.length)
    pushBefore = before
    pushAfter = after
  }
  return { adjustedText, pushBefore, pushAfter }
}

function getMissingCharacters(expected: string, sanitized: string): { before: string; after: string } {
  // Prefer a direct containment check: find where the actual string sits inside expected.
  const idx = sanitized.indexOf(expected)
  if (idx !== -1) {
    return {
      before: sanitized.slice(0, idx),
      after: sanitized.slice(idx + expected.length),
    }
  }

  // Fallback: compute common prefix/suffix and take the middle as missing
  let prefix = 0
  while (prefix < expected.length && prefix < sanitized.length && expected[prefix] === sanitized[prefix]) {
    prefix++
  }

  let suffix = 0
  while (
    suffix < expected.length - prefix &&
    suffix < sanitized.length - prefix &&
    expected[expected.length - 1 - suffix] === sanitized[sanitized.length - 1 - suffix]
  ) {
    suffix++
  }

  return {
    before: expected.slice(0, prefix),
    after: expected.slice(expected.length - suffix),
  }
}

function findHoversForToken(token: ThemedToken, hovers: Hover[]): Hover[] | undefined {
  const start = token.offset
  const end = start + token.content.length
  const overlapping = hovers
    .filter(h => end > h.range.start && start < h.range.end)
    .sort((a, b) => a.range.start - b.range.start || a.range.end - b.range.end)
  return overlapping.length > 0 ? overlapping : undefined
}

function buildHoverSegments(token: ThemedToken, hovers: Hover[], notation?: CST.Notation): Array<{ hover: Hover; start: number; end: number, notation?: CST.Notation }> {
  const length = token.content.length

  return hovers
    .map(hover => {
      const start = Math.max(0, hover.range.start - token.offset)
      const end = Math.min(length, hover.range.end - token.offset)
      if (start >= end) return undefined
      if (notation && notation.kind === 'ExtractNotation' && notation.pointTo >= hover.columns[0] && notation.pointTo <= hover.columns[1]) {
        return { hover, start, end, notation}
      }
      return { hover, start, end }
    })
    .filter((segment) => Boolean(segment))
    .sort((a, b) => a.start - b.start || a.end - b.end)
}

function mergeClass(existing: unknown, next: string): string | string[] {
  if (!existing) return next
  if (Array.isArray(existing)) return [...existing, next]
  if (typeof existing === 'string') return `${existing} ${next}`
  return next
}
