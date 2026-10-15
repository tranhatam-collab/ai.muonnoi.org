// Keep the legacy endpoints' empty-object fallback, including for JSON primitives.
// New Studio endpoints use their own bounded and strict request parser.
export async function requestObject(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json().catch(() => null)
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}
