// src/components/ui/Toast.jsx
// Minimal self-contained toast stack — no external deps.
// Usage: const { toasts, push } = useToasts(); push('Saved!', 'success')
import { useCallback, useRef, useState } from 'react'

const ICONS = {
  success: 'ti-circle-check',
  error: 'ti-alert-circle',
  info: 'ti-info-circle',
}
const COLORS = {
  success: 'border-green-500/30 text-green-400 bg-green-500/10',
  error: 'border-red-500/30 text-red-400 bg-red-500/10',
  info: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
}

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback((text, type = 'info', duration = 3000) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  return { toasts, push }
}

export default function ToastStack({ toasts }) {
  if (!toasts?.length) return null
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none px-3 w-full sm:w-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-in-up flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg text-sm font-medium max-w-sm ${COLORS[t.type] || COLORS.info}`}
        >
          <i className={`ti ${ICONS[t.type] || ICONS.info}`} />
          <span className="text-slate-100">{t.text}</span>
        </div>
      ))}
    </div>
  )
}