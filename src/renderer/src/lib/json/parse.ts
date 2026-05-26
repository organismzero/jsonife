import * as jsoncParser from 'jsonc-parser'

export type JsonFormat = 'json' | 'jsonc' | 'jsonl'
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface ParseResult {
  value: JsonValue
  errors: ParseError[]
}

export interface ParseError {
  message: string
  offset: number
  length: number
}

export function detectFormat(filePath: string, content: string): JsonFormat {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'jsonc') return 'jsonc'
  if (ext === 'jsonl') return 'jsonl'
  if (ext === 'json') return 'json'
  // content sniff: JSONL has multiple top-level values
  return sniffJsonl(content) ? 'jsonl' : 'json'
}

function sniffJsonl(content: string): boolean {
  const lines = content.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return false
  let valid = 0
  for (const line of lines.slice(0, 5)) {
    const errors: jsoncParser.ParseError[] = []
    jsoncParser.parse(line, errors)
    if (errors.length === 0) valid++
  }
  return valid >= 2
}

export function parseContent(content: string, format: JsonFormat): ParseResult {
  if (format === 'jsonl') return parseJsonl(content)
  const errors: jsoncParser.ParseError[] = []
  const value = jsoncParser.parse(content, errors) as JsonValue
  return {
    value,
    errors: errors.map((e) => ({
      message: jsoncParser.printParseErrorCode(e.error),
      offset: e.offset,
      length: e.length
    }))
  }
}

function parseJsonl(content: string): ParseResult {
  const lines = content.split('\n')
  const values: JsonValue[] = []
  const errors: ParseError[] = []
  let offset = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed) {
      const lineErrors: jsoncParser.ParseError[] = []
      const val = jsoncParser.parse(trimmed, lineErrors) as JsonValue
      if (lineErrors.length > 0) {
        errors.push({
          message: `Line parse error: ${jsoncParser.printParseErrorCode(lineErrors[0].error)}`,
          offset,
          length: line.length
        })
      } else {
        values.push(val)
      }
    }
    offset += line.length + 1
  }
  return { value: values, errors }
}

export function stringifyContent(value: JsonValue, format: JsonFormat, indent = 2): string {
  if (format === 'jsonl') {
    const arr = Array.isArray(value) ? value : [value]
    return arr.map((v) => JSON.stringify(v)).join('\n') + '\n'
  }
  return JSON.stringify(value, null, indent)
}

export function formatContent(content: string, format: JsonFormat): string {
  const { value, errors } = parseContent(content, format)
  if (errors.length > 0) return content
  return stringifyContent(value, format)
}
