"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  X,
} from "lucide-react"
import {
  buildSerperSearchBatches,
  defaultConfig,
  loadConfig,
  saveConfig,
  saveDigestData,
} from "@/lib/config-store"
import {
  loadConfigFromSupabase,
  saveConfigToSupabase,
  saveDigestDataToSupabase,
  updateLastRunTime,
  isSupabaseConfigured,
} from "@/lib/supabase-store"
import type { ExcludedItem, SearchConfig } from "@/lib/types"

type ItemField = "outlets" | "excludedTerms" | "excludedSources"
type InputKey = "keyword" | "outlet" | "excludedTerm" | "excludedSource"

function createItem(value: string): ExcludedItem {
  return {
    id: `${Date.now()}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    value,
  }
}

function addUniqueString(items: string[], value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return items

  const exists = items.some((item) => item.toLowerCase() === trimmed.toLowerCase())
  return exists ? items : [...items, trimmed]
}

export default function SearchConfigPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [config, setConfig] = useState<SearchConfig>(defaultConfig)
  const [inputs, setInputs] = useState<Record<InputKey, string>>({
    keyword: "",
    outlet: "",
    excludedTerm: "",
    excludedSource: "",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Only try Supabase if configured, otherwise use localStorage
        if (isSupabaseConfigured()) {
          const supabaseConfig = await loadConfigFromSupabase()
          setConfig(supabaseConfig)
        } else {
          const savedConfig = loadConfig()
          setConfig(savedConfig)
        }
      } catch {
        // Fallback to localStorage
        const savedConfig = loadConfig()
        setConfig(savedConfig)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const updateInput = (key: InputKey, value: string) => {
    setInputs((previous) => ({ ...previous, [key]: value }))
  }

  const updateConfig = (updates: Partial<SearchConfig>) => {
    setConfig((previous) => ({ ...previous, ...updates }))
  }

  const addKeyword = () => {
    const value = inputs.keyword.trim()
    if (!value) return

    updateConfig({ keywords: addUniqueString(config.keywords, value) })
    updateInput("keyword", "")
  }

  const removeKeyword = (keyword: string) => {
    updateConfig({
      keywords: config.keywords.filter((item) => item.toLowerCase() !== keyword.toLowerCase()),
    })
  }

  const addItem = (field: ItemField, inputKey: InputKey) => {
    const value = inputs[inputKey].trim()
    if (!value) return

    const exists = config[field].some((item) => item.value.toLowerCase() === value.toLowerCase())
    if (!exists) {
      setConfig((previous) => ({
        ...previous,
        [field]: [...previous[field], createItem(value)],
      }))
    }

    updateInput(inputKey, "")
  }

  const removeItem = (field: ItemField, id: string) => {
    setConfig((previous) => ({
      ...previous,
      [field]: previous[field].filter((item) => item.id !== id),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const normalized = { ...config, writingStyle: config.summaryInstructions }
    
    // Save to localStorage for backward compatibility
    saveConfig(normalized)
    
    // Save to Supabase for persistence across users (only if configured)
    if (isSupabaseConfigured()) {
      try {
        await saveConfigToSupabase(normalized)
      } catch (error) {
        console.error('Failed to save to Supabase:', error)
      }
    }

    setTimeout(() => {
      setIsSaving(false)
      router.push("/")
    }, 300)
  }

  const handleRunNow = async () => {
    setIsSearching(true)
    setSearchError(null)
    try {
      const batches = buildSerperSearchBatches(config)

      if (batches.length === 0) {
        throw new Error('No keywords configured. Add keywords in the Keywords section first.')
      }

      // Collect all raw articles from every batch
      const allArticles: Array<{ title: string; link: string; snippet: string; date?: string; source?: string }> = []

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchIndex: batch.batchIndex, batch }),
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null)
          throw new Error(`Search failed for batch ${batch.batchIndex}: ${errorPayload?.error || `HTTP ${response.status}`}`)
        }

        const data = await response.json()
        for (const search of (data.searches ?? [])) {
          for (const result of (search.results ?? [])) {
            allArticles.push(result)
          }
        }

        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }
      }

      if (allArticles.length === 0) {
        throw new Error('Search returned no articles. Check your keywords and Serper API key.')
      }

      // Process and classify with OpenAI, then structure into DigestData
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: allArticles,
          digestPrompt: config.searchPrompts.digest,
        }),
      })

      if (!processResponse.ok) {
        const errorPayload = await processResponse.json().catch(() => null)
        throw new Error(`Processing failed: ${errorPayload?.error || `HTTP ${processResponse.status}`}`)
      }

      const { digestData, error: processError } = await processResponse.json()

      if (processError) throw new Error(processError)
      if (!digestData) throw new Error('No digest data returned from processing step.')

      // Replace old data and navigate to dashboard
      // Save to localStorage for backward compatibility
      saveDigestData(digestData)
      localStorage.setItem('moc-last-run-at', new Date().toISOString())
      
      // Save to Supabase for persistence across users (only if configured)
      if (isSupabaseConfigured()) {
        try {
          await saveDigestDataToSupabase(digestData)
          await updateLastRunTime()
        } catch (error) {
          console.error('Failed to save to Supabase:', error)
        }
      }
      
      router.push("/")
    } catch (error) {
      console.error('Run failed:', error)
      setSearchError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsSearching(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="text-foreground hover:bg-muted"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Search Configuration</h1>
                <p className="text-sm text-muted-foreground">Manage search categories and keywords</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Card className="rounded-lg py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-[#0F2837]" />
              Automated Search Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="time1" className="text-sm font-normal">
                Run daily at
              </Label>
              <Input
                id="time1"
                type="time"
                value={config.scheduleTime1}
                onChange={(event) => updateConfig({ scheduleTime1: event.target.value })}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">KSA</span>
              <Button
                onClick={handleRunNow}
                disabled={isSearching}
                className="ml-auto bg-[#0F2837] hover:bg-[#0F2837]/80"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isSearching ? "Searching..." : "Run Now"}
              </Button>
            </div>
            {searchError && (
              <p className="mt-2 text-sm text-destructive">{searchError}</p>
            )}
            {isSearching && (
              <p className="mt-2 text-sm text-muted-foreground">
                Fetching articles and processing with AI — this may take up to a minute…
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-lg py-5">
            <CardHeader className="px-5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-[#00573C]" />
                Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <StringEditor
                items={config.keywords}
                inputValue={inputs.keyword}
                onInputChange={(value) => updateInput("keyword", value)}
                onAdd={addKeyword}
                onRemove={removeKeyword}
                placeholder="Add keyword"
                emptyLabel="No keywords configured"
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg py-5">
            <CardHeader className="px-5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-[#00573C]" />
                Outlets
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <ItemEditor
                items={config.outlets}
                inputValue={inputs.outlet}
                onInputChange={(value) => updateInput("outlet", value)}
                onAdd={() => addItem("outlets", "outlet")}
                onRemove={(id) => removeItem("outlets", id)}
                placeholder="Add outlet domain"
                emptyLabel="No outlets configured"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-[#0F2837]" />
              Global Exclusions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 px-5 lg:grid-cols-2">
            <FieldBlock label="Excluded Terms">
              <ItemEditor
                items={config.excludedTerms}
                inputValue={inputs.excludedTerm}
                onInputChange={(value) => updateInput("excludedTerm", value)}
                onAdd={() => addItem("excludedTerms", "excludedTerm")}
                onRemove={(id) => removeItem("excludedTerms", id)}
                placeholder="Add excluded term"
                emptyLabel="No excluded terms configured"
              />
            </FieldBlock>

            <FieldBlock label="Excluded Outlets">
              <ItemEditor
                items={config.excludedSources}
                inputValue={inputs.excludedSource}
                onInputChange={(value) => updateInput("excludedSource", value)}
                onAdd={() => addItem("excludedSources", "excludedSource")}
                onRemove={(id) => removeItem("excludedSources", id)}
                placeholder="Add excluded outlet"
                emptyLabel="No excluded outlets configured"
              />
            </FieldBlock>
          </CardContent>
        </Card>

        <Card className="rounded-lg py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-[#0F2837]" />
              Search Prompts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <FieldBlock label="Digest Prompt">
              <Textarea
                value={config.searchPrompts.digest}
                onChange={(event) =>
                  updateConfig({
                    searchPrompts: { digest: event.target.value },
                  })
                }
                className="min-h-96 resize-y font-mono text-xs"
              />
            </FieldBlock>
          </CardContent>
        </Card>

      </main>
    </div>
  )
}

function FieldBlock({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="font-semibold">{label}</Label>
      {children}
    </div>
  )
}

function StringEditor({
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  emptyLabel,
}: {
  items: string[]
  inputValue: string
  onInputChange: (value: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
  placeholder: string
  emptyLabel: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex min-h-10 flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        ) : (
          items.map((item) => (
            <Badge key={item} variant="outline" className="max-w-full gap-1 whitespace-normal">
              <span className="break-all">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item}`}
                className="rounded-sm hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onAdd()
          }}
          placeholder={placeholder}
        />
        <Button variant="outline" size="icon" onClick={onAdd} aria-label={placeholder}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ItemEditor({
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  emptyLabel,
}: {
  items: ExcludedItem[]
  inputValue: string
  onInputChange: (value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  placeholder: string
  emptyLabel: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex min-h-10 flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        ) : (
          items.map((item) => (
            <Badge key={item.id} variant="outline" className="max-w-full gap-1 whitespace-normal">
              <span className="break-all">{item.value}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.value}`}
                className="rounded-sm hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onAdd()
          }}
          placeholder={placeholder}
        />
        <Button variant="outline" size="icon" onClick={onAdd} aria-label={placeholder}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

