# Logic:
Run Now btn → Serper searches → collect all articles → OpenAI filter+classify → OpenAI structure into DigestData → save to localStorage → navigate to dashboard → data shows. Every new run replaces the old data (both on dashboard and in DOCX export since that reads the same data state).

*Main Generation Function*
The generateDocx() function:
Creates a sections array - Stores all paragraph elements
Formats the date - Converts ISO date to readable format (e.g., "09 May 2026")

*Builds the document structure:*
[TITLE SECTION]
├─ Main title: "MoC Daily Cultural Digest"
└─ Subtitle: "Headlines, [date]"

[HEADLINES SUMMARY]
├─ Saudi Arabia/Regional Headlines (up to 12 items)
├─ Negative Articles Headlines (up to 12 items)
└─ Global Headlines (up to 12 items)

[DETAILED CONTENT]
├─ Saudi Arabia/Regional Section
│  ├─ General (max 2 articles)
│  ├─ Literature, Publishing and Translation - Fashion - Film - Heritage -Architecture and Design - Visual Arts - Museums - Theater and Performing Arts - Libraries - Music - Culinary Arts(max 2 articles per each commission)
│
│
├─ Negative Articles (all with sentiment flag)
│
└─ Global Section
   ├─ General (max 12 articles)
   ├─ Literature, Publishing and Translation - Fashion - Film - Heritage -Architecture and Design - Visual Arts - Museums - Theater and Performing Arts - Libraries - Music - Culinary Arts (max 2 articles per each commission)

[RISKS & OPPORTUNITIES]
├─ Risks Section
└─ Opportunities Section

*Article Processing*
For each article, the code:
- Extracts snippet or title as bullet point text
- Adds outlet as hyperlink in parentheses with clickable link to source
- Applies sentiment styling - Red color for negative articles
Example article formatting: • [Snippet text] (Outlet Name hyperlinked to the article)

*Styling & Formatting*
The document uses:

Fonts: Times New Roman (Headings CS)
Colors:
#4a86e8 for sections
#0000 for headers
#C00000 (red) for negative articles
#467885 (blue) for hyperlinks
Margins: 1 inch on all sides
Font sizes: 24pt title, 13pt section headers, 10pt body text

## Search Functionality

The application uses the **Serper Google News API** to fetch articles. To enable searching:

### 1. Search Process
1. **Configuration**: Keywords and settings are configured in the admin panel (`/config`)
2. **Batch Creation**: `buildSerperSearchBatches()` creates search batches based on:
   - Keywords × Pages × Categories
   - Batch size limits API calls
3. **API Execution**: `/api/search` endpoint calls Serper API for each batch
4. **Processing**: Articles are filtered, classified, and structured using AI prompts
5. **Storage**: Results are saved locally and can be exported to DOCX

### 4. Search Parameters
- **Region**: `sa` (Saudi Arabia) by default
- **Date Filter**: `qdr:d` (past 24 hours) by default
- **Pages**: 1-2 pages per keyword
- **Batch Size**: 10 searches per batch

### 5. Automated Search Schedule
- **Frequency**: Once per day by default
- **Time**: Configurable in admin panel (default: 08:00 KSA)
- **Manual Execution**: Click "Run Now" button in `/config` to execute search immediately

### 6. Initial Keywords
The app comes pre-configured with comprehensive MOC-related keywords:
- Ministry of Culture terms (English & Arabic)
- Cultural commission names
- Saudi cultural sectors
- Global cultural terms

### 7. Testing Search
```bash
# Test the search API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"batchIndex": 1}'
```

# Development

## Project Structure
```
├── app/
│   ├── api/search/route.ts    # Search API endpoint
│   ├── config/page.tsx        # Admin configuration panel
│   └── page.tsx              # Main dashboard
├── components/
│   ├── digest-dashboard.tsx  # Main dashboard component
│   ├── search-executor.tsx   # Search execution UI
│   └── export-docx-button.tsx # DOCX export functionality
├── lib/
│   ├── config-store.ts       # Configuration management
│   ├── docx-generator.ts     # DOCX document generation
│   ├── serper-api.ts         # Serper API client
│   └── types.ts              # TypeScript type definitions
└── .env.example              # Environment variables template
```