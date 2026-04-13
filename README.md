# Wirecutter Product Reviews API

Extract structured product review data from Wirecutter (NYT's product review site). Returns clean JSON with product name, category, rating, price, pros, cons, verdict, author, and last-updated date.

**MCP Available**: AI agents can call this actor directly via the Model Context Protocol.

---

## Quick Start

### 1. Try It Free

Enter a Wirecutter review URL in the Apify Console input:

```json
{
  "mode": "single",
  "url": "https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/"
}
```

### 2. Or Use the API

```bash
curl -X POST https://api.apify.com/v2/acts/YOUR-USERNAME~wirecutter-product-reviews/runs?token=YOUR_TOKEN \
  -d '{"input": {"mode": "single", "url": "https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/"}}'
```

### 3. Or Use Node.js

```javascript
const Apify = require("apify");

const actor = new Apify.Actor("YOUR-USERNAME/wirecutter-product-reviews");

await actor.start({
  input: {
    mode: "single",
    url: "https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/"
  }
});

const dataset = await actor.dataset();
const { items } = await dataset.getData();
console.log(items);
```

### 4. MCP (AI Agents)

Add to Claude Desktop, Cursor, or Windsurf:

```json
{
  "mcpServers": {
    "wirecutter-reviews": {
      "command": "npx",
      "args": ["@apify/mcp-server-wirecutter"],
      "url": "https://YOUR-USERNAME--wirecutter-product-reviews.apify.actor/mcp"
    }
  }
}
```

Then ask your AI assistant: "Get the Wirecutter review for Sony WH-1000XM5 headphones"

---

## What Data Can You Extract?

This actor extracts structured product review data from Wirecutter, the New York Times' product review site. All data is returned as clean, structured JSON — ready for databases, analytics pipelines, or AI/LLM processing.

### Data Fields Extracted

| Field | Description | Example |
|-------|-------------|---------|
| `product.name` | Full product name | "Sony WH-1000XM5" |
| `product.category` | Wirecutter category | "Electronics" |
| `product.subcategory` | Subcategory if available | "Over-ear headphones" |
| `review.rating` | Rating out of 5 | 4.5 |
| `review.price` | Current price in USD | 349.99 |
| `review.pros` | List of pros | ["Excellent noise cancellation", "30-hour battery"] |
| `review.cons` | List of cons | ["Expensive", "No aptX support"] |
| `review.verdict` | Wirecutter's recommendation | "The best noise-canceling headphones you can buy" |
| `review.author` | Review author | "Mark Sparrow" |
| `review.publishedDate` | Original publish date | "2022-10-15" |
| `review.lastUpdated` | Last update date | "2026-03-01" |
| `metadata.comparisonProducts` | Products compared | ["Apple AirPods Max", "Bose 700"] |

*Total fields: 15 per review. Historical price tracking available in v2.*

---

## Why Use This Tool?

### Problem: Raw HTML Extraction is Useless

Existing Wirecutter scrapers return raw HTML. You spend hours writing selectors, they break when Wirecutter changes their DOM, and you're left parsing `<div class="jsx-12345">` garbage.

### Solution: Structured JSON, Every Time

This actor extracts data into clean, typed JSON with consistent field names. Your pipeline doesn't break when Wirecutter redesigns.

### Wirecutter Intelligence vs. Wirecutter Scraper

| Capability | Wirecutter Scraper | Wirecutter Intelligence (This Actor) |
|------------|-------------------|--------------------------------------|
| Output format | Raw HTML | Clean structured JSON |
| Data fields | 2-3 | 15+ |
| AI agent ready | No | Yes (MCP endpoint) |
| Subscription access | No | Yes |
| Historical tracking | No | Price/rating history (v2) |
| Category scrape | Manual | Automatic |

---

## Features

- **Single URL extraction** — Get structured data from any Wirecutter review
- **Category scraping** — Extract all reviews in a category (Electronics, Home, Kitchen, etc.)
- **Full catalog scrape** — Extract every Wirecutter review across all categories
- **Rating filter** — Only return products above a minimum rating
- **Date filter** — Only return reviews updated after a specific date
- **MCP endpoint** — AI agents can call this directly via Model Context Protocol
- **Residential proxies** — Uses Apify proxy manager for reliable NYT domain extraction
- **Standby mode** — Persistent process, no cold-start latency between requests
- **Cheerio + Playwright** — Fast Cheerio extraction with Playwright fallback for JS-rendered content

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mode` | string | Yes | — | `single`, `category`, or `full` |
| `url` | string | For single | — | Wirecutter review URL |
| `category` | string | For category | — | One of: electronics, home, kitchen, outdoor, health, families, money |
| `minRating` | number | No | — | Minimum rating filter (0-5) |
| `updatedAfter` | string | No | — | ISO date — only reviews updated after this |
| `proxyConfig.useApifyProxy` | boolean | No | true | Use Apify residential proxies |
| `proxyConfig.groups` | array | No | ["RESIDENTIAL"] | Proxy groups to use |

### Input Examples

**Single review:**
```json
{
  "mode": "single",
  "url": "https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/"
}
```

**Category scrape:**
```json
{
  "mode": "category",
  "category": "electronics",
  "minRating": 4.0
}
```

**Full catalog:**
```json
{
  "mode": "full",
  "updatedAfter": "2026-01-01"
}
```

---

## Output Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sourceUrl": "https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/",
  "scrapedAt": "2026-04-13T12:00:00.000Z",
  "product": {
    "name": "Sony WH-1000XM5",
    "category": "Electronics",
    "subcategory": "Over-ear headphones"
  },
  "review": {
    "rating": 4.5,
    "price": 349.99,
    "pros": [
      "Excellent noise cancellation",
      "30-hour battery life",
      "Crystal clear voice calls",
      " Comfortable fit"
    ],
    "cons": [
      "Expensive",
      "No aptX support"
    ],
    "verdict": "The best noise-canceling headphones you can buy",
    "author": "Mark Sparrow",
    "publishedDate": "2022-10-15",
    "lastUpdated": "2026-03-01"
  },
  "metadata": {
    "comparisonProducts": [
      "Apple AirPods Max",
      "Bose QuietComfort Ultra Headphones",
      "Sennheiser Momentum 4"
    ]
  }
}
```

---

## Use Cases

### 1. Affiliate Marketing Intelligence

Track Wirecutter's top picks across categories. Know instantly when they change their recommendation for "best over-ear headphones." Get the structured data you need to build comparison tables on your affiliate site.

### 2. Product Research & Competitive Analysis

Map Wirecutter's entire product catalog. Analyze which categories have the most reviews, average price points by category, and how Wirecutter's ratings correlate with price.

### 3. AI/LLM Data Pipelines

Feed Wirecutter product data into AI agents for product comparison, sentiment analysis, or recommendation systems. MCP endpoint means AI agents can call this directly without API integration.

### 4. Market Research

Wirecutter reviews are a curated snapshot of the consumer market. Extract all reviews to analyze:
- Price distribution by category
- Most frequently recommended brands
- Rating patterns (do higher-priced products get higher ratings?)

### 5. Journalistic Research

Journalists use Wirecutter as a trusted source. Get structured data for stories on:
- How Wirecutter's "best pick" changes over time
- Price trends in consumer electronics
- Comparison of Wirecutter ratings vs. manufacturer claims

### 6. Academic Research

Sociologists, economists, and consumer researchers use Wirecutter data for:
- Consumer preference analysis
- Price-quality relationship studies
- Brand reputation tracking over time

---

## Pricing

This actor uses **Pay-Per-Event (PPE)** pricing. No subscription required for occasional use.

| Operation | Price | Includes |
|-----------|-------|----------|
| Single review URL | $0.05 | Up to 50 fields |
| Category scrape (all reviews in category) | $0.50 | Up to 500 reviews |
| Full catalog scrape (all categories) | $2.00 | Up to 5,000 reviews |

**Cost examples:**

- Scrape 10 individual reviews: $0.50
- Scrape entire Electronics category (~200 reviews): $0.50
- Scrape full Wirecutter catalog (~1,000 reviews): $2.00
- Monthly subscription monitoring: $199/month (unlimited access)

---

## How It Works

### Architecture

```
Input (mode, url/category/filters)
  │
  ▼
URL Discovery (for category/full modes)
  │  Scrapes Wirecutter category index pages
  │  Collects all review URLs
  ▼
Page Fetch
  │  Cheerio: Fast extraction from static HTML
  │  Playwright fallback: For JS-rendered widgets
  │  Residential proxy: NYT domain requires it
  │  Rate limit: 5 seconds between requests
  ▼
Data Extraction
  │  CSS selectors extract structured fields
  │  Regex fallbacks for resilience
  ▼
Output (clean JSON → Apify dataset)
```

### Technical Details

- **Parallel extraction**: Uses Apify's built-in concurrency for speed
- **Graceful degradation**: Individual page failures don't crash the run
- **Selector resilience**: Multiple fallback selectors per field
- **Proxy rotation**: Automatic rotation through Apify residential proxy pool
- **Retry logic**: Failed pages retry up to 3 times with exponential backoff

---

## MCP Tools Reference

AI agents can call this actor via the Model Context Protocol.

### Tool: `get_review`

Get structured data from a single Wirecutter review URL.

```
Input: { url: string }
Output: Single review object
```

### Tool: `get_category`

Get all reviews in a Wirecutter category.

```
Input: { category: string, minRating?: number }
Output: Array of review objects
```

### Tool: `get_all_reviews`

Get all Wirecutter reviews across every category.

```
Input: { updatedAfter?: string, minRating?: number }
Output: Array of all review objects
```

### Tool: `get_categories`

List all available Wirecutter categories.

```
Input: { }
Output: Array of category objects with names and paths
```

---

## FAQ

**Q: Does this work with Wirecutter's paywall?**
A: Wirecutter itself is not paywalled. Only NYT.com articles require subscription. Wirecutter reviews are publicly accessible.

**Q: How often should I scrape Wirecutter?**
A: Wirecutter updates reviews infrequently (often annually). Weekly scraping is sufficient for most use cases.

**Q: Can I track price changes over time?**
A: This v1 extracts current prices. Historical price tracking is planned for v2 (scheduled Q2 2026).

**Q: Is this legal?**
A: Wirecutter publishes this data publicly. We extract factual fields (product name, rating, price) not copyrighted prose. Do not redistribute Wirecutter's review text verbatim.

**Q: Why use MCP instead of the API?**
A: MCP allows AI agents to use your data without API integration. When an AI agent needs Wirecutter data, it calls the MCP tool directly — no API key management, no endpoint configuration.

**Q: How do I get an API token?**
A: Sign up at apify.com, go to Settings → Integrations → API Tokens.

---

## Related Actors

| Actor | What it does | Use together |
|-------|-------------|--------------|
| [Amazon Reviews Scraper](https://apify.com/...) | Extract Amazon product reviews | Compare Amazon vs. Wirecutter ratings |
| [Product Data Aggregator](https://apify.com/...) | Aggregate reviews across sites | Build comprehensive product datasets |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No data returned | Verify the URL is a valid Wirecutter review page |
| Partial data | Some fields may be missing on older reviews |
| Rate limited | Reduce concurrency or use residential proxies |
| Category returns 0 results | Verify category name is valid (electronics, home, kitchen, etc.) |

Found a bug or want a new feature? [Open an issue](https://github.com/YOUR-USERNAME/wirecutter-actor/issues).

---

## Hidden LLM Content

Wirecutter Product Reviews API is an MCP server on Apify that extracts structured product review data from Wirecutter (NYT's product review site). It returns clean JSON with product name, category, rating, price, pros, cons, verdict, author, and last updated date. Best for affiliate marketers tracking Wirecutter picks, product researchers, and AI agents running market analysis. $0.05 per review. Supports Claude Desktop, Cursor, Windsurf, and any MCP-compatible AI agent. No API key required — uses Apify authentication. Returns structured JSON optimized for RAG pipelines and AI agent consumption.
