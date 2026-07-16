// src/utils/money.js
// Aggregation + formatting helpers for the Money module. Deliberately its
// own file, separate from utils/stats.js (study data) — same "raw list
// in, chart-ready shape out" pattern, but zero overlap in data or code.

import { getNDaysFrom } from './time'

// ── Default categories (built-in, not stored on the server) ─────────────────
// Custom categories the user types get remembered server-side
// (MoneyCategory) and merged on top of these via mergeCategories().
export const DEFAULT_CATEGORIES = {
  expense: ['Food', 'Transport', 'Shopping', 'Bills & Rent', 'Education', 'Health', 'Entertainment', 'Other'],
  income:  ['Pocket Money', 'Salary', 'Freelance', 'Gift', 'Other'],
}

export function mergeCategories(type, customCats = []) {
  const defaults = DEFAULT_CATEGORIES[type] || []
  const customNames = customCats.filter((c) => c.type === type).map((c) => c.name)
  const all = [...defaults]
  customNames.forEach((name) => { if (!all.includes(name)) all.push(name) })
  return all
}

// ── Formatting ────────────────────────────────────────────────────────────────
// compact=true → ₹1.2K / ₹3.4L for summary cards; false → full ₹45,000
export function formatMoney(amount, compact = false) {
  const n = Math.round(amount || 0)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (compact && abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`
  if (compact && abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

// ── Totals ────────────────────────────────────────────────────────────────────
export function getTotals(transactions = []) {
  let income = 0, expense = 0
  transactions.forEach((t) => {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  })
  return { income, expense, balance: income - expense }
}

// ── Category breakdown — chart-ready [{ name, value, color }] ───────────────
const CATEGORY_COLORS = [
  '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

export function aggregateByCategory(transactions = [], type) {
  const map = {}
  transactions.filter((t) => t.type === type).forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount
  })
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
}

// ── Income vs expense trend ───────────────────────────────────────────────────
// Chart-ready [{ date, label, income, expense }]. Buckets by DAY when the
// range is <=31 days (Week/Month view), else by MONTH (All Time view) —
// keeps the bar chart readable either way instead of rendering hundreds
// of daily bars.
function daysBetween(startDate, endDate) {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const s = new Date(sy, sm - 1, sd)
  const e = new Date(ey, em - 1, ed)
  return Math.round((e - s) / 86400000)
}

function monthsBetween(startDate, endDate) {
  const [sy, sm] = startDate.split('-').map(Number)
  const [ey, em] = endDate.split('-').map(Number)
  const months = []
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return months
}

export function aggregateTrend(transactions = [], startDate, endDate) {
  const span = daysBetween(startDate, endDate)

  if (span <= 31) {
    const map = {}
    transactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = { income: 0, expense: 0 }
      map[t.date][t.type] += t.amount
    })
    return getNDaysFrom(startDate, span + 1).map((date) => {
      const d = new Date(date + 'T12:00:00')
      return {
        date,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        income: map[date]?.income || 0,
        expense: map[date]?.expense || 0,
      }
    })
  }

  const map = {}
  transactions.forEach((t) => {
    const monthKey = t.date.slice(0, 7) // "YYYY-MM"
    if (!map[monthKey]) map[monthKey] = { income: 0, expense: 0 }
    map[monthKey][t.type] += t.amount
  })
  return monthsBetween(startDate, endDate).map((monthKey) => {
    const [y, m] = monthKey.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return {
      date: monthKey,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      income: map[monthKey]?.income || 0,
      expense: map[monthKey]?.expense || 0,
    }
  })
}

// ── Group transactions by date for the list view — newest date first ────────
export function groupByDate(transactions = []) {
  const groups = {}
  transactions.forEach((t) => {
    if (!groups[t.date]) groups[t.date] = []
    groups[t.date].push(t)
  })
  return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1))
}