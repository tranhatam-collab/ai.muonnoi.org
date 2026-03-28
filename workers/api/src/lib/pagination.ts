export interface Cursor {
  ts: number
  id: number
}

export function encodeCursor(ts: number, id: number): string {
  return btoa(JSON.stringify({ ts, id }))
}

export function decodeCursor(cursor: string): Cursor | null {
  try {
    const parsed = JSON.parse(atob(cursor))
    if (typeof parsed.ts === "number" && typeof parsed.id === "number") {
      return parsed as Cursor
    }
    return null
  } catch {
    return null
  }
}

export function getCursorFromUrl(url: URL): Cursor | null {
  const raw = url.searchParams.get("cursor")
  if (!raw) return null
  return decodeCursor(raw)
}

export const PAGE_SIZE = 20
