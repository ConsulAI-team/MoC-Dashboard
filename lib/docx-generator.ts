import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip,
  ExternalHyperlink,
} from "docx"
import type { DigestData, Article, RiskOpportunity } from "./types"

export type { DigestData, Article, RiskOpportunity }

const COLORS = {
  blue: "5b8bdc",       // Section headers
  black: "000000",
  linkBlue: "467885",
  red: "C00000",        // Negative Articles + Risks header
  orange: "BF6400",     // Opportunities header
  grey: "555555",       // Source lines
}

const FONTS = { body: "Times New Roman" }

const SIZES = {
  title: 24,           // 12pt – "Headlines, [date]"
  section: 24,         // 12pt – section headers
  subSection: 24,      // 12pt – subsection headers
  body: 24,            // 12pt – body text
}

const SPACING = {
  afterTitle: 240,
  afterSection: 120,
  afterSubSection: 100,
  betweenArticles: 160,
  afterBullet: 80,
}

function formatDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date()
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function title(dateStr: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `Headlines, ${dateStr}`,
        bold: true,
        font: FONTS.body,
        size: SIZES.title,
        color: COLORS.blue,
      }),
    ],
    spacing: { after: SPACING.afterTitle },
  })
}

function sectionHeader(text: string, color = COLORS.blue): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, font: FONTS.body, size: SIZES.section, color }),
    ],
    spacing: { before: 280, after: SPACING.afterSection },
  })
}

function subSectionHeader(text: string, color = COLORS.black): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, font: FONTS.body, size: SIZES.subSection, color }),
    ],
    spacing: { before: 160, after: SPACING.afterSubSection },
  })
}

function headlineBullet(text: string, color = COLORS.black): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `• ${text}`, font: FONTS.body, size: SIZES.body, color }),
    ],
    indent: { left: convertInchesToTwip(0.25) },
    spacing: { after: SPACING.afterBullet },
  })
}

function articleBullet(article: Article, textColor = COLORS.black): Paragraph[] {
  const text = article.Snippet || article.Title
  const children: (TextRun | ExternalHyperlink)[] = [
    new TextRun({ text: `• ${text}`, font: FONTS.body, size: SIZES.body, color: textColor }),
  ]

  if (article.Outlet) {
    children.push(new TextRun({ text: " (", font: FONTS.body, size: SIZES.body, color: textColor }))
    if (article.Link) {
      children.push(
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: article.Outlet,
              font: FONTS.body,
              size: SIZES.body,
              color: COLORS.linkBlue,
              underline: {},
            }),
          ],
          link: article.Link,
        })
      )
    } else {
      children.push(
        new TextRun({ text: article.Outlet, font: FONTS.body, size: SIZES.body, color: COLORS.linkBlue, italics: true })
      )
    }
    children.push(new TextRun({ text: ")", font: FONTS.body, size: SIZES.body, color: textColor }))
  }

  return [
    new Paragraph({
      children,
      indent: { left: convertInchesToTwip(0.25) },
      spacing: { after: SPACING.betweenArticles },
    }),
  ]
}

function riskOpportunityItem(item: RiskOpportunity): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: item.description, font: FONTS.body, size: SIZES.body, color: COLORS.black }),
      ],
      spacing: { after: 80 },
    })
  )

  if (item.source) {
    const sourceChildren: (TextRun | ExternalHyperlink)[] = [
      new TextRun({ text: "Source: ", bold: true, font: FONTS.body, size: SIZES.body, color: COLORS.black }),
    ]
    if (item.link) {
      sourceChildren.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: item.source, font: FONTS.body, size: SIZES.body, color: COLORS.linkBlue, underline: {} })],
          link: item.link,
        })
      )
    } else {
      sourceChildren.push(new TextRun({ text: item.source, font: FONTS.body, size: SIZES.body, color: COLORS.grey }))
    }
    paragraphs.push(new Paragraph({ children: sourceChildren, spacing: { after: 80 } }))
  }

  if (item.consideration) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Consideration: ", bold: true, font: FONTS.body, size: SIZES.body, color: COLORS.black }),
          new TextRun({ text: item.consideration, font: FONTS.body, size: SIZES.body, color: COLORS.black, italics: true }),
        ],
        spacing: { after: SPACING.betweenArticles },
      })
    )
  }

  return paragraphs
}

function addSubSection(
  out: Paragraph[],
  articles: Article[] | undefined,
  label: string,
  limit = 12
) {
  const list = articles?.slice(0, limit) ?? []
  if (list.length === 0) return
  out.push(subSectionHeader(label))
  list.forEach((a) => out.push(...articleBullet(a)))
}

export async function generateDocx(data: DigestData): Promise<Blob> {
  const out: Paragraph[] = []
  const dateStr = formatDate(data.generatedAt)

  // ── TITLE ──────────────────────────────────────────────────────────────────
  out.push(title(dateStr))

  // ── HEADLINES PAGE ─────────────────────────────────────────────────────────
  const saudiHeadlines: string[] = data.headlines?.saudiRegional ?? collectTitles(data.saudiRegional)
  if (saudiHeadlines.length > 0) {
    out.push(sectionHeader("Saudi Arabia/Regional"))
    saudiHeadlines.slice(0, 12).forEach((h) => out.push(headlineBullet(h)))
  }

  const negArticles = data.negativeArticles ?? []
  const negHeadlines: string[] = data.headlines?.negative ?? negArticles.map((a) => a.Title)
  if (negHeadlines.length > 0) {
    out.push(sectionHeader("Negative Articles"))
    negHeadlines.slice(0, 12).forEach((h) => out.push(headlineBullet(h, COLORS.red)))
  }

  const globalHeadlines: string[] = data.headlines?.global ?? collectTitles(data.global)
  if (globalHeadlines.length > 0) {
    out.push(sectionHeader("Global"))
    globalHeadlines.slice(0, 12).forEach((h) => out.push(headlineBullet(h)))
  }

  // ── SAUDI ARABIA/REGIONAL (DETAILED) ────────────────────────────────────────
  if (hasArticles(data.saudiRegional)) {
    out.push(sectionHeader("Saudi Arabia/Regional"))

    const sr = data.saudiRegional!
    const general = sr.general ?? []
    if (general.length > 0) {
      out.push(subSectionHeader("General"))
      general.slice(0, 12).forEach((a) => out.push(...articleBullet(a)))
    }

    addSubSection(out, sr.museums,      "Museums")
    addSubSection(out, sr.heritage,     "Heritage")
    addSubSection(out, sr.visualArts,   "Visual Arts")
    addSubSection(out, sr.film,         "Film")
    addSubSection(out, sr.music,        "Music")
    addSubSection(out, sr.fashion,      "Fashion")
    addSubSection(out, sr.literature,   "Literature, Publishing and Translation")
    addSubSection(out, sr.culinary,     "Culinary Arts")
    addSubSection(out, sr.theater,      "Theater and Performing Arts")
    addSubSection(out, sr.architecture, "Architecture and Design")
    addSubSection(out, sr.libraries,    "Libraries")
  }

  // ── NEGATIVE ARTICLES (DETAILED) ────────────────────────────────────────────
  out.push(sectionHeader("Negative Articles"))
  if (negArticles.length > 0) {
    negArticles.forEach((a) => out.push(...articleBullet(a, COLORS.red)))
  } else {
    out.push(new Paragraph({
      children: [new TextRun({ text: "No negative articles identified in this digest.", font: FONTS.body, size: SIZES.body, color: COLORS.grey, italics: true })],
      indent: { left: convertInchesToTwip(0.25) },
      spacing: { after: SPACING.betweenArticles },
    }))
  }

  // ── GLOBAL (DETAILED) ───────────────────────────────────────────────────────
  if (hasArticles(data.global)) {
    out.push(sectionHeader("Global"))

    const gl = data.global!
    const globalGeneral = gl.general ?? []
    if (globalGeneral.length > 0) {
      out.push(subSectionHeader("General"))
      globalGeneral.slice(0, 12).forEach((a) => out.push(...articleBullet(a)))
    }

    addSubSection(out, gl.museums,      "Museums")
    addSubSection(out, gl.heritage,     "Heritage")
    addSubSection(out, gl.visualArts,   "Visual Arts")
    addSubSection(out, gl.film,         "Film")
    addSubSection(out, gl.music,        "Music")
    addSubSection(out, gl.fashion,      "Fashion")
    addSubSection(out, gl.literature,   "Literature, Publishing and Translation")
    addSubSection(out, gl.culinary,     "Culinary Arts")
    addSubSection(out, gl.theater,      "Theater and Performing Arts")
    addSubSection(out, gl.architecture, "Architecture and Design")
    addSubSection(out, gl.libraries,    "Libraries")
  }

  // ── RISKS AND OPPORTUNITIES ─────────────────────────────────────────────────
  out.push(sectionHeader("Risks and Opportunities"))

  out.push(subSectionHeader("Risks", COLORS.red))
  if (data.risksAndOpportunities?.risks?.length) {
    data.risksAndOpportunities.risks.forEach((r) => out.push(...riskOpportunityItem(r)))
  } else {
    out.push(new Paragraph({
      children: [new TextRun({ text: "No risks identified in this digest.", font: FONTS.body, size: SIZES.body, color: COLORS.grey, italics: true })],
      indent: { left: convertInchesToTwip(0.25) },
      spacing: { after: SPACING.betweenArticles },
    }))
  }

  out.push(subSectionHeader("Opportunities", COLORS.orange))
  if (data.risksAndOpportunities?.opportunities?.length) {
    data.risksAndOpportunities.opportunities.forEach((o) => out.push(...riskOpportunityItem(o)))
  } else {
    out.push(new Paragraph({
      children: [new TextRun({ text: "No opportunities identified in this digest.", font: FONTS.body, size: SIZES.body, color: COLORS.grey, italics: true })],
      indent: { left: convertInchesToTwip(0.25) },
      spacing: { after: SPACING.betweenArticles },
    }))
  }

  // ── BUILD DOCUMENT ──────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONTS.body, size: SIZES.body } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: out,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

function collectTitles(section: Record<string, Article[] | undefined> | undefined): string[] {
  if (!section) return []
  const titles: string[] = []
  Object.values(section).forEach((arr) => {
    if (Array.isArray(arr)) arr.forEach((a) => titles.push(a.Title))
  })
  return titles
}

function hasArticles(section: Record<string, Article[] | undefined> | undefined): boolean {
  if (!section) return false
  return Object.values(section).some((arr) => Array.isArray(arr) && arr.length > 0)
}
