// server/utils/mockStats.js
// Pure aggregation helpers for the mock-exam dashboard — kept out of
// routes/mockExams.js to keep that file thin (same pattern as utils/youtube.js).

// Score + accuracy over time, oldest → newest, for the trend chart.
export function buildTrend(attempts) {
  return [...attempts]
    .sort((a, b) => new Date(a.attemptedOn) - new Date(b.attemptedOn))
    .map((a) => ({
      date: a.attemptedOn,
      mode: a.mode,
      title: a.title,
      score: a.overall?.score ?? null,
      maxScore: a.overall?.maxScore ?? null,
      accuracy: a.overall?.accuracy ?? null,
    }))
}

// Average accuracy per section name, across ALL attempts (full + sectional
// both contribute their section-level data — this is section-level, not
// full-vs-sectional comparison, so mixing here is intentional and correct).
export function buildSubjectAccuracy(attempts) {
  const bySection = new Map() // name -> { sum, count }
  for (const a of attempts) {
    for (const s of a.sections || []) {
      if (s.accuracy == null) continue
      const entry = bySection.get(s.sectionName) || { sum: 0, count: 0 }
      entry.sum += s.accuracy
      entry.count += 1
      bySection.set(s.sectionName, entry)
    }
  }
  return [...bySection.entries()]
    .map(([sectionName, { sum, count }]) => ({ sectionName, avgAccuracy: +(sum / count).toFixed(1), attempts: count }))
    .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
}

// Topic-level rollup across every section of every attempt — averages
// correctPct per topic name, so recurring weak spots surface clearly.
function buildTopicRollup(attempts) {
  const byTopic = new Map() // "sectionName::topicName" -> { sectionName, name, sum, count }
  for (const a of attempts) {
    for (const s of a.sections || []) {
      for (const t of s.topics || []) {
        if (t.correctPct == null) continue
        const key = `${s.sectionName}::${t.name}`
        const entry = byTopic.get(key) || { sectionName: s.sectionName, name: t.name, sum: 0, count: 0 }
        entry.sum += t.correctPct
        entry.count += 1
        byTopic.set(key, entry)
      }
    }
  }
  return [...byTopic.values()].map((e) => ({
    sectionName: e.sectionName,
    name: e.name,
    avgCorrectPct: +(e.sum / e.count).toFixed(1),
    seen: e.count,
  }))
}

export function buildWeakTopics(attempts, limit = 8) {
  return buildTopicRollup(attempts).sort((a, b) => a.avgCorrectPct - b.avgCorrectPct).slice(0, limit)
}

export function buildStrongTopics(attempts, limit = 8) {
  return buildTopicRollup(attempts).sort((a, b) => b.avgCorrectPct - a.avgCorrectPct).slice(0, limit)
}

export function buildSummaryStats(attempts) {
  const scores = attempts.map((a) => a.overall?.score).filter((v) => v != null)
  const accuracies = attempts.map((a) => a.overall?.accuracy).filter((v) => v != null)
  return {
    totalAttempts: attempts.length,
    fullAttempts: attempts.filter((a) => a.mode === 'full').length,
    sectionalAttempts: attempts.filter((a) => a.mode === 'sectional').length,
    bestScore: scores.length ? Math.max(...scores) : null,
    avgScore: scores.length ? +(scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1) : null,
    avgAccuracy: accuracies.length ? +(accuracies.reduce((s, v) => s + v, 0) / accuracies.length).toFixed(1) : null,
  }
}