import { Hover } from "./context-builder/resolve"

export interface ShikiToken {
  content: string
  type?: string
}

export interface OffsetMap {
  start: number
  end: number
  tokenIndex: number
  charIndexInToken: number
}

export function buildOffsetMap(shikiLines: ShikiToken[][]) {
  const map: OffsetMap[] = []
  let offset = 0

  for (let lineIdx = 0; lineIdx < shikiLines.length; lineIdx++) {
    const line = shikiLines[lineIdx]
    for (let tokenIdx = 0; tokenIdx < line.length; tokenIdx++) {
      const tok = line[tokenIdx]
      for (let i = 0; i < tok.content.length; i++) {
        map.push({
          start: offset,
          end: offset + 1,
          tokenIndex: tokenIdx,
          charIndexInToken: i,
        })
        offset++
      }
    }
    offset++ // newline
  }

  return map
}

export function mapHoversToShiki(
  hovers: Hover[],
  offsetMap: OffsetMap[]
) {
  return hovers.map(h => {
    const startEntry = offsetMap[h.range.start]
    const endEntry = offsetMap[h.range.end - 1]

    if (!startEntry || !endEntry) return null

    return {
      startTokenIndex: startEntry.tokenIndex,
      startCharIndex: startEntry.charIndexInToken,
      endTokenIndex: endEntry.tokenIndex,
      endCharIndex: endEntry.charIndexInToken + 1,
      markdown: h.markdown,
    }
  }).filter(Boolean)
}