import type { JsonValue } from '../json/parse'
import { jsonPathToPointer, setAtPath, deleteAtPath } from '../json/paths'
import type { LeafDiff } from './compute'

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/**
 * Build a live merge preview from a baseline document and selected diff rows.
 * - Unchecked rows keep the baseline value at that path.
 * - Checked rows apply the chosen side (left or right) for that path.
 */
export function computeMergePreview(
  baseline: JsonValue,
  diffs: LeafDiff[],
  selected: Set<string>,
  rowSide: Map<string, 'left' | 'right'>
): JsonValue {
  let result = cloneJson(baseline)

  for (const d of diffs) {
    const pointer = jsonPathToPointer(d.path)
    const side = rowSide.get(d.id) ?? 'left'

    if (!selected.has(d.id)) {
      // Only-in-right: unchecked means exclude from merge
      if (d.kind === 'add') {
        result = deleteAtPath(result, pointer)
      }
      continue
    }

    if (d.kind === 'replace') {
      const val = side === 'left' ? d.left : d.right
      if (val !== undefined) result = setAtPath(result, pointer, val)
    } else if (d.kind === 'add' && d.right !== undefined) {
      result = setAtPath(result, pointer, d.right)
    } else if (d.kind === 'remove' && d.left !== undefined) {
      result = setAtPath(result, pointer, d.left)
    }
  }

  return result
}
