import type { ShikiTransformer, ThemedToken } from 'shiki'
import { inspectDart, type InspectResult, type CustomTypesConfig } from './inspector'

interface CanaryMeta {
  canary?: InspectResult
  offsetMap?: Map<number, number> // original offset → stripped offset
}

export interface CanaryTransformerOptions {
  /**
   * Custom type definitions. Provide an inline config object
   * with the types you want the inspector to recognize.
   */
  customTypes?: CustomTypesConfig,

  explicitTrigger?: boolean,
}

const isDartLang = (lang: string | undefined) => (lang ?? '').toLowerCase() === 'dart'

const getTriggerDirective = (meta: string): bool => {
  if (meta.length === 0) return false
  const lines = meta.split(' ')
  if (lines.length === 0) return false
  return lines[0].trim() === 'canary'
}

export function canaryTransformer(options?: CanaryTransformerOptions): ShikiTransformer {
  const customTypes = options?.customTypes
  const explicitTrigger = options?.explicitTrigger ?? false
  return {
    name: 'canary',
    preprocess(code, options) {
      const trigger = getTriggerDirective(code)
      if (!isDartLang(String((options as any).lang))) return
      if (explicitTrigger && !trigger) return
      // Analyse on original code (with directives)
      const analysis = inspectDart(code, { customTypes })

      // Build stripped code and offset mapping
      const lines = code.split('\n')
      let stripped = ''
      let origOffset = 0
      let strippedOffset = 0
      const offsetMap = new Map<number, number>()

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineLen = line.length + (i < lines.length - 1 ? 1 : 0) // +1 for \n except last

        if (line.trim().startsWith('// inspect:')) {
          // Skip this line; adjust future offsets
        } else {
          // Record mapping for each character in this line
          for (let c = 0; c < lineLen; c++) {
            offsetMap.set(origOffset + c, strippedOffset + c)
          }
          stripped += line + (i < lines.length - 1 ? '\n' : '')
          strippedOffset += lineLen
        }
        origOffset += lineLen
      }

      // Remap hover ranges
      for (const hover of analysis.hovers) {
        hover.range.start = offsetMap.get(hover.range.start) ?? hover.range.start
        hover.range.end = offsetMap.get(hover.range.end - 1) !== undefined
          ? (offsetMap.get(hover.range.end - 1)! + 1)
          : hover.range.end
      }

      ;(this.meta as CanaryMeta).canary = analysis
      ;(this.meta as CanaryMeta).offsetMap = offsetMap

      return stripped
    },
    span(hast, _line, _col, _lineElement, token) {
      const meta = (this.meta as CanaryMeta).canary
      if (!meta || !meta.hovers.length) return
      
      const hover = findHoverForToken(token, meta.hovers)
      if (!hover) return

      const sanitized = token.content.replace(/\s+/g, '')

      const currentChildren = [...(hast.children || [])]
      hast.children = []
      const textNode = (currentChildren[0] as any)?.value
      if (!textNode || typeof textNode !== 'string') return
      const splittedParts = textNode.split(/\s+/g)
      for (const part of splittedParts) {
        if (part === sanitized) {
          const innerSpan: any = {
            type: 'element',
            tagName: 'span',
            properties: {},
            children: [{ type: 'text', value: sanitized }],
          }

          const wrapperDiv: any = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: mergeClass(undefined, 'dart-inspectable'),
              'data-dart-hover': encodeURIComponent(hover.content),
              'data-dart-hover-range': `${hover.range.start}-${hover.range.end}`,
              style: 'display: inline-block; border-bottom: 1px solid var(--vp-c-brand-1);',
            },
            children: [innerSpan],
          }
          hast.children.push(wrapperDiv)
          continue;
        }
        hast.children.push({ type: 'text', value: part + ' '})
      }
    },
  }
}

function findHoverForToken(token: ThemedToken, hovers: InspectResult['hovers']) {
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
