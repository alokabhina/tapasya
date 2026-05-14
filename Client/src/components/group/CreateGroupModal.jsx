// src/components/group/CreateGroupModal.jsx
// FIXED:
// 1. createGroup passed as prop (avoids dual-instance hook bug)
// 2. Real server error message shown (not just generic text)
// 3. Emoji picker icon shown as preview next to name in modal

import { useState } from 'react';

const EMOJI_OPTIONS = [
  '📚', '🔥', '⚡', '🎯', '🧠', '🏆', '💡', '🌙',
  '⭐', '🚀', '💪', '🦁', '🌿', '🎓', '🧪', '🗺️',
];

export default function CreateGroupModal({ onClose, createGroup }) {
  const [name, setName]       = useState('');
  const [emoji, setEmoji]     = useState('📚');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group ka naam daalo');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createGroup(`${emoji} ${name.trim()}`);
      onClose?.();
    } catch (err) {
      // Show the actual server error message, fall back to generic
      setError(err?.message || 'Group create nahi hua — dobara try karo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl border border-[#334155] p-6 mb-4 sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100">
            Naya Group Banao
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f172a] text-slate-400 hover:text-slate-200"
          >
            <i className="ti ti-x text-base" />
          </button>
        </div>

        {/* Emoji picker */}
        <p className="text-xs text-slate-500 mb-2 font-medium">Group icon chuniye</p>
        <div className="grid grid-cols-8 gap-1.5 mb-4">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`aspect-square text-xl rounded-lg flex items-center justify-center transition-all duration-100 ${
                emoji === e
                  ? 'bg-orange-500/20 ring-2 ring-tapasya-orange scale-110'
                  : 'bg-[#0f172a] hover:bg-[#243347]'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Group name input */}
        <p className="text-xs text-slate-500 mb-2 font-medium">Group ka naam</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="e.g. UPSC Warriors, JEE Batch 2026"
          maxLength={40}
          className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-tapasya-orange transition-colors mb-1"
        />
        <p className="text-xs text-slate-600 mb-4 text-right">{name.length}/40</p>

        {/* Preview */}
        {name && (
          <div className="flex items-center gap-3 bg-[#0f172a] rounded-xl px-4 py-3 mb-4 border border-[#334155]">
            <span className="text-2xl">{emoji}</span>
            <span className="text-sm font-medium text-slate-200">{name}</span>
          </div>
        )}

        {/* Error — shows real server message */}
        {error && (
          <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
            <i className="ti ti-alert-circle" />
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="w-full py-3 rounded-xl bg-tapasya-orange text-white font-medium text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <i className="ti ti-loader-2 animate-spin" />
              Bana raha hai...
            </>
          ) : (
            <>
              <i className="ti ti-users-plus" />
              Group Banao
            </>
          )}
        </button>
      </div>
    </div>
  );
}
