// server/utils/rssFetcher.js
// Fetches + parses free, official RSS feeds — no API key, no paid tier,
// no rate limit beyond being a polite once-a-day fetch. Sources chosen
// specifically for Banking exam GA relevance (see planning discussion):
// RBI for banking/monetary-policy facts (the single highest-yield bucket),
// PIB for national/appointments/schemes, plus a couple of finance-focused
// publisher feeds for broader coverage. Every source here publishes its
// own public RSS feed — nothing is scraped off a page that doesn't want it.
import Parser from 'rss-parser'

const parser = new Parser({ timeout: 15000 })

export const FEEDS = [
  { source: 'RBI',   url: 'https://www.rbi.org.in/pressreleases_rss.xml',       defaultCategory: 'RBI' },
  { source: 'RBI',   url: 'https://www.rbi.org.in/notifications_rss.xml',       defaultCategory: 'Banking' },
  { source: 'PIB',   url: 'https://www.pib.gov.in/ViewRss.aspx?reg=1&lang=1',   defaultCategory: 'National' },
  { source: 'Economic Times', url: 'https://economictimes.indiatimes.com/industry/banking/finance/banking/rssfeeds/13358319.cms', defaultCategory: 'Banking' },
  { source: 'LiveMint', url: 'https://www.livemint.com/rss/money',              defaultCategory: 'Economy' },
]

// Returns a flat list of { headline, oneLiner, sourceUrl, source, date,
// defaultCategory, dedupeKey }. Never throws for a single bad feed — a
// feed being down shouldn't block the others from updating.
export async function fetchAllFeeds() {
  const results = []
  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const item of parsed.items || []) {
        const link = item.link || item.guid
        if (!link) continue
        const oneLiner = stripHtml(item.contentSnippet || item.summary || item.title || '').slice(0, 300)
        results.push({
          headline: (item.title || '').trim(),
          oneLiner,
          sourceUrl: link,
          source: feed.source,
          date: item.isoDate ? new Date(item.isoDate) : new Date(),
          defaultCategory: feed.defaultCategory,
          dedupeKey: link,
        })
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`RSS fetch failed for ${feed.source} (${feed.url}):`, e.message)
    }
  }
  return results
}

function stripHtml(str) {
  return String(str).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}
