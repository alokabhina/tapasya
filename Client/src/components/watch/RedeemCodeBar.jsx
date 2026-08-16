// src/components/watch/RedeemCodeBar.jsx
import { useEffect, useState } from 'react'
import { redeemShareCode } from '@/api/watch'
import { getFolders } from '@/api/folders'
import FolderSelect from './FolderSelect'

export default function RedeemCodeBar({ onRedeemed }) {
  const [folders, setFolders] = useState([])
  const [code, setCode] = useState('')
  const [folderId, setFolderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    getFolders().then((f) => {
      setFolders(f)
      if (f.length) setFolderId(f[0]._id)
    }).catch(() => {})
  }, [])

  async function handleRedeem(e) {
    e.preventDefault()
    if (!code.trim()) return setMessage({ type: 'error', text: 'Code daalo pehle' })
    if (!folderId) return setMessage({ type: 'error', text: 'Folder select karo' })

    setLoading(true)
    setMessage(null)
    try {
      const data = await redeemShareCode({ code: code.trim(), folderId })
      setMessage({
        type: 'success',
        text: `${data.added} video${data.added !== 1 ? 's' : ''} add ho gayi${data.skipped ? ` (${data.skipped} pehle se the)` : ''}`,
      })
      setCode('')
      onRedeemed?.()
    } catch (e) {
      setMessage({ type: 'error', text: e?.response?.data?.error || 'Code galat hai ya expire ho gaya' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 animate-fade-in-up">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-3">
          <i className="ti ti-gift text-3xl text-orange-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">Redeem a Share Code</h3>
        <p className="text-sm text-slate-500 mt-1">Kisi ne video share ki hai? Code yahan daalo.</p>
      </div>

      <form onSubmit={handleRedeem} className="space-y-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="WATCH-XXXXXX"
          className="w-full px-3 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-base font-mono text-center tracking-[0.2em] focus:outline-none focus:border-orange-500"
        />

        <FolderSelect
          folders={folders}
          value={folderId}
          onChange={setFolderId}
          onFolderCreated={(f) => setFolders((prev) => [...prev, f])}
        />

        {message && (
          <div className={`text-sm rounded-lg px-3 py-2 border flex items-center gap-1.5 ${
            message.type === 'success'
              ? 'text-green-400 bg-green-500/10 border-green-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}>
            <i className={`ti ${message.type === 'success' ? 'ti-circle-check' : 'ti-alert-circle'}`} />
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2"
        >
          {loading
            ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Redeeming...</>
            : <><i className="ti ti-gift" /> Redeem Code</>}
        </button>
      </form>
    </div>
  )
}