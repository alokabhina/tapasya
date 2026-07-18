// src/hooks/useMoney.js
// Data hook for the Money module — same "fetch on period change, expose
// derived data + CRUD" shape as hooks/useStats.js, but its own hook,
// its own state, zero shared code with study stats.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUserStore } from '@/store/userStore'
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction, getMoneyCategories,
  getQuickExpenses, addQuickExpense, deleteQuickExpense,
} from '@/api/money'
import { getTotals, mergeCategories } from '@/utils/money'
import { getStudyDayString } from '@/utils/time'

// period = { startDate, endDate }
export function useMoney(period = {}) {
  const uid = useUserStore((s) => s.uid)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories]     = useState([]) // custom categories, from server
  const [quickExpenses, setQuickExpenses] = useState([]) // one-tap presets ("Litti ₹20")
  const [loading, setLoading]           = useState(true)

  const prevKey = useRef(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = period
      const [txns, cats, quick] = await Promise.all([
        getTransactions({ startDate, endDate }),
        getMoneyCategories(),
        getQuickExpenses(),
      ])
      setTransactions(txns)
      setCategories(cats)
      setQuickExpenses(quick)
    } catch (err) {
      console.error('[useMoney] fetch error:', err)
      setTransactions([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(period)])

  useEffect(() => {
    if (!uid) return
    const key = JSON.stringify(period)
    if (key === prevKey.current) return
    prevKey.current = key
    fetchAll()
  }, [uid, JSON.stringify(period), fetchAll])

  const totals = getTotals(transactions)

  async function create(payload) {
    const saved = await addTransaction(payload)
    setTransactions((prev) => [saved, ...prev])
    return saved
  }

  async function edit(id, payload) {
    const saved = await updateTransaction(id, payload)
    setTransactions((prev) => prev.map((t) => (t._id === id ? saved : t)))
    return saved
  }

  async function remove(id) {
    await deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t._id !== id))
  }

  // One-tap log from a saved preset — "Litti ₹20" tap = instant transaction,
  // today's date, no form. Only appends to the visible list if the fetched
  // period actually includes today (Money.jsx always does; a fixed past
  // period on some other screen wouldn't, which is correct — the entry is
  // still saved either way).
  async function quickAdd(preset) {
    const saved = await addTransaction({
      type: preset.type,
      amount: preset.amount,
      category: preset.category,
      note: preset.label,
      date: getStudyDayString(),
    })
    if (saved.date >= (period.startDate || '') && saved.date <= (period.endDate || saved.date)) {
      setTransactions((prev) => [saved, ...prev])
    }
    return saved
  }

  async function savePreset(payload) {
    const saved = await addQuickExpense(payload)
    setQuickExpenses((prev) => [...prev, saved])
    return saved
  }

  async function removePreset(id) {
    await deleteQuickExpense(id)
    setQuickExpenses((prev) => prev.filter((q) => q._id !== id))
  }

  const expenseCategories = () => mergeCategories('expense', categories)
  const incomeCategories  = () => mergeCategories('income', categories)

  return {
    transactions, loading, totals,
    quickExpenses, quickAdd, savePreset, removePreset,
    expenseCategories, incomeCategories,
    create, edit, remove, refetch: fetchAll,
  }
}

export default useMoney