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
      ;(this.meta as CanaryMeta).canary = { hovers }

      return code
    },
    span(hast, _line, _col, _lineElement, token) {
      const meta = (this.meta as CanaryMeta).canary
      if (!meta || !meta.hovers?.length) return
      
      const hover = findHoverForToken(token, meta.hovers)
      if (!hover) return

      const sanitized = token.content.replace(/\s+/g, '')

      const currentChildren = [...(hast.children || [])]
      hast.children = []
      const textNode = (currentChildren[0] as any)?.value
      if (!textNode || typeof textNode !== 'string') return
      const splittedParts = textNode.split(/\s/g)
      for (const part of splittedParts) {
        if (part === sanitized) {
          const innerSpan: any = {
            type: 'element',
            tagName: 'span',
            properties: {},
            children: [{ type: 'text', value: sanitized }],
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
          continue;
        }
        hast.children.push({ type: 'text', value: part + ' '})
      }
    },
    pre(hast) {
      if (!isDart) return
      this.addClassToHast(hast, 'canary')
      isDart = false
    }
  }
}

function findHoverForToken(token: ThemedToken, hovers: Hover[]) {
  const start = token.offset
  const end = start + token.content.length
  return hovers.find(h => end > h.range.start && start < h.range.end)
}

function mergeClass(existing: unknown, next: string): string | string[] {
  if (!existing) return next
  if (Array.isArray(existing)) return [...existing, next]
  if (typeof existing === 'string') return `${existing} ${next}`
  return next
}
