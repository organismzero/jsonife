import type { JsonValue } from './parse'

/** Get value at a JSON Pointer path (e.g. "/foo/0/bar") */
export function getAtPath(root: JsonValue, pointer: string): JsonValue | undefined {
  if (pointer === '' || pointer === '/') return root
  const parts = pointerToParts(pointer)
  let current: JsonValue = root
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    if (Array.isArray(current)) {
      const idx = Number(part)
      if (isNaN(idx)) return undefined
      current = current[idx]
    } else {
      current = (current as Record<string, JsonValue>)[part]
    }
    if (current === undefined) return undefined
  }
  return current
}

/** Set value at a JSON Pointer path, creating missing objects along the way */
export function setAtPath(root: JsonValue, pointer: string, value: JsonValue): JsonValue {
  if (pointer === '' || pointer === '/') return value
  const parts = pointerToParts(pointer)
  return setDeep(root, parts, value)
}

function setDeep(current: JsonValue, parts: string[], value: JsonValue): JsonValue {
  if (parts.length === 0) return value
  const [head, ...rest] = parts

  if (Array.isArray(current)) {
    const idx = Number(head)
    if (isNaN(idx)) throw new Error(`Expected numeric index, got "${head}"`)
    const arr = [...current]
    arr[idx] = rest.length === 0 ? value : setDeep(arr[idx] ?? null, rest, value)
    return arr
  }

  const obj = (typeof current === 'object' && current !== null ? current : {}) as Record<
    string,
    JsonValue
  >
  return {
    ...obj,
    [head]: rest.length === 0 ? value : setDeep(obj[head] ?? {}, rest, value)
  }
}

export function pointerToParts(pointer: string): string[] {
  if (!pointer.startsWith('/')) return pointer ? [pointer] : []
  return pointer
    .slice(1)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))
}

export function partsToPointer(parts: string[]): string {
  return (
    '/' +
    parts
      .map((p) => p.replace(/~/g, '~0').replace(/\//g, '~1'))
      .join('/')
  )
}

export function isLeaf(value: JsonValue): boolean {
  return value === null || typeof value !== 'object' || (!Array.isArray(value) && Object.keys(value).length === 0)
}

/** Enumerate all leaf JSON Pointers in a value */
export function leafPointers(value: JsonValue, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix || '/']
  if (Array.isArray(value)) {
    if (value.length === 0) return [prefix || '/']
    return value.flatMap((v, i) => leafPointers(v, `${prefix}/${i}`))
  }
  const keys = Object.keys(value)
  if (keys.length === 0) return [prefix || '/']
  return keys.flatMap((k) =>
    leafPointers((value as Record<string, JsonValue>)[k], `${prefix}/${k.replace(/~/g, '~0').replace(/\//g, '~1')}`)
  )
}
