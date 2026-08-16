// src/components/whatsnew/WhatsNewModal.jsx
//
// "What's New" onboarding — shown once, automatically, the first time the
// user opens the app after this update. Walks them through the new
// features slide-by-slide (Next only, no Skip — per requirement everyone
// should actually see each slide at least once). Never shows again for
// this version once finished; bump WHATS_NEW_VERSION below whenever you
// ship the *next* batch of features you want to re-announce.
//
// Mount this once, globally, inside AppShell (see App.jsx) — it renders
// nothing until it checks localStorage on mount.
import { useEffect, useState } from 'react'
import ChannelSubscribeIllustration from './ChannelSubscribeIllustration'
import PlaylistAddIllustration from './PlaylistAddIllustration'
import FolderPickerIllustration from './FolderPickerIllustration'

// ── Bump this string whenever new features are added and you want the
//    guide to reappear once more for everyone (even users who saw an
//    older version). e.g. 'v2-2026-09-yt-hub-update'
export const WHATS_NEW_VERSION = 'v1-2026-08-yt-hub-update'
const STORAGE_KEY = `tapasya_whatsnew_seen_${WHATS_NEW_VERSION}`

const SLIDES = [
  {
    icon: 'ti-sparkles',
    title: 'Kuch Naya Aaya Hai! 🎉',
    body: 'YT Study Pathsala ke Channel Feed tab mein naye features aaye hain — channel subscribe karna, playlist add karna, aur video add karna, sab pehle se behtar ho gaya hai. Agle slides mein dikhata hoon.',
  },
  {
    icon: 'ti-rss',
    title: 'Naya: Channel Subscribe karo',
    body: 'Channel Feed tab mein upar search bar se koi bhi YouTube channel dhundo (jaise "Nimisha Bansal") aur "Subscribe" dabao. Us channel ke naye videos apne aap tumhare feed mein aate rahenge — bina baar-baar YouTube khole.',
    illustration: ChannelSubscribeIllustration,
  },
  {
    icon: 'ti-folder-plus',
    title: 'Naya: Playlist ek click mein Add',
    body: 'Watchlist tab mein "Add Link" se ab poori playlist ka link bhi paste kar sakte ho. Har video alag se add karne ki zaroorat nahi — playlist ke naam se apne aap ek naya folder ban jayega aur saare videos usmein aa jayenge.',
    illustration: PlaylistAddIllustration,
  },
  {
    icon: 'ti-square-check',
    title: 'Naya: Feed se seedha Video Add (tick karke)',
    body: 'Channel Feed mein kisi bhi video ke upar-right corner mein "+" button dabao — ab konse folder mein add karna hai wo poochega. Folder chuno (ya wahin se naya bana lo), video add ho jayega aur "+" ki jagah green tick (✓) dikhne lagega, matlab confirm — ye video already add ho chuka hai.',
    illustration: FolderPickerIllustration,
  },
  {
    icon: 'ti-rocket',
    title: 'Bas itna hi — ab shuru karo!',
    body: 'Channel Feed tab mein jaakar in teeno cheezon ko try karo. Padhai mast chale! 📚',
  },
]

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      // localStorage unavailable (private mode etc.) — just don't show,
      // rather than risk showing every single time.
    }
  }, [])

  function markSeenAndClose() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setOpen(false)
  }

  function handleNext() {
    if (step < SLIDES.length - 1) setStep((s) => s + 1)
    else markSeenAndClose()
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  if (!open) return null

  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1
  const Illustration = slide.illustration

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up">
        {/* Progress dots — indicate position only, not tappable (no jumping/skipping ahead) */}
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-1">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-orange-500' : i < step ? 'w-1.5 bg-orange-500/50' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="px-6 pt-4 pb-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <i className={`ti ${slide.icon} text-orange-400 text-2xl`} />
          </div>

          {Illustration && (
            <div className="mb-5">
              <Illustration />
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-100 mb-2">{slide.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{slide.body}</p>
        </div>

        <div className="flex items-center gap-2 px-6 pt-4 pb-6">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium"
            >
              Peeche
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/10"
          >
            {isLast ? 'Shuru Karein' : 'Next'}
            <i className={`ti ${isLast ? 'ti-check' : 'ti-arrow-right'} text-base`} />
          </button>
        </div>
      </div>
    </div>
  )
}