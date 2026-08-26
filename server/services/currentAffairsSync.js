// server/services/currentAffairsSync.js
// Shared logic used by both routes/cronCurrentAffairs.js (Vercel Cron —
// production only) and the admin "Fetch Now" button in routes/currentAffairs.js
// (works from local dev too, since it's a normal authenticated request, not
// something only Vercel's infra can trigger).
import CurrentAffair from '../models/CurrentAffair.js'
import { fetchAllFeeds } from '../utils/rssFetcher.js'
import { guessTags, toMonthKey, isNoise, normalizeHeadline } from '../utils/caCategorizer.js'

export async function syncCurrentAffairsFromFeeds() {
  const fetched = await fetchAllFeeds()
  let inserted = 0, skipped = 0, filteredNoise = 0

  // Pull recent normalized headlines once up front (last 60 days is plenty)
  // instead of a DB round-trip per item — used to catch the same story
  // reprinted with a different URL across sources.
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const recent = await CurrentAffair.find({ date: { $gte: cutoff } }).select('headline')
  const seenHeadlines = new Set(recent.map((r) => normalizeHeadline(r.headline)))

  for (const item of fetched) {
    if (isNoise(item)) { filteredNoise++; continue }

    const exists = await CurrentAffair.findOne({ dedupeKey: item.dedupeKey })
    if (exists) { skipped++; continue }

    const normalized = normalizeHeadline(item.headline)
    if (seenHeadlines.has(normalized)) { skipped++; continue }
    seenHeadlines.add(normalized)

    const tags = guessTags(item)
    await CurrentAffair.create({
      headline: item.headline,
      oneLiner: item.oneLiner,
      date: item.date,
      month: toMonthKey(item.date),
      category: tags.category,
      source: item.source,
      sourceUrl: item.sourceUrl,
      entity: tags.entity,
      action: tags.action,
      value: tags.value,
      blankableFact: tags.blankableFact,
      addedBy: 'cron',
      dedupeKey: item.dedupeKey,
    })
    inserted++
  }

  return { fetched: fetched.length, inserted, skipped, filteredNoise }
}