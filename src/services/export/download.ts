/** Triggers a browser download for an in-memory blob, revoking the URL afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking synchronously cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * A name the user or the CV gives a file, made safe to download: path characters, control characters
 * and bidi overrides (U+202E could make "…exe.pdf" read as something else) are dropped, spaces
 * collapsed (spec 034). Empty when nothing is left.
 */
export function safeFileName(value: string): string {
  return value
    .replace(/[/\\:*?"<>|\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
