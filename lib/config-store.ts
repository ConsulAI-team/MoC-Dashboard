import type {
  ExcludedItem,
  SearchCategory,
  SearchConfig,
  SearchPromptConfig,
} from "./types"

const CONFIG_STORAGE_KEY = "moc-digest-config"
const DATA_STORAGE_KEY = "moc-digest-data"

const DEFAULT_DIGEST_PROMPT = `Categorise and structure news articles into a Ministry of Culture (MOC) Daily Cultural Digest format.

The input is a JSON array from SERPAPI where each article object includes: title, snippet, source/outlet, link.

LANGUAGE REQUIREMENT: ALL output text — every Title, Snippet, description, consideration — must be written in English. If any source article is in Arabic, French, or any other language, translate it fully into English before writing the output. Do not leave any non-English text in the output.

---

ARABIC & LOCAL OUTLET EXCLUSION — MANDATORY

Do NOT include any article that:
- Is originally written in Arabic
- Is sourced from an Arabic-language outlet (e.g. Sabq, Okaz, Al-Riyadh, Ajel, Aleqtisadiah, Asharq Al-Awsat Arabic edition, Al-Watan, Al-Madina, Arab News Arabic content, local Saudi Arabic press, any Gulf Arabic-language newspaper or website)
- Is a direct translation of an Arabic-language source

Only include articles from English-language international, regional, or global news sources. If you are unsure whether a source is Arabic-language, exclude it. This rule has no exceptions.

---

Client

The client is the Ministry of Culture (MOC), Saudi Arabia.

The digest should monitor and organize international and regional cultural coverage relevant to:
- Saudi Arabia and Vision 2030 cultural transformation
- Arts and heritage, museums and exhibitions
- Film, fashion, architecture, music, literature, libraries, theater, culinary arts
- Global cultural developments and reputation / strategic cultural positioning

---

Main Sections

Structure the digest into these exact sections:
1. Saudi Arabia / Regional
2. Negative Articles
3. Global
4. Risks and Opportunities

Maximum: 12 articles per main section.

---

Subsections

For both "Saudi Arabia / Regional" and "Global", use these exact subsections:
- General
- Literature, Publishing and Translation
- Fashion
- Film
- Heritage
- Architecture and Design
- Visual Arts
- Museums
- Theater and Performing Arts
- Libraries
- Music
- Culinary Arts

Maximum: 12 articles per subsection. Only include subsections that have relevant articles.

---

Categorisation Logic

Saudi Arabia / Regional:
Articles about Saudi cultural initiatives, Vision 2030 cultural projects, Saudi museums, exhibitions, artists, heritage, tourism, cultural diplomacy, regional developments connected to Saudi Arabia, international collaborations involving Saudi institutions, cultural infrastructure, giga-projects, Saudi participation in biennales, festivals, and global cultural platforms.

Negative Articles:
Articles about criticism of Saudi Arabia, regional tensions, economic or fiscal concerns, Vision 2030 skepticism, reputational risks, cultural criticism, governance or geopolitical disputes, investment concerns impacting Saudi positioning.

Global:
International cultural stories not directly tied to Saudi Arabia but strategically relevant: global arts and culture, museums, heritage preservation, international exhibitions, architecture and design, music, fashion, literature, theater, film, cultural policy and soft power trends.

Risks and Opportunities:
Two analytical sections — Risks (reputational, geopolitical, cultural, or economic risks) and Opportunities (cultural diplomacy, heritage, tourism, or international positioning opportunities for Saudi Arabia). Each includes a short insight paragraph, source references, and a "Consideration" recommendation.

---

Editorial Rules

- Professional executive briefing tone
- Clear and concise summaries
- Avoid promotional language
- Focus on strategic cultural relevance
- No duplicate articles across sections
- English only — translate all non-English content
- Prioritize Tier 1 international and cultural outlets
- Prefer original reporting over aggregators
- Only include articles from the past 24 hours
- Arabic/local outlet exclusion: strictly enforced — see mandatory rule above`

const DEFAULT_SUMMARY_INSTRUCTIONS =
  "Write concise executive summaries for Ministry of Culture leadership. Focus on strategic implications, reputational risk, opportunities, and the cultural position of Saudi Arabia."

export const workflowCategories: SearchCategory[] = [
  {
    id: "national-general",
    name: "National General",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_GENERAL",
    outputPath: "nationalGeneral",
  },
  {
    id: "national-museums",
    name: "Museums",
    arabicName: "المتاحف",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_MUSEUMS",
    outputPath: "nationalSectors.Museums",
  },
  {
    id: "national-music",
    name: "Music",
    arabicName: "الموسيقى",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_MUSIC",
    outputPath: "nationalSectors.Music",
  },
  {
    id: "national-film",
    name: "Film",
    arabicName: "الأفلام",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_FILM",
    outputPath: "nationalSectors.Film",
  },
  {
    id: "national-fashion",
    name: "Fashion",
    arabicName: "الأزياء",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_FASHION",
    outputPath: "nationalSectors.Fashion",
  },
  {
    id: "national-heritage",
    name: "Heritage",
    arabicName: "التراث",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_HERITAGE",
    outputPath: "nationalSectors.Heritage",
  },
  {
    id: "national-visual-arts",
    name: "Visual Arts",
    arabicName: "الفنون البصرية",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_VISUAL_ARTS",
    outputPath: "nationalSectors.VisualArts",
  },
  {
    id: "national-architecture",
    name: "Architecture and Design",
    arabicName: "العمارة والتصميم",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_ARCHITECTURE",
    outputPath: "nationalSectors.Architecture",
  },
  {
    id: "national-culinary",
    name: "Culinary Arts",
    arabicName: "فنون الطهي",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_CULINARY",
    outputPath: "nationalSectors.Culinary",
  },
  {
    id: "national-literature",
    name: "Literature, Publishing and Translation",
    arabicName: "الأدب والنشر والترجمة",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_LITERATURE",
    outputPath: "nationalSectors.Literature",
  },
  {
    id: "national-theater",
    name: "Theater and Performing Arts",
    arabicName: "المسرح والفنون الأدائية",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_THEATER",
    outputPath: "nationalSectors.Theater",
  },
  {
    id: "national-libraries",
    name: "Libraries",
    arabicName: "المكتبات",
    group: "national",
    keywords: [],
    isActive: true,
    classificationKey: "NATIONAL_LIBRARIES",
    outputPath: "nationalSectors.Libraries",
  },
  {
    id: "international-europe",
    name: "Europe & Transcontinental",
    group: "international",
    keywords: [],
    isActive: true,
    classificationKey: "INTL_EUROPE",
    outputPath: "international.Europe & Transcontinental",
  },
  {
    id: "international-americas",
    name: "The Americas",
    group: "international",
    keywords: [],
    isActive: true,
    classificationKey: "INTL_AMERICAS",
    outputPath: "international.The Americas",
  },
  {
    id: "international-asia",
    name: "Asia & Others",
    group: "international",
    keywords: [],
    isActive: true,
    classificationKey: "INTL_ASIA",
    outputPath: "international.Asia & Others",
  },
]

export const defaultConfig: SearchConfig = {
  keywords: [],
  outlets: [],
  categories: workflowCategories,
  excludedTerms: [],
  excludedSources: [],
  executiveSummary: "",
  summaryInstructions: DEFAULT_SUMMARY_INSTRUCTIONS,
  writingStyle: DEFAULT_SUMMARY_INSTRUCTIONS,
  summaryTags: ["Strategic implications", "Risks", "Opportunities"],
  scheduleTime1: "08:00",
  sectorArticleLimit: 12,
  globalArticleLimit: 12,
  searchRegion: "sa",
  searchPages: [1, 2, 3],
  searchBatchSize: 10,
  searchDateFilter: "qdr:d",
  autocorrect: false,
  searchPrompts: {
    digest: DEFAULT_DIGEST_PROMPT,
  },
}

interface SerperSearchRequest {
  q: string
  gl: string
  autocorrect: boolean
  tbs: string
  page: number
}

interface SearchBatch {
  batchIndex: number
  batchSize: number
  totalBatches: number
  body: SerperSearchRequest[]
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>()

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function itemId(value: string, index: number): string {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"}-${index}`
}

function normalizeItems(value: unknown, prefix: string): ExcludedItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const trimmed = item.trim()
        return trimmed ? { id: `${prefix}-${itemId(trimmed, index)}`, value: trimmed } : null
      }

      if (item && typeof item === "object" && "value" in item) {
        const rawItem = item as Partial<ExcludedItem>
        const trimmed = String(rawItem.value || "").trim()
        if (!trimmed) return null

        return {
          id: rawItem.id || `${prefix}-${itemId(trimmed, index)}`,
          value: trimmed,
        }
      }

      return null
    })
    .filter((item): item is ExcludedItem => Boolean(item))
}

function normalizeCategoryName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function normalizeCategory(value: unknown, index: number): SearchCategory | null {
  if (!value || typeof value !== "object") return null

  const raw = value as Partial<SearchCategory>
  const name = String(raw.name || "").trim()
  if (!name) return null

  return {
    id: raw.id || `custom-${itemId(name, index)}`,
    name,
    arabicName: raw.arabicName,
    group: raw.group || "custom",
    keywords: uniqueStrings(Array.isArray(raw.keywords) ? raw.keywords : []),
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
    prompt: raw.prompt || "",
    classificationKey: raw.classificationKey,
    outputPath: raw.outputPath,
  }
}

function normalizeCategories(value: unknown): SearchCategory[] {
  const savedCategories = Array.isArray(value)
    ? value.map(normalizeCategory).filter((item): item is SearchCategory => Boolean(item))
    : []

  const usedSavedIndexes = new Set<number>()

  const categories = workflowCategories.map((base) => {
    const savedIndex = savedCategories.findIndex((saved, index) => {
      if (usedSavedIndexes.has(index)) return false
      if (saved.id === base.id) return true
      if (saved.classificationKey === base.classificationKey) return true
      return normalizeCategoryName(saved.name) === normalizeCategoryName(base.name)
    })

    const saved = savedIndex >= 0 ? savedCategories[savedIndex] : undefined
    if (savedIndex >= 0) usedSavedIndexes.add(savedIndex)

    return {
      ...base,
      ...saved,
      id: base.id,
      group: saved?.group || base.group,
      classificationKey: base.classificationKey,
      outputPath: base.outputPath,
      keywords: saved?.keywords || base.keywords,
      isActive: typeof saved?.isActive === "boolean" ? saved.isActive : base.isActive,
      prompt: saved?.prompt || base.prompt || "",
    }
  })

  const customCategories = savedCategories.filter((_, index) => !usedSavedIndexes.has(index))

  return [...categories, ...customCategories]
}

export function normalizeConfig(config: Partial<SearchConfig> | null | undefined): SearchConfig {
  const source = config || {}
  const categories = normalizeCategories(source.categories)
  const legacyCategoryKeywords = categories.flatMap((category) => category.keywords)
  const savedKeywords = Array.isArray(source.keywords) ? source.keywords : []
  const keywords = uniqueStrings([...savedKeywords, ...legacyCategoryKeywords])
  const summaryInstructions =
    source.summaryInstructions || source.writingStyle || defaultConfig.summaryInstructions
  const legacyPrompts = source.searchPrompts as Record<string, string> | undefined
  const searchPrompts: SearchPromptConfig = {
    digest:
      legacyPrompts?.digest ||
      legacyPrompts?.structureDigest ||
      DEFAULT_DIGEST_PROMPT,
  }

  return {
    ...defaultConfig,
    ...source,
    keywords,
    outlets: normalizeItems(source.outlets, "outlet"),
    categories,
    excludedTerms: normalizeItems(source.excludedTerms, "term"),
    excludedSources: normalizeItems(source.excludedSources, "source"),
    executiveSummary: source.executiveSummary || "",
    summaryInstructions,
    writingStyle: summaryInstructions,
    summaryTags: uniqueStrings(
      Array.isArray(source.summaryTags) ? source.summaryTags : defaultConfig.summaryTags
    ),
    scheduleTime1: source.scheduleTime1 || defaultConfig.scheduleTime1,
    sectorArticleLimit: Number(source.sectorArticleLimit || defaultConfig.sectorArticleLimit),
    globalArticleLimit: Number(source.globalArticleLimit || defaultConfig.globalArticleLimit),
    searchRegion: source.searchRegion || defaultConfig.searchRegion,
    searchPages:
      Array.isArray(source.searchPages) && source.searchPages.length
        ? source.searchPages.map(Number).filter((page) => Number.isFinite(page) && page > 0)
        : defaultConfig.searchPages,
    searchBatchSize: Number(source.searchBatchSize || defaultConfig.searchBatchSize),
    searchDateFilter: source.searchDateFilter || defaultConfig.searchDateFilter,
    autocorrect:
      typeof source.autocorrect === "boolean" ? source.autocorrect : defaultConfig.autocorrect,
    searchPrompts,
  }
}

export function getConfiguredKeywords(config: SearchConfig): string[] {
  return uniqueStrings(config.keywords)
}

export function getConfiguredOutlets(config: SearchConfig): string[] {
  return uniqueStrings(config.outlets.map((outlet) => outlet.value))
}

export function buildSerperSearchBatches(config: SearchConfig): SearchBatch[] {
  const normalized = normalizeConfig(config)
  const keywords = getConfiguredKeywords(normalized)
  const pages = normalized.searchPages.length ? normalized.searchPages : defaultConfig.searchPages
  const batchSize = Math.max(1, normalized.searchBatchSize)
  const body = keywords.flatMap((q) =>
    pages.map((page) => ({
      q,
      gl: normalized.searchRegion,
      autocorrect: normalized.autocorrect,
      tbs: normalized.searchDateFilter,
      page,
    }))
  )

  const totalBatches = Math.ceil(body.length / batchSize)

  return Array.from({ length: totalBatches }, (_, index) => {
    const batch = body.slice(index * batchSize, index * batchSize + batchSize)

    return {
      batchIndex: index + 1,
      batchSize: batch.length,
      totalBatches,
      body: batch,
    }
  })
}

export function saveConfig(config: SearchConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalizeConfig(config)))
  }
}

export function loadConfig(): SearchConfig {
  if (typeof window === "undefined") {
    return defaultConfig
  }

  const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (stored) {
    try {
      return normalizeConfig(JSON.parse(stored) as Partial<SearchConfig>)
    } catch {
      return defaultConfig
    }
  }

  return defaultConfig
}

export function saveDigestData(data: unknown): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data))
  }
}

export function loadDigestData(): unknown | null {
  if (typeof window === "undefined") {
    return null
  }

  const stored = localStorage.getItem(DATA_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  return null
}

export function clearStoredData(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
    localStorage.removeItem(DATA_STORAGE_KEY)
  }
}

export function buildDynamicDigestPrompt(config: SearchConfig): string {
  const base = config.searchPrompts.digest
  const keywords = getConfiguredKeywords(config)
  const outlets = getConfiguredOutlets(config)
  const sectorLimit = config.sectorArticleLimit || 12
  const globalLimit = config.globalArticleLimit || 12

  const additions: string[] = []

  // Always inject hard overrides so cached old prompts cannot override these rules
  additions.push(
    `\nARTICLE LIMITS (override any limits stated above): Return up to ${sectorLimit} articles per subsection. Return up to ${globalLimit} articles for General sections. Targets: Saudi Arabia/Regional up to ${sectorLimit * 12} articles total, Negative Articles up to ${sectorLimit} articles, Global up to ${sectorLimit * 12} articles total.`
  )

  additions.push(
    `\nARABIC/LOCAL OUTLET EXCLUSION (mandatory, overrides any prior instruction): COMPLETELY EXCLUDE all articles from Arabic-language outlets or originally written in Arabic. This includes but is not limited to: Sabq, Okaz, Al-Riyadh, Ajel, Aleqtisadiah, Asharq Al-Awsat (Arabic), Al-Watan, Al-Madina, Arab News (Arabic content), and any Gulf/Saudi Arabic-language press. Only English-language international sources are permitted.`
  )

  if (keywords.length > 0) {
    additions.push(
      `\nSearch Keywords (articles were retrieved using these terms — use them to improve categorisation and relevance scoring): ${keywords.join(", ")}`
    )
  }

  if (outlets.length > 0) {
    additions.push(
      `\nPreferred Outlets (prioritise articles from these outlets when available, and use them as the primary source filter): ${outlets.join(", ")}`
    )
  }

  return base + "\n\n---\n\nDynamic Configuration\n" + additions.join("\n")
}
