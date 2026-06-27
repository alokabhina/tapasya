// src/components/vocab/PagedBook.jsx
// Multiple words per "page" (like a real dictionary page), simple and
// reliable page-turn animation — no buggy double-layer 3D flip, just a
// clean one-shot flip-in transition every time the page changes.

import { useMemo, useRef, useEffect, useState } from 'react';

const TYPE_LABEL = {
  synonym: 'Synonym', antonym: 'Antonym', 'one-word': 'One-Word', idiom: 'Idiom', general: 'General',
};
const DIFF_DOT = { easy: 'bg-emerald-500', medium: 'bg-amber-500', hard: 'bg-rose-500' };

const PAGE_SIZE = 5;

export default function PagedBook({ words, pageIndex, onPageChange, onNearEnd, canDelete, onDelete }) {
  const [dir, setDir] = useState('next');
  const chunks = useMemo(() => {
    const out = [];
    for (let i = 0; i < words.length; i += PAGE_SIZE) out.push(words.slice(i, i + PAGE_SIZE));
    return out;
  }, [words]);

  const totalPages = chunks.length;
  const current = chunks[pageIndex] || [];

  function goNext() {
    if (pageIndex >= totalPages - 1) return;
    setDir('next');
    onPageChange(pageIndex + 1);
    if (pageIndex >= totalPages - 3) onNearEnd?.();
  }
  function goPrev() {
    if (pageIndex <= 0) return;
    setDir('prev');
    onPageChange(pageIndex - 1);
  }

  // ── Keyboard arrows (desktop) ──────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageIndex, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swipe (mobile + trackpad/mouse drag) ───────────────────────────────────
  const touchStart = useRef({ x: 0, y: 0 });
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    // swipe finger to the RIGHT → next page, swipe LEFT → previous page
    if (dx > 0) goNext();
    else goPrev();
  }

  return (
    <div className="flex flex-col items-center select-none">
      <style>{`
        @keyframes pageSlideNext {
          from { opacity: 0; transform: translateX(36px) rotateY(6deg); }
          to   { opacity: 1; transform: translateX(0) rotateY(0deg); }
        }
        @keyframes pageSlidePrev {
          from { opacity: 0; transform: translateX(-36px) rotateY(-6deg); }
          to   { opacity: 1; transform: translateX(0) rotateY(0deg); }
        }
        .vm-page-next { animation: pageSlideNext 260ms ease-out; transform-origin: right center; }
        .vm-page-prev { animation: pageSlidePrev 260ms ease-out; transform-origin: left center; }
      `}</style>

      {/* ── the page ── */}
      <div
        key={pageIndex}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`relative w-full max-w-[560px] min-h-[420px] rounded-[3px] bg-[#fdfcf9]
                   border border-[#e7e3d8] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_32px_-18px_rgba(0,0,0,0.22)]
                   px-5 sm:px-8 py-6 sm:py-8 ${dir === 'next' ? 'vm-page-next' : 'vm-page-prev'}`}
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.022) 32px)',
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-[5px] bg-gradient-to-l from-[#e7e3d8] to-transparent rounded-r-[3px]" />

        <div className="divide-y divide-[#ece8db]">
          {current.map((w) => (
            <Entry key={w._id} word={w} canDelete={canDelete?.(w)} onDelete={onDelete} />
          ))}
        </div>

        {current.length === 0 && (
          <p className="text-center text-[#a8a290] text-sm py-16">No words on this page.</p>
        )}
      </div>

      {/* ── controls ── */}
      <div className="flex items-center gap-4 mt-4">
        <button
          disabled={pageIndex <= 0}
          onClick={goPrev}
          className="w-9 h-9 rounded-full bg-[#fdfcf9] border border-[#e7e3d8] flex items-center justify-center
                     text-[#1f1b14] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f1eee5]"
        >
          <i className="ti ti-chevron-left text-[16px]" />
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, totalPages - 1)}
          value={pageIndex}
          onChange={(e) => {
            const v = +e.target.value;
            setDir(v > pageIndex ? 'next' : 'prev');
            onPageChange(v);
          }}
          className="w-32 sm:w-48 accent-[#1f1b14]"
        />

        <button
          disabled={pageIndex >= totalPages - 1}
          onClick={goNext}
          className="w-9 h-9 rounded-full bg-[#fdfcf9] border border-[#e7e3d8] flex items-center justify-center
                     text-[#1f1b14] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f1eee5]"
        >
          <i className="ti ti-chevron-right text-[16px]" />
        </button>
      </div>

      <span className="text-xs text-[#a8a290] font-serif mt-1.5">
        Page {pageIndex + 1} of {Math.max(1, totalPages)}
      </span>
    </div>
  );
}

function Entry({ word, canDelete, onDelete }) {
  return (
    <div className="relative group py-3.5 first:pt-1">
      {canDelete && (
        <button
          onClick={() => onDelete?.(word._id)}
          className="absolute top-3 right-0 w-6 h-6 rounded-full flex items-center justify-center
                     text-[#c8c2ab] opacity-0 group-hover:opacity-100 hover:bg-[#f1eee5] hover:text-rose-500 transition-all"
          title="Remove word"
        >
          <i className="ti ti-x text-[12px]" />
        </button>
      )}

      <div className="flex items-baseline gap-2 pr-6">
        <h3 className="font-serif text-[19px] text-[#1f1b14] leading-tight">{word.word}</h3>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DIFF_DOT[word.difficulty] || 'bg-amber-500'}`} />
        <span className="text-[10px] uppercase tracking-wide text-[#9c9580] font-medium">
          {TYPE_LABEL[word.wordType] || 'General'}
        </span>
      </div>

      <p className="text-[14px] text-[#3f3a2e] leading-relaxed mt-1 font-serif">{word.meaning}</p>

      {word.example && (
        <p className="text-[12.5px] text-[#7a7460] italic leading-relaxed mt-1">"{word.example}"</p>
      )}

      {word.progress?.seenCount > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-10 h-1 rounded-full bg-[#ece8db] overflow-hidden">
            <div
              className={`h-full rounded-full ${
                word.progress.masteryScore >= 80 ? 'bg-emerald-500'
                  : word.progress.masteryScore >= 40 ? 'bg-amber-500' : 'bg-rose-400'
              }`}
              style={{ width: `${word.progress.masteryScore}%` }}
            />
          </div>
          <span className="text-[9.5px] text-[#a8a290]">{word.progress.masteryScore}% mastered</span>
        </div>
      )}
    </div>
  );
}