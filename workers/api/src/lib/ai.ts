import type { Env } from "../env"

export interface ModerationResult {
  spam: number
  misinformation: number
  needs_source: number
  label: string | null
}

export async function runAiModeration(
  env: Env,
  postId: number,
  text: string
): Promise<void> {
  if (!env.AI_API_URL || !env.AI_API_KEY) return

  let result: ModerationResult = { spam: 0, misinformation: 0, needs_source: 0, label: null }

  try {
    const res = await fetch(`${env.AI_API_URL}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000)
    })
    if (res.ok) {
      result = await res.json() as ModerationResult
    }
  } catch {
    return
  }

  const maxScore = Math.max(result.spam, result.misinformation, result.needs_source)

  if (maxScore > 0.5) {
    const reason = result.spam > 0.5 ? "spam"
      : result.misinformation > 0.5 ? "misinformation"
      : "needs_source"

    await env.iai_flow_db
      .prepare(
        "INSERT INTO ai_moderation_queue (post_id, reason, ai_score, status, created_at) VALUES (?1, ?2, ?3, 'pending', ?4)"
      )
      .bind(postId, reason, maxScore, Date.now())
      .run()
  }

  if (result.label) {
    await env.iai_flow_db
      .prepare("INSERT OR IGNORE INTO post_labels (post_id, label, added_by) VALUES (?1, ?2, 'ai')")
      .bind(postId, result.label)
      .run()
  }
}

export async function callAiSummarize(
  env: Env,
  text: string
): Promise<string | null> {
  if (!env.AI_API_URL || !env.AI_API_KEY) return null

  try {
    const res = await fetch(`${env.AI_API_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000)
    })
    if (res.ok) {
      const data = await res.json() as { summary: string }
      return data.summary ?? null
    }
  } catch {
    return null
  }
  return null
}
