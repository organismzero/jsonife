import { diff as jsonDiff, atomizeChangeset, IAtomicChange, Operation } from 'json-diff-ts'
import type { JsonValue } from '../json/parse'

export type DiffKind = 'add' | 'remove' | 'replace'

export interface LeafDiff {
  id: string
  path: string
  pathLabel: string
  left: JsonValue | undefined
  right: JsonValue | undefined
  kind: DiffKind
}

function opToKind(op: Operation): DiffKind {
  if (op === Operation.ADD) return 'add'
  if (op === Operation.REMOVE) return 'remove'
  return 'replace'
}

function pathToLabel(path: string): string {
  // json-diff-ts uses JSONPath like "$.foo.bar[0].baz"
  return path.replace(/^\$\.?/, '').replace(/\[(\d+)\]/g, ' › $1').replace(/\./g, ' › ') || '(root)'
}

export function computeDiff(
  left: JsonValue,
  right: JsonValue,
  arrayKeyField = 'id'
): LeafDiff[] {
  let atomized: IAtomicChange[]
  try {
    const raw = jsonDiff(left as object, right as object, {
      embeddedObjKeys: { '*': arrayKeyField }
    })
    atomized = atomizeChangeset(raw)
  } catch {
    return []
  }

  return atomized.map((c, i) => {
    const path = c.path ?? '$'
    return {
      id: `diff-${i}-${path}`,
      path,
      pathLabel: pathToLabel(path),
      left: c.oldValue as JsonValue | undefined,
      right: c.value as JsonValue | undefined,
      kind: opToKind(c.type)
    }
  })
}
