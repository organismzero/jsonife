import { create } from 'zustand'
import { detectFormat, parseContent, stringifyContent } from '../lib/json/parse'
import type { JsonFormat, JsonValue, ParseError } from '../lib/json/parse'

export interface DocumentSource {
  type: 'file' | 'url' | 'untitled'
  path?: string
  url?: string
}

export interface Document {
  id: string
  name: string
  content: string
  format: JsonFormat
  value: JsonValue | null
  errors: ParseError[]
  isDirty: boolean
  source: DocumentSource
  undoStack: string[]
}

interface DocumentStore {
  documents: Document[]
  activeId: string | null
  addDocument: (doc: Omit<Document, 'id' | 'isDirty' | 'undoStack'>) => string
  removeDocument: (id: string) => void
  setActiveId: (id: string | null) => void
  updateContent: (id: string, content: string) => void
  updateValue: (id: string, value: JsonValue) => void
  markSaved: (id: string, filePath: string) => void
  pushUndo: (id: string) => void
  popUndo: (id: string) => void
  openFile: (filePath: string, content: string) => string
  openUrl: (url: string, content: string) => string
}

let nextId = 1
function genId(): string {
  return `doc-${nextId++}`
}

function docName(source: DocumentSource, format: JsonFormat): string {
  if (source.type === 'file' && source.path) {
    return source.path.split(/[\\/]/).pop() ?? source.path
  }
  if (source.type === 'url' && source.url) {
    try {
      return new URL(source.url).hostname
    } catch {
      return source.url.slice(0, 30)
    }
  }
  return `untitled.${format}`
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  activeId: null,

  addDocument(doc) {
    const id = genId()
    set((s) => ({
      documents: [...s.documents, { ...doc, id, isDirty: false, undoStack: [] }],
      activeId: id
    }))
    return id
  },

  removeDocument(id) {
    set((s) => {
      const docs = s.documents.filter((d) => d.id !== id)
      const activeId =
        s.activeId === id ? (docs[docs.length - 1]?.id ?? null) : s.activeId
      return { documents: docs, activeId }
    })
  },

  setActiveId(id) {
    set({ activeId: id })
  },

  updateContent(id, content) {
    set((s) => ({
      documents: s.documents.map((d) => {
        if (d.id !== id) return d
        const { value, errors } = parseContent(content, d.format)
        return { ...d, content, value, errors, isDirty: true }
      })
    }))
  },

  updateValue(id, value) {
    set((s) => ({
      documents: s.documents.map((d) => {
        if (d.id !== id) return d
        const content = stringifyContent(value, d.format)
        return { ...d, value, content, errors: [], isDirty: true }
      })
    }))
  },

  markSaved(id, filePath) {
    set((s) => ({
      documents: s.documents.map((d) => {
        if (d.id !== id) return d
        return {
          ...d,
          isDirty: false,
          source: { type: 'file', path: filePath },
          name: filePath.split(/[\\/]/).pop() ?? filePath
        }
      })
    }))
  },

  pushUndo(id) {
    set((s) => ({
      documents: s.documents.map((d) => {
        if (d.id !== id) return d
        return { ...d, undoStack: [...d.undoStack.slice(-20), d.content] }
      })
    }))
  },

  popUndo(id) {
    set((s) => ({
      documents: s.documents.map((d) => {
        if (d.id !== id) return d
        if (d.undoStack.length === 0) return d
        const stack = [...d.undoStack]
        const prev = stack.pop()!
        const { value, errors } = parseContent(prev, d.format)
        return { ...d, content: prev, value, errors, isDirty: true, undoStack: stack }
      })
    }))
  },

  openFile(filePath, content) {
    const format = detectFormat(filePath, content)
    const { value, errors } = parseContent(content, format)
    const source: DocumentSource = { type: 'file', path: filePath }
    return get().addDocument({
      name: docName(source, format),
      content,
      format,
      value,
      errors,
      source
    })
  },

  openUrl(url, content) {
    const format = detectFormat(url, content)
    const { value, errors } = parseContent(content, format)
    const source: DocumentSource = { type: 'url', url }
    return get().addDocument({
      name: docName(source, format),
      content,
      format,
      value,
      errors,
      source
    })
  }
}))
