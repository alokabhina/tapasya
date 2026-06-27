// src/components/vocab/BookReader.jsx
// A real page-flip reader (like archive.org's book viewer) for the vocab
// dictionary — one word per page, 3D CSS flip animation, tap zones + swipe,
// identical behaviour on mobile and desktop.

import { useState, useRef, useCallback } from 'react';

const TYPE_LABEL = {
  synonym: 'Synonym', antonym: 'Antonym', 'one-word': 'One-Word', idiom: 'Idiom', general: 'General',
};
const DIFF_DOT = { easy: 'bg-emerald-500', medium: 'bg-amber-500', hard: 'bg-rose-500' };

export default function BookReader({ words, index, onIndexChange, onNearEnd, canDelete, onDelete }) {
  const [flipDir, setFlipDir] = useState(null); // 'next' | 'prev' | null
  const touchRef = useRef({ x: 0, y: 0 });
  const flipping = flipDir !== null;

  const current = words[index];
  const target  = flipDir === 'next' ? words[index + 1] : flipDir === 'prev' ? words[index - 1] : null;

  const goNext = useCallback(() => {
    if (flipping || index >= words.length - 1) return;
    setFlipDir('next');
    if (index >= words.length - 4) onNearEnd?.();
  }, [flipping, index, words.length, onNearEnd]);

  const goPrev = useCallback(() => {
    if (flipping || index <= 0) return;
    setFlipDir('prev');
  }, [flipping, index]);

  function handleTransitionEnd(e) {
    if (e.propertyName !== 'transform' || !flipDir) return;
    onIndexChange(flipDir === 'next' ? index + 1 : index - 1);
    setFlipDir(null);
  }

  function onTouchStart(e) {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? goNext() : goPrev();
    }
  }

  if (!current) return null;

  return (
    <div className="flex flex-col items-center select-none">
      {/* ── the book ── */}
      <div
        className="relative w-full max-w-[420px] aspect-[3/4] sm:aspect-[3/4]"
        style={{ perspective: '1800px' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* destination page — sits underneath, revealed as top page flips away */}
        {target && (
          <div className="absolute inset-0">
            <PageFace word={target} canDelete={canDelete?.(target)} onDelete={onDelete} />
          </div>
        )}

        {/* current page — flips on top */}
        <div
          onTransitionEnd={handleTransitionEnd}
          className="absolute inset-0 transition-transform duration-[480ms] ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            transformOrigin: flipDir === 'prev' ? 'right center' : 'left center',
            transform: flipDir === 'next' ? 'rotateY(-180deg)' : flipDir === 'prev' ? 'rotateY(180deg)' : 'rotateY(0deg)',
            boxShadow: flipping ? '0 8px 30px rgba(0,0,0,0.25)' : 'none',
          }}
        >
          <PageFace word={current} canDelete={canDelete?.(current)} onDelete={onDelete} />
        </div>

        {/* invisible tap zones — left = prev, right = next */}
        <button
          aria-label="Previous word"
          onClick={goPrev}
          className="absolute left-0 top-0 bottom-0 w-[30%] z-10 cursor-w-resize"
        />
        <button
          aria-label="Next word"
          onClick={goNext}
          className="absolute right-0 top-0 bottom-0 w-[30%] z-10 cursor-e-resize"
        />
      </div>

      {/* ── controls (archive.org style bar) ── */}
      <div className="flex items-center gap-4 mt-5">
        <button
          disabled={index <= 0}
          onClick={goPrev}
          className="w-9 h-9 rounded-full bg-[#fdfcf9] border border-[#e7e3d8] flex items-center justify-center
                     text-[#1f1b14] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f1eee5]"
        >
          <i className="ti ti-chevron-left text-[16px]" />
        </button>

        {/* page slider — mirrors archive.org's scrub bar */}
        <input
          type="range"
          min={0}
          max={words.length - 1}
          value={index}
          onChange={(e) => onIndexChange(+e.target.value)}
          className="w-32 sm:w-48 accent-[#1f1b14]"
        />

        <button
          disabled={index >= words.length - 1}
          onClick={goNext}
          className="w-9 h-9 rounded-full bg-[#fdfcf9] border border-[#e7e3d8] flex items-center justify-center
                     text-[#1f1b14] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f1eee5]"
        >
          <i className="ti ti-chevron-right text-[16px]" />
        </button>
      </div>

      <span className="text-xs text-[#a8a290] font-serif mt-2">
        Page {index + 1} of {words.length}
      </span>
    </div>
  );
}

function PageFace({ word, canDelete, onDelete }) {
  return (
    <div
      className="absolute inset-0 rounded-[3px] bg-[#fdfcf9] border border-[#e7e3d8]
                 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_18px_40px_-20px_rgba(0,0,0,0.25)]
                 px-7 sm:px-9 py-9 sm:py-11 flex flex-col"
      style={{
        backfaceVisibility: 'hidden',
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.025) 28px)',
      }}
    >
      {/* page edge gradient — mimics paper thickness */}
      <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-gradient-to-l from-[#e7e3d8] to-transparent" />

      {canDelete && (
        <button
          onClick={() => onDelete?.(word._id)}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center
                     text-[#c8c2ab] hover:bg-[#f1eee5] hover:text-rose-500 transition-colors"
          title="Remove word"
        >
          <i className="ti ti-x text-[13px]" />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-1.5 h-1.5 rounded-full ${DIFF_DOT[word.difficulty] || 'bg-amber-500'}`} />
          <span className="text-[10px] uppercase tracking-wide text-[#9c9580] font-medium">
            {TYPE_LABEL[word.wordType] || 'General'}
          </span>
        </div>

        <h2 className="font-serif text-[32px] sm:text-[38px] text-[#1f1b14] tracking-tight leading-tight">
          {word.word}
        </h2>

        <div className="w-10 h-px bg-[#d8d2c0] my-4" />

        <p className="text-[15px] sm:text-base text-[#3f3a2e] leading-relaxed font-serif max-w-[280px]">
          {word.meaning}
        </p>

        {word.example && (
          <p className="text-[13px] text-[#7a7460] italic leading-relaxed mt-3 max-w-[280px]">
            "{word.example}"
          </p>
        )}

        {word.progress && word.progress.seenCount > 0 && (
          <div className="flex items-center gap-1.5 mt-4">
            <div className="w-14 h-1.5 rounded-full bg-[#ece8db] overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  word.progress.masteryScore >= 80 ? 'bg-emerald-500'
                    : word.progress.masteryScore >= 40 ? 'bg-amber-500' : 'bg-rose-400'
                }`}
                style={{ width: `${word.progress.masteryScore}%` }}
              />
            </div>
            <span className="text-[10px] text-[#a8a290]">{word.progress.masteryScore}% mastered</span>
          </div>
        )}
      </div>

      {word.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center pt-3">
          {word.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#f1eee5] text-[#7a7460] border border-[#e7e3d8]">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}