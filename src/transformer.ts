import { hastToHtml, type ShikiTransformer, type ThemedToken } from 'shiki'
import { collect } from './context-builder/collect'
import { lex } from './context-builder/lexer'
import { resolve, type Hover } from './context-builder/resolve'
import { Element, ElementContent } from 'hast'

interface CanaryMeta {
  canary?: { hovers: Hover[] }
}

export interface CanaryTransformerOptions {
  /**
   * If true, the transformer will only run on code blocks
   * that include the `canary` directive in the first line of metadata.
   * If false, it will run on all Dart code blocks.
   * @default false
   */
  explicitTrigger?: boolean,
}

const isDartLang = (lang: string | undefined) => (lang ?? '').toLowerCase() === 'dart'

const getTriggerDirective = (meta: string): boolean => {
  if (meta.length === 0) return false
  const lines = meta.split(' ')
  if (lines.length === 0) return false
  return lines[0].trim() === 'canary'
}

export function canaryTransformer(options?: CanaryTransformerOptions): ShikiTransformer {
  const explicitTrigger = options?.explicitTrigger ?? false
  let isDart = false
  return {
    name: 'canary',
    preprocess(code, options) {
      const trigger = getTriggerDirective(options?.meta?.__raw || '')
      if (!isDartLang(String((options as any).lang))) return
      isDart = true
      if (explicitTrigger && !trigger) return
      // Analyse on original code (with directives intact)
      const tokens = lex(code)
      const { fileScope } = collect(tokens)
      const hovers = resolve(tokens, fileScope)
        ; (this.meta as CanaryMeta).canary = { hovers }

      return code
    },
    span(hast, _line, _col, _lineElement, token) {
      const meta = (this.meta as CanaryMeta).canary
      if (!meta || !meta.hovers?.length) return

      const hovers = findHoversForToken(token, meta.hovers)
      if (!hovers) return

      const sanitized = token.content.replace(/\s+/g, '')

      const currentChildren = [...(hast.children || [])]
      hast.children = []
      const textNode = (currentChildren[0] as any)?.value
      if (!textNode || typeof textNode !== 'string') return
      const splittedParts = textNode.split(/\s/g)
      let hover = hovers[0];
      for (const part of splittedParts) {
        let normalized = normalizeSpan(part, hover)
        if (!normalized) {
          console.log('could not normalize', part, hover)
          if (hovers.length > 1) {
            console.log('trying another hover')
            const otherHover = hovers[1];
            normalized = normalizeSpan(part, otherHover)
            console.log('trying another hover', part, otherHover)
            if (normalized) {
              hover = otherHover
            } else {
              const index = splittedParts.indexOf(part)
              hast.children.push({ type: 'text', value: index === splittedParts.length - 1 ? ' ' + part : part + ' ' })
              continue
            }
          } else {
            const index = splittedParts.indexOf(part)
            hast.children.push({ type: 'text', value: index === splittedParts.length - 1 ? ' ' + part : part + ' ' })
            continue
          }
        }
        const { adjustedText, pushBefore, pushAfter } = normalized
        console.log('normalized', `part:${part}`, 'to', adjustedText, 'for hover', hover)
        const indexOfPart = splittedParts.indexOf(part)
        if (indexOfPart === splittedParts.length - 1 && splittedParts[indexOfPart - 1] !== '') {
          hast.children.push({ type: 'text', value: ' ' })
        }
        if (pushBefore.length > 0) {
          hast.children.push({ type: 'text', value: pushBefore })
        }
        const innerSpan: any = {
          type: 'element',
          tagName: 'span',
          properties: {},
          children: [{ type: 'text', value: adjustedText }],
        }
        const typeCode: Element = {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: this.codeToHast(
            hover.markdown,
            {
              ...this.options,
              meta: {},
              transformers: [],
              lang: 'dart',
              structure: hover.markdown.trim().includes('\n') ? 'classic' : 'inline',
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
            'data-dart-hover-docs': encodeURIComponent(hover.documentation || ''),
            'data-dart-hover-range': `${hover.range.start}-${hover.range.end}`,
          },
          children: [innerSpan],
        }
        hast.children.push(wrapperDiv)
        if (pushAfter.length > 0) {
          hast.children.push({ type: 'text', value: pushAfter })
        }
      }
    },
    pre(hast) {
      if (!isDart) return
      this.addClassToHast(hast, 'canary')
      isDart = false
    }
  }
}

function normalizeSpan(sanitized: string, hover: Hover): { adjustedText: string; pushBefore: string; pushAfter: string } | undefined {
  let adjustedText = sanitized
  let pushBefore = ''
  let pushAfter = ''
  const expected = hover.expectedValue || sanitized
  if (expected !== sanitized) {
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
  const hover = hovers.find(h => end > h.range.start && start < h.range.end);
  if (!hover) {
    return hover
  }
  const maybeAnotherToken = hovers.find(h => h !== hover && end > h.range.start && start < h.range.end);
  if (maybeAnotherToken) {
    return [hover, maybeAnotherToken]
  }
  return [hover];
}

function mergeClass(existing: unknown, next: string): string | string[] {
  if (!existing) return next
  if (Array.isArray(existing)) return [...existing, next]
  if (typeof existing === 'string') return `${existing} ${next}`
  return next
}
