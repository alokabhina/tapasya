// src/components/watch/ShareModal.jsx
import { useEffect, useState } from 'react'
import { shareWatchItems } from '@/api/watch'

export default function ShareModal({ item, onClose }) {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) handleGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const data = await shareWatchItems([item._id])
      setCode(data.code)
    } catch (e) {
      setError(e?.response?.data?.error || 'Code generate nahi ho paya')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function handleNativeShare() {
    const text = `Watch this on Tapasya YT Pathsala — redeem code: ${code}`
    if (navigator.share) {
      try { await navigator.share({ title: item.title, text }) } catch {}
    } else {
      handleCopy()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <i className="ti ti-share-2 text-orange-400" /> Share Video
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800">
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
          {item.thumbnail && (
            <img src={item.thumbnail} alt="" className="w-16 aspect-video object-cover rounded-md shrink-0" />
          )}
          <p className="text-sm text-slate-300 line-clamp-2">{item.title}</p>
        </div>

        {loading && !code ? (
          <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            Generating code...
          </div>
        ) : code ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800 border border-slate-700">
              <span className="font-mono text-lg text-orange-400 tracking-wide">{code}</span>
              <button
                onClick={handleCopy}
                className="text-xs px-2.5 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1"
              >
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm flex items-center justify-center gap-2"
            >
              <i className="ti ti-send" /> Share code
            </button>
            <p className="text-xs text-slate-500">
              Yeh code kisi ko bhi bhejo — wah "Redeem" tab mein daal ke ye video apni list mein le sakta hai.
            </p>
          </div>
        ) : null}

        {error && (
          <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5"><i className="ti ti-alert-circle" /> {error}</span>
            <button onClick={handleGenerate} className="underline shrink-0">Retry</button>
          </div>
        )}
      </div>
    </div>
  )
}