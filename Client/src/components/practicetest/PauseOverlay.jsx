// src/components/practicetest/PauseOverlay.jsx
// Two states, both full-screen dimmed overlays (plan doc Section 7.1 /
// Image 4): "confirm" appears right after the Pause button is clicked
// ("Do you want to pause the test?"), "paused" is the actual paused state
// — timer is stopped by the parent (PracticeTestPlay just stops ticking
// while paused=true), screen dims, only a Resume button works.
//
// Light theme card on a dark scrim, matching the rest of the live engine.

export default function PauseOverlay({ mode, onConfirmPause, onCancel, onResume }) {
  if (!mode) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      {mode === 'confirm' ? (
        <div className="w-full max-w-xs bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xl animate-fade-in-up">
          <i className="ti ti-player-pause text-3xl text-tapasya-orange mb-2 block" />
          <p className="text-slate-800 font-bold text-sm mb-5">Do you want to pause the test?</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50"
            >
              No
            </button>
            <button
              onClick={onConfirmPause}
              className="flex-1 py-2.5 rounded-xl bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark"
            >
              Yes, Pause
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xs bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xl animate-fade-in-up">
          <i className="ti ti-player-pause-filled text-3xl text-slate-400 mb-2 block" />
          <p className="text-slate-800 font-bold text-sm mb-1">Test Paused</p>
          <p className="text-slate-500 text-xs mb-5">Timer ruka hua hai — jab ready ho, resume karo.</p>
          <button
            onClick={onResume}
            className="w-full py-2.5 rounded-xl bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark"
          >
            <i className="ti ti-player-play mr-1" /> Resume Test
          </button>
        </div>
      )}
    </div>
  )
}