// useDragReorder.js
// A small, dependency-free "grab the handle and drag up/down to reorder"
// hook. Built on Pointer Events so it works the same with mouse AND touch
// (unlike native HTML5 drag-and-drop, which touch browsers support badly).
//
// Usage:
//   const { orderedItems, dragIndex, dragHandleProps, itemRef } =
//     useDragReorder({ items: NAV_ITEMS, getId: (i) => i.to, storageKey: 'sidebarOrder' })
//
//   orderedItems.map((item, i) => (
//     <div key={getId(item)} ref={itemRef(i)} data-reorder-index={i}>
//       <span {...dragHandleProps(i)}>⠿</span>
//       ...
//     </div>
//   ))
//
// How it works: on pointerdown on the handle we remember which index is
// being dragged. On every pointermove we ask the browser which DOM element
// is currently under the finger/cursor (elementFromPoint), walk up to the
// nearest [data-reorder-index], and if that's a different item than the one
// we started on, we swap them in the array right away — a classic
// Trello-style "items shuffle live as you drag over them" reorder, with no
// extra animation library needed. On pointerup the new order is written to
// localStorage so it persists across visits/reloads.

import { useCallback, useEffect, useRef, useState } from 'react'

export function useDragReorder({ items, getId, storageKey }) {
  // Defensive: if items isn't ready yet (e.g. still loading from a store,
  // or briefly undefined during an offline/online transition), don't crash
  // the whole page — just render nothing to reorder until it shows up.
  const safeItems = Array.isArray(items) ? items : []
  const idsFromItems = safeItems.map(getId)

  const [order, setOrder] = useState(() => {
    if (!storageKey) return idsFromItems
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (!Array.isArray(saved)) return idsFromItems
      // Keep only ids that still exist, in the saved order, then append any
      // brand-new items (e.g. a new nav link added in a later app update)
      // at the end so nothing is ever silently hidden.
      const known = new Set(idsFromItems)
      const kept = saved.filter((id) => known.has(id))
      const missing = idsFromItems.filter((id) => !kept.includes(id))
      return [...kept, ...missing]
    } catch {
      return idsFromItems
    }
  })

  // If the underlying item list changes shape (new page added/removed),
  // reconcile without losing the user's saved order.
  useEffect(() => {
    setOrder((prev) => {
      const known = new Set(idsFromItems)
      const kept = prev.filter((id) => known.has(id))
      const missing = idsFromItems.filter((id) => !kept.includes(id))
      const next = [...kept, ...missing]
      const same = next.length === prev.length && next.every((id, i) => id === prev[i])
      return same ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsFromItems.join('|')])

  const byId = new Map(safeItems.map((it) => [getId(it), it]))
  const orderedItems = order.map((id) => byId.get(id)).filter(Boolean)

  const [dragId, setDragId] = useState(null)
  const orderRef = useRef(order)
  orderRef.current = order
  const itemRefs = useRef(new Map())

  function itemRef(id) {
    return (el) => {
      if (el) itemRefs.current.set(id, el)
      else itemRefs.current.delete(id)
    }
  }

  const persist = useCallback((next) => {
    if (!storageKey) return
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* storage unavailable — reorder still works this session */ }
  }, [storageKey])

  function handleMove(clientX, clientY, draggingId) {
    const el = document.elementFromPoint(clientX, clientY)
    const target = el?.closest?.('[data-reorder-id]')
    const targetId = target?.getAttribute('data-reorder-id')
    if (!targetId || targetId === draggingId) return
    setOrder((prev) => {
      const from = prev.indexOf(draggingId)
      const to = prev.indexOf(targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, draggingId)
      return next
    })
  }

  function dragHandleProps(id) {
    return {
      onPointerDown: (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragId(id)
        const onMove = (ev) => handleMove(ev.clientX, ev.clientY, id)
        const onUp = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
          setDragId(null)
          persist(orderRef.current)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      },
      style: { touchAction: 'none', cursor: 'grab' },
    }
  }

  return { orderedItems, dragId, dragHandleProps, itemRef }
}