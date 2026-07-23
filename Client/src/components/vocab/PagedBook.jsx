// src/components/vocab/PagedBook.jsx
// Fixed-viewport book — no scroll needed. Words-per-page is now customizable.
// Single-word mode uses a centered grid card for max readability.

import { useMemo, useRef, useEffect, useState } from 'react';

const TYPE_LABEL = {
  synonym: 'Synonym', antonym: 'Antonym', 'one-word': 'One-Word', idiom: 'Idiom', 'root-word': 'Root Word', general: 'General',
};
const DIFF_DOT  = { easy: 'bg-emerald-500', medium: 'bg-amber-500', hard: 'bg-rose-500' };
const DIFF_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export default function PagedBook({
  words,
  pageIndex,
  onPageChange,
  onNearEnd,
  canDelete,
  onDelete,
  pageSize = 5,
  darkMode = false,
}) {
  const [dir, setDir] = useState('next');

  const chunks = useMemo(() => {
    const out = [];
    for (let i = 0; i < words.length; i += pageSize) out.push(words.slice(i, i + pageSize));
    return out;
  }, [words, pageSize]);

  const totalPages = chunks.length;
  const current    = chunks[pageIndex] || [];
  const isSingle   = pageSize === 1;

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

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageIndex, totalPages]); // eslint-disable-line

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
    // Swipe right (finger moves left->right, dx > 0) => previous page
    // Swipe left  (finger moves right->left, dx < 0) => next page
    if (dx > 0) goPrev();
    else goNext();
  }

  // ── theme tokens ──────────────────────────────────────────────────────────
  const th = darkMode
    ? {
        page:   'bg-[#1a1814] border-[#2e2c26]',
        shadow: '0_1px_2px_rgba(0,0,0,0.5),0_14px_32px_-18px_rgba(0,0,0,0.7)',
        lines:  'repeating-linear-gradient(transparent,transparent 31px,rgba(255,255,255,0.03) 32px)',
        edge:   'from-[#2e2c26]',
        divide: 'divide-[#2a2822]',
        word:   'text-[#e8e3d5]',
        meaning:'text-[#c0b99a]',
        example:'text-[#7a7460]',
        meta:   'text-[#6a6350]',
        ctrl:   'bg-[#242118] border-[#2e2c26] text-[#c0b99a] hover:bg-[#2e2c26]',
        ctrldis:'opacity-30',
        page_lbl:'text-[#5a5445]',
      }
    : {
        page:   'bg-[#fdfcf9] border-[#e7e3d8]',
        shadow: '0_1px_2px_rgba(0,0,0,0.05),0_14px_32px_-18px_rgba(0,0,0,0.22)',
        lines:  'repeating-linear-gradient(transparent,transparent 31px,rgba(0,0,0,0.022) 32px)',
        edge:   'from-[#e7e3d8]',
        divide: 'divide-[#ece8db]',
        word:   'text-[#1f1b14]',
        meaning:'text-[#3f3a2e]',
        example:'text-[#7a7460]',
        meta:   'text-[#9c9580]',
        ctrl:   'bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14] hover:bg-[#f1eee5]',
        ctrldis:'opacity-30',
        page_lbl:'text-[#a8a290]',
      };

  return (
    <div className="flex flex-col items-center select-none w-full h-full">
      <style>{`
        @keyframes pageSlideNext {
          from { opacity: 0; transform: translateX(36px) rotateY(6deg); }
          to   { opacity: 1; transform: translateX(0) rotateY(0deg); }
        }
        @keyframes pageSlidePrev {
          from { opacity: 0; transform: translateX(-36px) rotateY(-6deg); }
          to   { opacity: 1; transform: translateX(0) rotateY(0deg); }
        }
        .vm-page-next { animation: pageSlideNext 220ms ease-out; transform-origin: right center; }
        .vm-page-prev { animation: pageSlidePrev 220ms ease-out; transform-origin: left center; }
      `}</style>

      {/* ── the page ── */}
      <div
        key={`${pageIndex}-${pageSize}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`relative w-full max-w-[600px] flex-1 rounded-[3px] ${th.page}
                   border flex flex-col ${dir === 'next' ? 'vm-page-next' : 'vm-page-prev'}`}
        style={{
          boxShadow: th.shadow,
          backgroundImage: th.lines,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* right-edge spine shadow */}
        <div className={`absolute right-0 top-0 bottom-0 w-[5px] bg-gradient-to-l ${th.edge} to-transparent rounded-r-[3px] pointer-events-none z-10`} />

        {isSingle && current[0] ? (
          /* ── Single-word grid card (centered, bigger) ── */
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center overflow-hidden">
            <SingleCard word={current[0]} th={th} canDelete={canDelete?.(current[0])} onDelete={onDelete} />
          </div>
        ) : (
          /* ── Multi-word list — scrolls INSIDE the card, not the page ── */
          <div className={`divide-y ${th.divide} px-5 sm:px-8 py-3 sm:py-5 flex-1 overflow-y-auto
                          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
            {current.map((w) => (
              <Entry key={w._id} word={w} canDelete={canDelete?.(w)} onDelete={onDelete} th={th} twoCol={pageSize >= 5} />
            ))}
            {current.length === 0 && (
              <p className={`text-center ${th.meta} text-sm py-16`}>No words on this page.</p>
            )}
          </div>
        )}
      </div>

      {/* ── controls ── */}
      <div className="flex items-center gap-4 mt-3 shrink-0">
        <button
          disabled={pageIndex <= 0}
          onClick={goPrev}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors
                     ${th.ctrl} disabled:${th.ctrldis} disabled:cursor-not-allowed`}
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
          className="w-28 sm:w-44 accent-[#1f1b14]"
        />

        <button
          disabled={pageIndex >= totalPages - 1}
          onClick={goNext}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors
                     ${th.ctrl} disabled:${th.ctrldis} disabled:cursor-not-allowed`}
        >
          <i className="ti ti-chevron-right text-[16px]" />
        </button>
      </div>

      <span className={`text-xs font-serif mt-1 ${th.page_lbl}`}>
        {pageIndex + 1} / {Math.max(1, totalPages)}
      </span>
    </div>
  );
}

/* ── Single-word card (grid / focus mode) ─────────────────────────────────── */
function SingleCard({ word, th, canDelete, onDelete }) {
  return (
    <div className="w-full max-w-sm mx-auto relative">
      {canDelete && (
        <button
          onClick={() => onDelete?.(word._id)}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center
                     text-[#c8c2ab] hover:bg-rose-100 hover:text-rose-500 transition-all"
          title="Remove word"
        >
          <i className="ti ti-x text-[13px]" />
        </button>
      )}

      {/* mastery badge */}
      {word.progress?.seenCount > 0 && (
        <div className="flex justify-center mb-4">
          <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider
            ${word.progress.masteryScore >= 80 ? 'bg-emerald-100 text-emerald-700'
              : word.progress.masteryScore >= 40 ? 'bg-amber-100 text-amber-700'
              : 'bg-rose-100 text-rose-600'}`}>
            {word.progress.masteryScore}% mastered
          </span>
        </div>
      )}

      {/* word */}
      <h2 className={`font-serif text-[36px] sm:text-[44px] leading-tight tracking-tight ${th.word} mb-1`}>
        {word.word}
      </h2>

      {/* meta row */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full shrink-0 ${DIFF_DOT[word.difficulty] || 'bg-amber-500'}`} />
        <span className={`text-[11px] uppercase tracking-wide font-medium ${th.meta}`}>
          {DIFF_TEXT[word.difficulty]} · {TYPE_LABEL[word.wordType] || 'General'}
        </span>
      </div>

      {/* divider */}
      <div className={`w-12 h-[1px] mx-auto mb-4 ${word.difficulty === 'easy' ? 'bg-emerald-400' : word.difficulty === 'hard' ? 'bg-rose-400' : 'bg-amber-400'}`} />

      {/* meaning */}
      <p className={`font-serif text-[17px] sm:text-[19px] leading-relaxed ${th.meaning} mb-3`}>
        {word.meaning}
      </p>

      {/* example */}
      {word.example && (
        <p className={`text-[13px] italic leading-relaxed ${th.example}`}>
          "{word.example}"
        </p>
      )}
    </div>
  );
}

/* ── Multi-word list entry ─────────────────────────────────────────────────── */
function Entry({ word, canDelete, onDelete, th }) {
  return (
    <div className="relative group py-3 first:pt-1.5">
      {canDelete && (
        <button
          onClick={() => onDelete?.(word._id)}
          className="absolute top-2.5 right-0 w-6 h-6 rounded-full flex items-center justify-center
                     text-[#c8c2ab] opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-500 transition-all"
          title="Remove word"
        >
          <i className="ti ti-x text-[12px]" />
        </button>
      )}

      <div className="flex items-baseline gap-2 pr-6">
        <h3 className={`font-serif text-[19px] leading-tight ${th.word}`}>{word.word}</h3>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DIFF_DOT[word.difficulty] || 'bg-amber-500'}`} />
        <span className={`text-[10px] uppercase tracking-wide font-medium ${th.meta}`}>
          {TYPE_LABEL[word.wordType] || 'General'}
        </span>
      </div>

      <p className={`text-[14px] leading-relaxed mt-0.5 font-serif ${th.meaning}`}>{word.meaning}</p>

      {word.example && (
        <p className={`text-[12.5px] italic leading-relaxed mt-0.5 ${th.example}`}>"{word.example}"</p>
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
          <span className={`text-[9.5px] ${th.meta}`}>{word.progress.masteryScore}%</span>
        </div>
      )}
    </div>
  );
}