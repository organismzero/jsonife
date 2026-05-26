import type { JsonValue } from '../json/parse'
import type { LeafDiff } from './compute'
import { setAtPath, pointerToParts, partsToPointer } from '../json/paths'

export interface ApplyResult {
  value: JsonValue
  applied: string[]
  skipped: Array<{ path: string; reason: string }>
}

/**
 * Apply selected leaf diffs from source subtree to target document.
 *
 * @param targetDoc  Full target document
 * @param diffs      Selected LeafDiff items
 * @param sourceRoot JSON Pointer for the root in the source document these diffs came from
 * @param targetRoot JSON Pointer for the root in the target document to write into
 */
export function applyLeaves(
  targetDoc: JsonValue,
  diffs: LeafDiff[],
  sourceRoot: string,
  targetRoot: string
): ApplyResult {
  let result = targetDoc
  const applied: string[] = []
  const skipped: Array<{ path: string; reason: string }> = []

  const sourceRootParts = pointerToParts(sourceRoot)

  for (const d of diffs) {
    const diffParts = pointerToParts(d.path)

    // Strip source root prefix to get relative path
    if (sourceRootParts.length > 0) {
      const prefix = sourceRootParts.join('/')
      const pathStr = diffParts.join('/')
      if (!pathStr.startsWith(prefix)) {
        skipped.push({ path: d.path, reason: 'Path is outside source root' })
        continue
      }
      const relParts = diffParts.slice(sourceRootParts.length)
      const targetRootParts = pointerToParts(targetRoot)
      const targetParts = [...targetRootParts, ...relParts]
      const targetPointer = partsToPointer(targetParts)
      try {
        const newValue = d.kind === 'remove' ? undefined : d.right
        if (newValue === undefined) {
          // Deletion — not yet supported for leaf apply; skip
          skipped.push({ path: d.path, reason: 'Deletion not applied (would require key removal)' })
          continue
        }
        result = setAtPath(result, targetPointer, newValue as JsonValue)
        applied.push(d.path)
      } catch (err) {
        skipped.push({ path: d.path, reason: String(err) })
      }
    } else {
      // No sourceRoot specified — apply at same path under targetRoot
      const targetRootParts = pointerToParts(targetRoot)
      const targetParts = [...targetRootParts, ...diffParts]
      const targetPointer = partsToPointer(targetParts)
      try {
        const newValue = d.kind === 'remove' ? undefined : d.right
        if (newValue === undefined) {
          skipped.push({ path: d.path, reason: 'Deletion not applied' })
          continue
        }
        result = setAtPath(result, targetPointer, newValue as JsonValue)
        applied.push(d.path)
      } catch (err) {
        skipped.push({ path: d.path, reason: String(err) })
      }
    }
  }

  return { value: result, applied, skipped }
}
