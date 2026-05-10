const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
export const MAX_ARTICLES = 300

export interface RawArticle {
  title: string
  link: string
  snippet: string
  date?: string
  source?: string
}

const JSON_SCHEMA_SUFFIX = `

---

CRITICAL OUTPUT REQUIREMENT

Do NOT return the document format described above. Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:

{
  "saudiRegional": {
    "general": [],
    "literature": [],
    "fashion": [],
    "film": [],
    "heritage": [],
    "architecture": [],
    "visualArts": [],
    "museums": [],
    "theater": [],
    "libraries": [],
    "music": [],
    "culinary": []
  },
  "negativeArticles": [],
  "global": {
    "general": [],
    "literature": [],
    "fashion": [],
    "film": [],
    "heritage": [],
    "architecture": [],
    "visualArts": [],
    "museums": [],
    "theater": [],
    "libraries": [],
    "music": [],
    "culinary": []
  },
  "risksAndOpportunities": {
    "risks": [],
    "opportunities": []
  }
}

Each article object must have:
- "Outlet": string
- "Title": string — MUST be in English (translate if not)
- "Snippet": string (one editorial paragraph — what happened, why it matters, cultural/strategic significance) — MUST be in English (translate if not)
- "Link": string
- "Date": string
- "sentiment": "positive" | "negative" | "neutral"
- "isTier1": boolean

Each risk/opportunity object must have:
- "title": string (short label) — MUST be in English
- "description": string (insight paragraph) — MUST be in English
- "source": string (outlet names, comma-separated)
- "link": string (URL of the most relevant source article — use the article's link field)
- "consideration": string (recommendation) — MUST be in English

Omit empty subsection arrays. ALL text in every field must be in English — translate any non-English content before writing it to the output.`

export function isRecent(article: RawArticle): boolean {
  if (!article.date) return true
  const d = article.date.toLowerCase().trim()
  if (/just now|minutes? ago|hours? ago|an hour ago|a minute ago/i.test(d)) return true
  const dayMatch = d.match(/(\d+)\s+days?\s+ago/i)
  if (dayMatch) return parseInt(dayMatch[1]) <= 1
  if (/yesterday|1\s+day\s+ago/i.test(d)) return true
  try {
    const parsed = new Date(article.date)
    if (!isNaN(parsed.getTime())) {
      return (Date.now() - parsed.getTime()) <= 48 * 60 * 60 * 1000
    }
  } catch { /* ignore */ }
  return true
}

function extractJSON(text: string): unknown {
  try { return JSON.parse(text) } catch { /* continue */ }

  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) } catch { /* continue */ }
  }

  const arrayStart = text.indexOf('[')
  const objStart = text.indexOf('{')
  const start = arrayStart !== -1 && (objStart === -1 || arrayStart < objStart)
    ? arrayStart : objStart

  if (start !== -1) {
    const arrayEnd = text.lastIndexOf(']')
    const objEnd = text.lastIndexOf('}')
    const end = start === arrayStart ? arrayEnd : objEnd
    if (end > start) {
      try { return JSON.parse(text.slice(start, end + 1)) } catch { /* continue */ }
    }
  }

  throw new Error('No valid JSON found in OpenAI response')
}

export async function processArticles(
  articles: RawArticle[],
  digestPrompt: string
): Promise<Record<string, unknown>> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')

  const filtered = articles.filter(isRecent).slice(0, MAX_ARTICLES)
  if (filtered.length === 0) throw new Error('No recent articles to process')

  const systemPrompt = digestPrompt + JSON_SCHEMA_SUFFIX
  const userContent = [
    `Current date: ${new Date().toISOString().split('T')[0]}`,
    `Articles to process (${filtered.length} total):`,
    JSON.stringify(filtered),
  ].join('\n\n')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`OpenAI API error ${response.status}: ${details}`)
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')

  return {
    ...(extractJSON(content) as Record<string, unknown>),
    generatedAt: new Date().toISOString(),
  }
}
