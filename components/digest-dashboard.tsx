"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ExportDocxButton } from "@/components/export-docx-button"
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Newspaper,
  RefreshCw,
  Settings,
  TrendingUp,
} from "lucide-react"
import { loadDigestData } from "@/lib/config-store"
import {
  loadDigestDataFromSupabase,
  getScheduleInfo,
  subscribeToDigestUpdates,
} from "@/lib/supabase-store"
import type { Article, DigestData, RiskOpportunity } from "@/lib/types"

function ArticleCard({ article, variant = "default" }: { article: Article; variant?: "default" | "negative" }) {
  const isNegative = variant === "negative"
  
  return (
    <div className={`border-l-2 pl-3 py-2 ${isNegative ? "border-destructive" : "border-muted"}`}>
      <a
        href={article.Link}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start justify-between gap-2"
      >
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-sm leading-tight ${isNegative ? "text-destructive" : "text-foreground"} group-hover:underline`}>
            {article.Title}
          </h4>
          {article.Snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.Snippet}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {article.Outlet && (
              <span className="text-xs text-muted-foreground">{article.Outlet}</span>
            )}
            {article.Date && (
              <span className="text-xs text-muted-foreground">{article.Date}</span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    </div>
  )
}

function ArticleSection({ 
  title, 
  articles, 
  variant = "default",
  icon: Icon 
}: { 
  title: string
  articles: Article[] | undefined
  variant?: "default" | "negative"
  icon?: typeof Newspaper
}) {
  if (!articles || articles.length === 0) return null
  
  return (
    <AccordionItem value={title} className="border-none">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`h-4 w-4 ${variant === "negative" ? "text-destructive" : "text-muted-foreground"}`} />}
          <span className={variant === "negative" ? "text-destructive" : ""}>{title}</span>
          <Badge variant={variant === "negative" ? "destructive" : "secondary"} className="ml-2">
            {articles.length}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pl-6">
          {articles.map((article, index) => (
            <ArticleCard key={`${article.Link}-${index}`} article={article} variant={variant} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function SubsectionList({ 
  data, 
  variant = "default" 
}: { 
  data: Record<string, Article[] | undefined> | undefined
  variant?: "default" | "negative"
}) {
  if (!data) return null
  
  const entries = Object.entries(data).filter(([, articles]) => articles && articles.length > 0)
  if (entries.length === 0) return null
  
  return (
    <Accordion type="multiple" className="w-full">
      {entries.map(([key, articles]) => (
        <ArticleSection key={key} title={key} articles={articles} variant={variant} />
      ))}
    </Accordion>
  )
}

function RiskOpportunityCard({ item, type }: { item: RiskOpportunity; type: "risk" | "opportunity" }) {
  const isRisk = type === "risk"
  
  return (
    <div className={`border-l-2 pl-3 py-2 ${isRisk ? "border-destructive" : "border-[#00573C]"}`}>
      {item.title && (
        <h4 className={`font-medium text-sm ${isRisk ? "text-destructive" : "text-[#00573C]"}`}>
          {item.title}
        </h4>
      )}
      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
      {item.source && (
        <div className="mt-2">
          <span className="text-xs font-medium">Source: </span>
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#467885] hover:underline"
            >
              {item.source}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">{item.source}</span>
          )}
        </div>
      )}
      {item.consideration && (
        <div className="mt-2 text-xs italic text-muted-foreground">
          <span className="font-medium not-italic">Consideration: </span>
          {item.consideration}
        </div>
      )}
    </div>
  )
}

export function DigestDashboard() {
  const router = useRouter()
  const [digestData, setDigestData] = useState<DigestData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [scheduledTime, setScheduledTime] = useState<string>("08:00")
  const [error, setError] = useState<string | null>(null)

  const loadData = async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true)
    setError(null)
    
    try {
      // Try to load from Supabase first
      const [supabaseData, scheduleInfo] = await Promise.all([
        loadDigestDataFromSupabase(),
        getScheduleInfo()
      ])
      
      if (supabaseData) {
        setDigestData(supabaseData)
        setLastRunAt(scheduleInfo.lastRunAt)
        setScheduledTime(scheduleInfo.scheduledTime)
      } else {
        // Fallback to localStorage for backward compatibility
        const localData = loadDigestData() as DigestData | null
        setDigestData(localData)
        setLastRunAt(localStorage.getItem("moc-last-run-at"))
      }
    } catch (err) {
      console.error("Failed to load digest data:", err)
      setError("Failed to load data from server. Showing cached data if available.")
      // Fallback to localStorage on error
      const localData = loadDigestData() as DigestData | null
      setDigestData(localData)
      setLastRunAt(localStorage.getItem("moc-last-run-at"))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()

    // Subscribe to real-time updates from Supabase
    const unsubscribe = subscribeToDigestUpdates((newData) => {
      setDigestData(newData)
      setLastRunAt(new Date().toISOString())
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasData = digestData && (
    digestData.saudiRegional ||
    digestData.negativeArticles?.length ||
    digestData.global ||
    digestData.risksAndOpportunities
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">MoC Daily Cultural Digest</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {digestData?.generatedAt
                    ? `Generated: ${new Date(digestData.generatedAt).toLocaleString()}`
                    : lastRunAt
                    ? `Last run: ${new Date(lastRunAt).toLocaleString()}`
                    : "No digest generated yet"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Daily update: {scheduledTime}
                </span>
              </div>
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {hasData && digestData && (
                <ExportDocxButton data={digestData} />
              )}
              <Button
                variant="outline"
                onClick={() => router.push("/config")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {!hasData ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Digest Available</h2>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Configure your search keywords and run a search to generate your first cultural digest.
              </p>
              <Button onClick={() => router.push("/config")}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Saudi Arabia / Regional */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#0F2837]">
                  <Newspaper className="h-5 w-5" />
                  Saudi Arabia / Regional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {digestData?.saudiRegional ? (
                  <SubsectionList data={digestData.saudiRegional} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No articles in this section</p>
                )}
              </CardContent>
            </Card>

            {/* Global */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#0F2837]">
                  <Globe className="h-5 w-5" />
                  Global
                </CardTitle>
              </CardHeader>
              <CardContent>
                {digestData?.global ? (
                  <SubsectionList data={digestData.global} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No articles in this section</p>
                )}
              </CardContent>
            </Card>

            {/* Negative Articles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Negative Articles
                  {digestData?.negativeArticles && digestData.negativeArticles.length > 0 && (
                    <Badge variant="destructive">{digestData.negativeArticles.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {digestData?.negativeArticles && digestData.negativeArticles.length > 0 ? (
                  <div className="space-y-3">
                    {digestData.negativeArticles.map((article, index) => (
                      <ArticleCard key={`neg-${article.Link}-${index}`} article={article} variant="negative" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No negative articles identified</p>
                )}
              </CardContent>
            </Card>

            {/* Risks and Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#0F2837]">
                  <TrendingUp className="h-5 w-5" />
                  Risks and Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risks */}
                <div>
                  <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Risks
                    {digestData?.risksAndOpportunities?.risks && digestData.risksAndOpportunities.risks.length > 0 && (
                      <Badge variant="destructive">{digestData.risksAndOpportunities.risks.length}</Badge>
                    )}
                  </h3>
                  {digestData?.risksAndOpportunities?.risks && digestData.risksAndOpportunities.risks.length > 0 ? (
                    <div className="space-y-3">
                      {digestData.risksAndOpportunities.risks.map((risk, index) => (
                        <RiskOpportunityCard key={`risk-${index}`} item={risk} type="risk" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No risks identified</p>
                  )}
                </div>

                {/* Opportunities */}
                <div>
                  <h3 className="font-semibold text-[#00573C] mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Opportunities
                    {digestData?.risksAndOpportunities?.opportunities && digestData.risksAndOpportunities.opportunities.length > 0 && (
                      <Badge className="bg-[#00573C]">{digestData.risksAndOpportunities.opportunities.length}</Badge>
                    )}
                  </h3>
                  {digestData?.risksAndOpportunities?.opportunities && digestData.risksAndOpportunities.opportunities.length > 0 ? (
                    <div className="space-y-3">
                      {digestData.risksAndOpportunities.opportunities.map((opp, index) => (
                        <RiskOpportunityCard key={`opp-${index}`} item={opp} type="opportunity" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No opportunities identified</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
