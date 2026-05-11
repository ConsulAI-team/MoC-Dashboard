"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Building2,
  Landmark,
  Music,
  Film,
  Palette,
  BookOpen,
  UtensilsCrossed,
  Theater,
  AlertTriangle,
  Lightbulb,
  Settings,
  Building,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { ExportDocxButton } from "@/components/export-docx-button"
import type { DigestData, Article, RiskOpportunity, SearchConfig } from "@/lib/types"
import { buildSerperSearchBatches, buildDynamicDigestPrompt, loadConfig, loadDigestData, saveDigestData } from "@/lib/config-store"

function getSentimentBadge(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
          Positive
        </Badge>
      )
    case "negative":
      return <Badge variant="destructive">Negative</Badge>
    case "neutral":
    default:
      return <Badge variant="secondary">Neutral</Badge>
  }
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Card className="border-l-4 border-l-[#0F2837]/30 hover:border-l-[#0F2837] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-medium">
                {article.Outlet}
              </Badge>
              {getSentimentBadge(article.sentiment)}
            </div>
            <h4 className="font-semibold text-foreground line-clamp-2 mb-2">
              {article.Title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {article.Snippet}
            </p>
          </div>
          {article.Link && (
            <a
              href={article.Link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0F2837] hover:text-[#0F2837]/80 shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CollapsibleSectionProps {
  title: string
  arabicTitle?: string
  icon: React.ReactNode
  articles: Article[]
  defaultOpen?: boolean
}

function CollapsibleSection({
  title,
  arabicTitle,
  icon,
  articles,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!articles || articles.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-lg">{title}</span>
            {arabicTitle && (
              <span className="text-sm text-muted-foreground">({arabicTitle})</span>
            )}
            <Badge variant="secondary" className="ml-2">
              {articles.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pl-4">
        {articles.map((article, index) => (
          <ArticleCard key={index} article={article} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// Transform data from n8n format to dashboard format
function transformDigestData(rawData: unknown): DigestData | null {
  if (!rawData || typeof rawData !== "object") return null

  const data = rawData as Record<string, unknown>

  // If already in dashboard format, ensure headlines are always populated
  if (data.saudiRegional || data.global) {
    const result = data as unknown as DigestData
    if (!result.headlines) {
      const safeArr = (val: unknown): Article[] => (Array.isArray(val) ? (val as Article[]) : [])
      const saudiHeadlines: string[] = []
      const negativeHeadlines: string[] = []
      const globalHeadlines: string[] = []
      const negativeSet = new Set<string>()

      ;(result.negativeArticles ?? []).forEach((a) => {
        negativeHeadlines.push(a.Title)
        negativeSet.add(a.Title)
      })

      Object.values(result.saudiRegional ?? {}).forEach((v) => {
        safeArr(v).forEach((a) => {
          if (a.sentiment === "negative" && !negativeSet.has(a.Title)) {
            negativeHeadlines.push(a.Title)
            negativeSet.add(a.Title)
          } else if (a.sentiment !== "negative") {
            saudiHeadlines.push(a.Title)
          }
        })
      })

      Object.values(result.global ?? {}).forEach((v) => {
        safeArr(v).forEach((a) => {
          if (a.sentiment === "negative" && !negativeSet.has(a.Title)) {
            negativeHeadlines.push(a.Title)
            negativeSet.add(a.Title)
          } else if (a.sentiment !== "negative") {
            globalHeadlines.push(a.Title)
          }
        })
      })

      result.headlines = {
        saudiRegional: saudiHeadlines.slice(0, 12),
        negative: negativeHeadlines.slice(0, 12),
        global: globalHeadlines.slice(0, 12),
      }
    }
    // Always ensure these sections exist so the UI can render them
    if (!result.negativeArticles) result.negativeArticles = []
    if (!result.risksAndOpportunities) result.risksAndOpportunities = { risks: [], opportunities: [] }
    if (!result.risksAndOpportunities.risks) result.risksAndOpportunities.risks = []
    if (!result.risksAndOpportunities.opportunities) result.risksAndOpportunities.opportunities = []
    return result
  }

  const safeArr = (val: unknown): Article[] => (Array.isArray(val) ? (val as Article[]) : [])
  const safeStrArr = (val: unknown): string[] => (Array.isArray(val) ? (val as string[]) : [])

  const result: DigestData = {
    generatedAt: (data.generatedAt as string) || new Date().toISOString(),
  }

  result.saudiRegional = {}
  result.global = {}

  // geoPolitical: { "Regional (incl. Saudi)": [...], "Europe & Transcontinental": [...], "The Americas": [...], "Asia & Others": [...] }
  if (data.geoPolitical && typeof data.geoPolitical === "object") {
    const geo = data.geoPolitical as Record<string, unknown>
    // regional → saudiRegional.general
    const regionalKey = Object.keys(geo).find((k) => /regional|saudi/i.test(k))
    if (regionalKey) {
      result.saudiRegional.general = [
        ...(result.saudiRegional.general || []),
        ...safeArr(geo[regionalKey]),
      ]
    }
    // international geo keys → global.general
    const intlGeoArticles: Article[] = []
    for (const [key, val] of Object.entries(geo)) {
      if (regionalKey && key === regionalKey) continue
      intlGeoArticles.push(...safeArr(val))
    }
    if (intlGeoArticles.length > 0) {
      result.global.general = [...(result.global.general || []), ...intlGeoArticles]
    }
  }

  // nationalGeneral → saudiRegional.general
  if (data.nationalGeneral) {
    result.saudiRegional.general = [
      ...(result.saudiRegional.general || []),
      ...safeArr(data.nationalGeneral),
    ]
  }

  // nationalSectors → saudiRegional sub-fields
  if (data.nationalSectors && typeof data.nationalSectors === "object") {
    const sectors = data.nationalSectors as Record<string, unknown>
    result.saudiRegional.museums = safeArr(sectors.Museums)
    result.saudiRegional.music = safeArr(sectors.Music)
    result.saudiRegional.film = safeArr(sectors.Film)
    result.saudiRegional.fashion = safeArr(sectors.Fashion)
    result.saudiRegional.heritage = safeArr(sectors.Heritage)
    result.saudiRegional.visualArts = safeArr(sectors.VisualArts)
    result.saudiRegional.architecture = safeArr(sectors.Architecture)
    result.saudiRegional.culinary = safeArr(sectors.Culinary)
    result.saudiRegional.literature = safeArr(sectors.Literature)
    result.saudiRegional.theater = safeArr(sectors.Theater)
    result.saudiRegional.libraries = safeArr(sectors.Libraries)
  }

  // international → global.general (merged with geo international above)
  if (data.international && typeof data.international === "object") {
    const intl = data.international as Record<string, unknown>
    const intlArticles: Article[] = [
      ...safeArr(intl["Europe & Transcontinental"]),
      ...safeArr(intl["The Americas"]),
      ...safeArr(intl["Asia & Others"]),
    ]
    if (intlArticles.length > 0) {
      result.global.general = [...(result.global.general || []), ...intlArticles]
    }
  }

  // Extract negative articles
  const negatives: Article[] = []
  const collectNegatives = (articles: Article[]) => {
    articles.forEach((a) => { if (a.sentiment === "negative") negatives.push(a) })
  }
  Object.values(result.saudiRegional).forEach((v) => collectNegatives(safeArr(v)))
  Object.values(result.global).forEach((v) => collectNegatives(safeArr(v)))
  if (negatives.length > 0) result.negativeArticles = negatives

  // broaderTrends → risksAndOpportunities
  if (data.broaderTrends && typeof data.broaderTrends === "object") {
    const trends = data.broaderTrends as Record<string, unknown>
    result.risksAndOpportunities = {
      opportunities: safeStrArr(trends.peaking).map((t) => ({ title: "", description: t })),
      risks: [
        ...safeStrArr(trends.legacy).map((t) => ({ title: "", description: t })),
        ...safeStrArr(trends.emerging).map((t) => ({ title: "", description: t })),
      ],
    }
  }

  // insights → risks (appended)
  if (data.insights) {
    if (!result.risksAndOpportunities) result.risksAndOpportunities = {}
    const existing = result.risksAndOpportunities.risks || []
    result.risksAndOpportunities.risks = [
      ...existing,
      ...safeStrArr(data.insights).map((i) => ({ title: "", description: i })),
    ]
  }

  // Generate headlines
  const saudiHeadlines: string[] = []
  const negativeHeadlines: string[] = []
  const globalHeadlines: string[] = []

  Object.values(result.saudiRegional).forEach((v) => {
    safeArr(v).forEach((a) => {
      if (a.sentiment === "negative") negativeHeadlines.push(a.Title)
      else saudiHeadlines.push(a.Title)
    })
  })
  Object.values(result.global).forEach((v) => {
    safeArr(v).forEach((a) => {
      if (a.sentiment === "negative") negativeHeadlines.push(a.Title)
      else globalHeadlines.push(a.Title)
    })
  })

  result.headlines = {
    saudiRegional: saudiHeadlines.slice(0, 12),
    negative: negativeHeadlines.slice(0, 12),
    global: globalHeadlines.slice(0, 12),
  }

  return result
}

// Apply excludedSources and excludedTerms from config to filter display articles
function applyConfigFilters(data: DigestData, config: SearchConfig | null): DigestData {
  if (!config) return data

  const excludedSourceSet = new Set(
    config.excludedSources.map((s) => s.value.toLowerCase().trim()).filter(Boolean)
  )
  const excludedTermsList = config.excludedTerms
    .map((t) => t.value.toLowerCase().trim())
    .filter(Boolean)

  if (excludedSourceSet.size === 0 && excludedTermsList.length === 0) return data

  const keep = (article: Article): boolean => {
    const outlet = (article.Outlet ?? "").toLowerCase().trim()
    if (outlet && excludedSourceSet.has(outlet)) return false
    if (excludedTermsList.length > 0) {
      const text = `${article.Title} ${article.Snippet}`.toLowerCase()
      if (excludedTermsList.some((term) => text.includes(term))) return false
    }
    return true
  }

  const filterMap = (
    section: Record<string, Article[] | undefined> | undefined
  ): Record<string, Article[] | undefined> | undefined => {
    if (!section) return section
    const out: Record<string, Article[] | undefined> = {}
    for (const [key, arr] of Object.entries(section)) {
      out[key] = Array.isArray(arr) ? arr.filter(keep) : arr
    }
    return out
  }

  return {
    ...data,
    saudiRegional: filterMap(data.saudiRegional) as DigestData["saudiRegional"],
    negativeArticles: data.negativeArticles?.filter(keep),
    global: filterMap(data.global) as DigestData["global"],
  }
}

// Create empty digest data structure
function createEmptyDigestData(): DigestData {
  return {
    generatedAt: new Date().toISOString(),
    headlines: {
      saudiRegional: [],
      negative: [],
      global: [],
    },
    saudiRegional: {
      general: [],
      museums: [],
      heritage: [],
      visualArts: [],
      film: [],
      music: [],
      fashion: [],
      literature: [],
      culinary: [],
      theater: [],
      architecture: [],
    },
    negativeArticles: [],
    global: {
      general: [],
      museums: [],
      heritage: [],
      visualArts: [],
      film: [],
      music: [],
      fashion: [],
    },
    risksAndOpportunities: {
      risks: [],
      opportunities: [],
    },
  }
}

export function DigestDashboard() {
  const [data, setData] = useState<DigestData | null>(null)
  const [config, setConfig] = useState<SearchConfig | null>(null)
  const [hasData, setHasData] = useState(false)
  const [isScheduledRunning, setIsScheduledRunning] = useState(false)

  // Load config and data on mount — checks server digest for background-cron updates
  useEffect(() => {
    const storedConfig = loadConfig()
    setConfig(storedConfig)

    const storedData = loadDigestData()
    if (storedData) {
      const transformed = transformDigestData(storedData)
      if (transformed) {
        setData(transformed)
        setHasData(true)
      }
    }

    // Check if the server has a fresher digest from a background cron run
    fetch('/api/digest-latest')
      .then(r => r.json())
      .then(({ digest }) => {
        if (!digest) return
        const serverTime = (digest as Record<string, unknown>).generatedAt as string | undefined
        const localTime = (storedData as Record<string, unknown> | null)?.generatedAt as string | undefined
        if (!serverTime) return
        if (!localTime || new Date(serverTime) > new Date(localTime)) {
          const transformed = transformDigestData(digest)
          if (transformed) {
            saveDigestData(digest)
            setData(transformed)
            setHasData(true)
          }
        }
      })
      .catch(() => { /* server digest unavailable — use local */ })
  }, [])

  // Scheduled auto-run: fires at the configured time while the tab is open,
  // and catches up on load if the time was missed while the tab was closed.
  useEffect(() => {
    if (!config) return

    const isRunDue = (): boolean => {
      const [h, m] = config.scheduleTime1.split(':').map(Number)
      if (!Number.isFinite(h) || !Number.isFinite(m)) return false
      const now = new Date()
      const scheduledToday = new Date(now)
      scheduledToday.setHours(h, m, 0, 0)
      if (now < scheduledToday) return false
      const lastRun = localStorage.getItem('moc-last-run-at')
      if (!lastRun) return true
      return new Date(lastRun) < scheduledToday
    }

    let running = false

    const runScheduled = async () => {
      if (running) return
      running = true
      setIsScheduledRunning(true)
      try {
        const batches = buildSerperSearchBatches(config)
        if (batches.length === 0) return

        const allArticles: Array<{ title: string; link: string; snippet: string; date?: string; source?: string }> = []

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchIndex: batch.batchIndex, batch }),
          })
          if (!res.ok) continue
          const d = await res.json()
          for (const search of (d.searches ?? [])) {
            for (const result of (search.results ?? [])) allArticles.push(result)
          }
          if (i < batches.length - 1) await new Promise(r => setTimeout(r, 800))
        }

        if (allArticles.length === 0) return

        const processRes = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articles: allArticles,
            digestPrompt: buildDynamicDigestPrompt(config),
          }),
        })
        if (!processRes.ok) return

        const { digestData } = await processRes.json()
        if (!digestData) return

        saveDigestData(digestData)
        localStorage.setItem('moc-last-run-at', new Date().toISOString())
        // Mirror to server so background cron state stays in sync
        fetch('/api/digest-latest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(digestData),
        }).catch(() => { /* best-effort */ })

        const transformed = transformDigestData(digestData)
        if (transformed) {
          setData(transformed)
          setHasData(true)
        }
      } catch (err) {
        console.error('Scheduled run failed:', err)
      } finally {
        running = false
        setIsScheduledRunning(false)
      }
    }

    // Catch-up: run immediately if the scheduled time was missed
    if (isRunDue()) runScheduled()

    // Poll every 30 seconds so the run fires within 30s of the scheduled minute
    const interval = setInterval(() => {
      if (isRunDue()) runScheduled()
    }, 30_000)

    return () => clearInterval(interval)
  }, [config])

  const dateStr = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })

  const isCategoryVisible = useCallback(
    (...classificationKeys: string[]) => {
      if (!config) return true

      return classificationKeys.some((key) => {
        const category = config.categories.find((item) => item.classificationKey === key)
        return category?.isActive !== false
      })
    },
    [config]
  )

  const visibleSections = {
    saudiGeneral: isCategoryVisible("NATIONAL_GENERAL"),
    museums: isCategoryVisible("NATIONAL_MUSEUMS"),
    heritage: isCategoryVisible("NATIONAL_HERITAGE"),
    visualArts: isCategoryVisible("NATIONAL_VISUAL_ARTS"),
    film: isCategoryVisible("NATIONAL_FILM"),
    music: isCategoryVisible("NATIONAL_MUSIC"),
    fashion: isCategoryVisible("NATIONAL_FASHION"),
    literature: isCategoryVisible("NATIONAL_LITERATURE"),
    culinary: isCategoryVisible("NATIONAL_CULINARY"),
    theater: isCategoryVisible("NATIONAL_THEATER"),
    architecture: isCategoryVisible("NATIONAL_ARCHITECTURE"),
    libraries: isCategoryVisible("NATIONAL_LIBRARIES"),
    globalGeneral: isCategoryVisible(
      "INTL_EUROPE",
      "INTL_AMERICAS",
      "INTL_ASIA"
    ),
  }

  // Derive display data: apply excluded-sources / excluded-terms filters from config
  const displayData = useMemo<DigestData | null>(
    () => (data && config ? applyConfigFilters(data, config) : data),
    [data, config]
  )

  // Calculate stats
  const saudiCount = displayData?.saudiRegional
    ? [
        visibleSections.saudiGeneral ? displayData.saudiRegional.general : [],
        visibleSections.museums ? displayData.saudiRegional.museums : [],
        visibleSections.heritage ? displayData.saudiRegional.heritage : [],
        visibleSections.visualArts ? displayData.saudiRegional.visualArts : [],
        visibleSections.film ? displayData.saudiRegional.film : [],
        visibleSections.music ? displayData.saudiRegional.music : [],
        visibleSections.fashion ? displayData.saudiRegional.fashion : [],
        visibleSections.literature ? displayData.saudiRegional.literature : [],
        visibleSections.culinary ? displayData.saudiRegional.culinary : [],
        visibleSections.theater ? displayData.saudiRegional.theater : [],
        visibleSections.architecture ? displayData.saudiRegional.architecture : [],
        visibleSections.libraries ? displayData.saudiRegional.libraries : [],
      ].reduce((acc, arr) => acc + (arr?.length || 0), 0)
    : 0
  const negativeLinks = new Set<string>()
  ;(Array.isArray(displayData?.negativeArticles) ? displayData.negativeArticles : []).forEach((a) =>
    negativeLinks.add(a.Link || a.Title)
  )
  ;[...Object.values(displayData?.saudiRegional ?? {}), ...Object.values(displayData?.global ?? {})]
    .flat()
    .filter((a): a is Article => !!a && (a as Article).sentiment === "negative")
    .forEach((a) => negativeLinks.add(a.Link || a.Title))
  const negativeCount = negativeLinks.size
  const globalCount = displayData?.global
    ? [
        visibleSections.globalGeneral ? displayData.global.general : [],
        visibleSections.museums ? displayData.global.museums : [],
        visibleSections.heritage ? displayData.global.heritage : [],
        visibleSections.visualArts ? displayData.global.visualArts : [],
        visibleSections.film ? displayData.global.film : [],
        visibleSections.music ? displayData.global.music : [],
        visibleSections.fashion ? displayData.global.fashion : [],
        visibleSections.literature ? displayData.global.literature : [],
        visibleSections.culinary ? displayData.global.culinary : [],
        visibleSections.theater ? displayData.global.theater : [],
        visibleSections.architecture ? displayData.global.architecture : [],
        visibleSections.libraries ? displayData.global.libraries : [],
      ].reduce((acc, arr) => acc + (arr?.length || 0), 0)
    : 0
  const positiveCount = displayData
    ? [
        ...Object.values(displayData.saudiRegional ?? {}),
        ...Object.values(displayData.global ?? {}),
      ]
        .flat()
        .filter((a): a is Article => !!a && (a as Article).sentiment === "positive")
        .length
    : 0
  const risksCount = displayData?.risksAndOpportunities?.risks?.length || 0
  const opportunitiesCount = displayData?.risksAndOpportunities?.opportunities?.length || 0
  const totalCount = saudiCount + (Array.isArray(displayData?.negativeArticles) ? displayData.negativeArticles.length : 0) + globalCount

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/moc-logo.svg"
                alt="Ministry of Culture"
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  MoC Daily Cultural Digest
                </h1>
                <p className="text-sm text-muted-foreground">{dateStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {displayData && <ExportDocxButton data={displayData} />}
              <Link href="/config">
                <Button variant="outline" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Scheduled run in-progress banner */}
        {isScheduledRunning && (
          <div className="mb-6 flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Running scheduled search and processing with AI — dashboard will update when complete…
          </div>
        )}

        {/* Empty State */}
        {!hasData && !isScheduledRunning && (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Digest Data</h3>
              <p className="text-muted-foreground mb-4">
                Run a search to populate the dashboard with the latest cultural digest
                data.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Headlines Summary */}
        {displayData?.headlines && hasData && (
          <Card className="mb-8 border-[#0F2837]/20 bg-[#0F2837]/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#0F2837]">
                <Lightbulb className="h-5 w-5" />
                Headlines Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayData.headlines.saudiRegional &&
                displayData.headlines.saudiRegional.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 text-[#0F2837]">
                      Saudi Arabia/Regional
                    </h4>
                    <ul className="space-y-1">
                      {displayData.headlines.saudiRegional.slice(0, 12).map((headline, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-[#0F2837]">•</span>
                          {headline}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {displayData.headlines.negative && displayData.headlines.negative.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-red-600">
                    Negative Articles
                  </h4>
                  <ul className="space-y-1">
                    {displayData.headlines.negative.map((headline, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        {headline}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {displayData.headlines.global && displayData.headlines.global.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-[#0F2837]">Global</h4>
                  <ul className="space-y-1">
                    {displayData.headlines.global.slice(0, 12).map((headline, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-[#0F2837]">•</span>
                        {headline}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(!displayData.headlines.saudiRegional ||
                displayData.headlines.saudiRegional.length === 0) &&
                (!displayData.headlines.negative || displayData.headlines.negative.length === 0) &&
                (!displayData.headlines.global || displayData.headlines.global.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No headlines available. Run a search to populate the digest.
                  </p>
                )}
            </CardContent>
          </Card>
        )}

        {hasData && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Saudi Arabia/Regional Section */}
              {displayData?.saudiRegional && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#0F2837]">
                      <Globe className="h-5 w-5" />
                      Saudi Arabia/Regional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleSections.saudiGeneral && (
                      <CollapsibleSection
                        title="General"
                        icon={<Building className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.general || []}
                      />
                    )}
                    {visibleSections.museums && (
                      <CollapsibleSection
                        title="Museums"
                        arabicTitle="المتاحف"
                        icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.museums || []}
                      />
                    )}
                    {visibleSections.heritage && (
                      <CollapsibleSection
                        title="Heritage"
                        arabicTitle="التراث"
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.heritage || []}
                      />
                    )}
                    {visibleSections.visualArts && (
                      <CollapsibleSection
                        title="Visual Arts"
                        arabicTitle="الفنون البصرية"
                        icon={<Palette className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.visualArts || []}
                      />
                    )}
                    {visibleSections.film && (
                      <CollapsibleSection
                        title="Film"
                        arabicTitle="الأفلام"
                        icon={<Film className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.film || []}
                      />
                    )}
                    {visibleSections.music && (
                      <CollapsibleSection
                        title="Music"
                        arabicTitle="الموسيقى"
                        icon={<Music className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.music || []}
                      />
                    )}
                    {visibleSections.fashion && (
                      <CollapsibleSection
                        title="Fashion"
                        arabicTitle="الأزياء"
                        icon={<Palette className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.fashion || []}
                      />
                    )}
                    {visibleSections.literature && (
                      <CollapsibleSection
                        title="Literature, Publishing and Translation"
                        arabicTitle="الأدب والنشر والترجمة"
                        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.literature || []}
                      />
                    )}
                    {visibleSections.culinary && (
                      <CollapsibleSection
                        title="Culinary Arts"
                        arabicTitle="فنون الطهي"
                        icon={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.culinary || []}
                      />
                    )}
                    {visibleSections.theater && (
                      <CollapsibleSection
                        title="Theater and Performing Arts"
                        arabicTitle="المسرح والفنون الأدائية"
                        icon={<Theater className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.theater || []}
                      />
                    )}
                    {visibleSections.architecture && (
                      <CollapsibleSection
                        title="Architecture and Design"
                        arabicTitle="العمارة والتصميم"
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.architecture || []}
                      />
                    )}
                    {visibleSections.libraries && (
                      <CollapsibleSection
                        title="Libraries"
                        arabicTitle="المكتبات"
                        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.saudiRegional.libraries || []}
                      />
                    )}
                    {saudiCount === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No Saudi/Regional articles found. Run a search to populate.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Negative Articles — always shown */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Negative Articles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {displayData?.negativeArticles && displayData.negativeArticles.length > 0 ? (
                    (displayData.negativeArticles as Article[]).map((article, index) => (
                      <ArticleCard key={index} article={article} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No negative articles identified in this digest.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Global Section */}
              {displayData?.global && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#0F2837]">
                      <Globe className="h-5 w-5" />
                      Global
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleSections.globalGeneral && (
                      <CollapsibleSection
                        title="General"
                        arabicTitle="عام"
                        icon={<Building className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.general || []}
                      />
                    )}
                    {visibleSections.museums && (
                      <CollapsibleSection
                        title="Museums"
                        arabicTitle="المتاحف"
                        icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.museums || []}
                      />
                    )}
                    {visibleSections.heritage && (
                      <CollapsibleSection
                        title="Heritage"
                        arabicTitle="التراث"
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.heritage || []}
                      />
                    )}
                    {visibleSections.visualArts && (
                      <CollapsibleSection
                        title="Visual Arts"
                        arabicTitle="الفنون البصرية"
                        icon={<Palette className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.visualArts || []}
                      />
                    )}
                    {visibleSections.film && (
                      <CollapsibleSection
                        title="Film"
                        arabicTitle="الأفلام"
                        icon={<Film className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.film || []}
                      />
                    )}
                    {visibleSections.music && (
                      <CollapsibleSection
                        title="Music"
                        arabicTitle="الموسيقى"
                        icon={<Music className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.music || []}
                      />
                    )}
                    {visibleSections.fashion && (
                      <CollapsibleSection
                        title="Fashion"
                        arabicTitle="الأزياء"
                        icon={<Palette className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.fashion || []}
                      />
                    )}
                    {visibleSections.literature && (
                      <CollapsibleSection
                        title="Literature, Publishing and Translation"
                        arabicTitle="الأدب والنشر والترجمة"
                        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.literature || []}
                      />
                    )}
                    {visibleSections.culinary && (
                      <CollapsibleSection
                        title="Culinary Arts"
                        arabicTitle="فنون الطهي"
                        icon={<UtensilsCrossed className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.culinary || []}
                      />
                    )}
                    {visibleSections.theater && (
                      <CollapsibleSection
                        title="Theater and Performing Arts"
                        arabicTitle="المسرح والفنون الأدائية"
                        icon={<Theater className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.theater || []}
                      />
                    )}
                    {visibleSections.architecture && (
                      <CollapsibleSection
                        title="Architecture and Design"
                        arabicTitle="العمارة والتصميم"
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.architecture || []}
                      />
                    )}
                    {visibleSections.libraries && (
                      <CollapsibleSection
                        title="Libraries"
                        arabicTitle="المكتبات"
                        icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                        articles={displayData.global.libraries || []}
                      />
                    )}
                    {globalCount === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No Global articles found. Run a search to populate.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Risks & Opportunities — always shown */}
            <div className="space-y-6">
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-[#0F2837]" />
                      Risks and Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-sm text-red-600 uppercase tracking-wide mb-3">
                        Risks
                      </h4>
                      {displayData?.risksAndOpportunities?.risks && displayData.risksAndOpportunities.risks.length > 0 ? (
                        (displayData.risksAndOpportunities.risks as RiskOpportunity[]).map((risk, index) => (
                          <div key={index} className="mb-4">
                            <p className="text-sm text-foreground mb-2">
                              {risk.description}
                            </p>
                            {risk.source && (
                              <p className="text-xs text-muted-foreground italic mb-1">
                                Source:{" "}
                                {risk.link ? (
                                  <a href={risk.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                                    {risk.source}
                                  </a>
                                ) : risk.source}
                              </p>
                            )}
                            {risk.consideration && (
                              <p className="text-xs text-foreground">
                                <span className="font-semibold">Consideration:</span>{" "}
                                <span className="italic">{risk.consideration}</span>
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No risks identified in this digest.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-green-600 uppercase tracking-wide mb-3">
                        Opportunities
                      </h4>
                      {displayData?.risksAndOpportunities?.opportunities && displayData.risksAndOpportunities.opportunities.length > 0 ? (
                        (displayData.risksAndOpportunities.opportunities as RiskOpportunity[]).map((opp, index) => (
                          <div key={index} className="mb-4">
                            <p className="text-sm text-foreground mb-2">
                              {opp.description}
                            </p>
                            {opp.source && (
                              <p className="text-xs text-muted-foreground italic mb-1">
                                Source:{" "}
                                {opp.link ? (
                                  <a href={opp.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                                    {opp.source}
                                  </a>
                                ) : opp.source}
                              </p>
                            )}
                            {opp.consideration && (
                              <p className="text-xs text-foreground">
                                <span className="font-semibold">Consideration:</span>{" "}
                                <span className="italic">{opp.consideration}</span>
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No opportunities identified in this digest.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-[#0F2837]">{totalCount}</div>
                      <div className="text-xs text-muted-foreground">Total Articles</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{positiveCount}</div>
                      <div className="text-xs text-muted-foreground">Positive</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{negativeCount}</div>
                      <div className="text-xs text-muted-foreground">Negative</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-[#0F2837]">{saudiCount}</div>
                      <div className="text-xs text-muted-foreground">Saudi/Regional</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-[#0F2837]">{globalCount}</div>
                      <div className="text-xs text-muted-foreground">Global</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-500">{opportunitiesCount}</div>
                      <div className="text-xs text-muted-foreground">Opportunities</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
