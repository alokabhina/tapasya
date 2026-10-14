// src/components/practicetest/ImageSlot.jsx
// One optional image upload slot (admin only). Three ways to fill it:
//   1. Click the box (it gets focus), then Ctrl+V — paste a screenshot straight
//      from Snipping Tool / any PDF viewer's snip. Fastest path.
//   2. Drag & drop an image file onto it.
//   3. Click "Choose file".
// The image is compressed in the browser (utils/compressImage.js), uploaded via
// /api/practice-upload/image, and the hosted URL handed to onChange(url).
// onChange('') means "removed". Fully optional — an empty slot is valid.

import { useRef, useState } from 'react'
import { compressImage } from '@/utils/compressImage'
import { uploadPracticeImage } from '@/api/practiceTests'

export default function ImageSlot({ label, hint, value, onChange, variant = 'dark' }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const light = variant === 'light'
  const boxCls = light
    ? 'border-slate-300 bg-slate-50 text-slate-500 focus:border-tapasya-orange'
    : 'border-slate-600 bg-slate-900/60 text-slate-400 focus:border-tapasya-orange'
  const labelCls = light ? 'text-slate-600' : 'text-slate-300'
  const hintCls = light ? 'text-slate-400' : 'text-slate-500'

  async function handleFile(file) {
    if (!file || busy) return
    if (!file.type.startsWith('image/')) { setError('Sirf image file allowed hai'); return }
    setError('')
    setBusy(true)
    try {
      const small = await compressImage(file)
      const url = await uploadPracticeImage(small)
      onChange(url)
    } catch (e) {
      setError(e?.response?.data?.error || 'Upload nahi ho paya — dobara try karo')
    } finally {
      setBusy(false)
    }
  }

  function handlePaste(e) {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.kind === 'file' && i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    handleFile(item.getAsFile())
  }

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className={`text-[11px] font-bold ${labelCls}`}>{label} <span className={`font-normal ${hintCls}`}>(optional)</span></span>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-[11px] font-semibold text-red-400 hover:underline">
            Remove
          </button>
        )}
      </div>

      {value ? (
        <div className={`rounded-lg border p-1.5 ${light ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900/60'}`}>
          <img src={value} alt="" className="max-h-44 w-full object-contain rounded bg-white" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-1.5 w-full text-[11px] font-semibold text-tapasya-orange hover:underline disabled:opacity-60"
          >
            {busy ? 'Uploading...' : 'Replace image'}
          </button>
        </div>
      ) : (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
          className={`rounded-lg border-2 border-dashed px-3 py-4 text-center text-[11px] leading-relaxed outline-none cursor-pointer ${boxCls} ${dragOver ? 'border-tapasya-orange bg-tapasya-orange/10' : ''}`}
          onClick={(e) => e.currentTarget.focus()}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-1.5"><i className="ti ti-loader-2 animate-spin" /> Uploading...</span>
          ) : (
            <>
              <i className="ti ti-photo-up text-lg block mb-0.5" />
              Yahan click karke <b>Ctrl+V</b> karo ya image drag karo
              <br />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                className="mt-1 font-semibold text-tapasya-orange hover:underline"
              >
                Choose file
              </button>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
      {hint && <p className={`text-[10px] mt-1 ${hintCls}`}>{hint}</p>}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}