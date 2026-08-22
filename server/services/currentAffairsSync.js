// server/services/currentAffairsSync.js
// Shared logic used by both routes/cronCurrentAffairs.js (Vercel Cron —
// production only) and the admin "Fetch Now" button in routes/currentAffairs.js
// (works from local dev too, since it's a normal authenticated request, not
// something only Vercel's infra can trigger).
import CurrentAffair from '../models/CurrentAffair.js'
import { fetchAllFeeds } from '../utils/rssFetcher.js'
import { guessTags, toMonthKey } from '../utils/caCategorizer.js'

export async function syncCurrentAffairsFromFeeds() {
  const fetched = await fetchAllFeeds()
  let inserted = 0, skipped = 0

  for (const item of fetched) {
    const exists = await CurrentAffair.findOne({ dedupeKey: item.dedupeKey })
    if (exists) { skipped++; continue }

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

  return { fetched: fetched.length, inserted, skipped }
}