const SIZE_LIMIT_BYTES = 20 * 1024 * 1024 // 20 MB hard limit for URL fetches

export interface FetchUrlResult {
  url: string
  content: string
  sizeMB: number
  oversized: boolean
  contentType: string
}

export async function fetchJsonUrl(url: string): Promise<FetchUrlResult> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Only http/https is allowed.`)
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/json, text/plain, */*' }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const buffer = await response.arrayBuffer()

  if (buffer.byteLength > SIZE_LIMIT_BYTES) {
    throw new Error(
      `Response too large (${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB). Limit is 20 MB.`
    )
  }

  const content = new TextDecoder('utf-8').decode(buffer)
  const sizeMB = buffer.byteLength / (1024 * 1024)
  const oversized = sizeMB > 5

  return { url, content, sizeMB, oversized, contentType }
}
