// Types matching the n8n workflow output structure

export interface Article {
  Outlet: string
  Title: string
  Snippet: string
  Link: string
  Date?: string
  sentiment?: "positive" | "negative" | "neutral"
  Category?: string
  isTier1?: boolean
}

export interface RiskOpportunity {
  title: string
  description: string
  source?: string
  link?: string
  consideration?: string
}

export interface BroaderTrends {
  peaking?: string[]
  emerging?: string[]
  legacy?: string[]
}

// This matches the exact structure from the n8n AI Agent3 output
export interface DigestData {
  generatedAt: string

  nationalGeneral?: Article[]
  nationalSectors?: {
    Museums?: Article[]
    Music?: Article[]
    Film?: Article[]
    Fashion?: Article[]
    Heritage?: Article[]
    VisualArts?: Article[]
    Architecture?: Article[]
    Culinary?: Article[]
    Literature?: Article[]
    Theater?: Article[]
    Libraries?: Article[]
  }
  international?: {
    "Europe & Transcontinental"?: Article[]
    "The Americas"?: Article[]
    "Asia & Others"?: Article[]
  }
  broaderTrends?: BroaderTrends
  insights?: string[]
  // For backward compatibility with existing structure
  headlines?: {
    saudiRegional?: string[]
    negative?: string[]
    global?: string[]
  }
  saudiRegional?: {
    general?: Article[]
    museums?: Article[]
    heritage?: Article[]
    visualArts?: Article[]
    film?: Article[]
    music?: Article[]
    fashion?: Article[]
    literature?: Article[]
    culinary?: Article[]
    theater?: Article[]
    architecture?: Article[]
    libraries?: Article[]
  }
  negativeArticles?: Article[]
  global?: {
    general?: Article[]
    museums?: Article[]
    heritage?: Article[]
    visualArts?: Article[]
    film?: Article[]
    music?: Article[]
    fashion?: Article[]
    literature?: Article[]
    culinary?: Article[]
    theater?: Article[]
    architecture?: Article[]
    libraries?: Article[]
  }
  risksAndOpportunities?: {
    risks?: RiskOpportunity[]
    opportunities?: RiskOpportunity[]
  }
}

// Search Configuration Types
export interface SearchCategory {
  id: string
  name: string
  group: string
  keywords: string[]
  isActive: boolean
  prompt?: string
  arabicName?: string
  classificationKey?: string
  outputPath?: string
}

export interface ExcludedItem {
  id: string
  value: string
}

export interface SearchPromptConfig {
  digest: string
}

export interface SearchConfig {
  keywords: string[]
  outlets: ExcludedItem[]
  categories: SearchCategory[]
  excludedTerms: ExcludedItem[]
  excludedSources: ExcludedItem[]
  executiveSummary: string
  summaryInstructions: string
  writingStyle: string
  summaryTags: string[]
  scheduleTime1: string
  sectorArticleLimit: number
  globalArticleLimit: number
  searchRegion: string
  searchPages: number[]
  searchBatchSize: number
  searchDateFilter: string
  autocorrect: boolean
  searchPrompts: SearchPromptConfig
}
