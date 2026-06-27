// src/pages/VocabQuiz.jsx
// Flashcard-style quiz using the smart 80/20 (unseen+weak / review) word pool.
// Same paper aesthetic as VocabMaster, so it feels like one continuous book.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchQuiz, saveProgress } from '@/api/vocab';

const SIZES = [10, 15, 20];

export default function VocabQuiz() {
  const navigate = useNavigate();

  const [size, setSize]       = useState(10);
  const [started, setStarted] = useState(false);
  const [words, setWords]     = useState([]);
  const [idx, setIdx]         = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  const start = useCallback(async (n) => {
    setLoading(true);
    try {
      const data = await fetchQuiz({ n });
      if (!data.words?.length) {
        setWords([]);
      } else {
        setWords(data.words);
        setIdx(0);
        setSelected(null);
        setAnswered(false);
        setResults({ correct: 0, wrong: 0 });
        setFinished(false);
        setStarted(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const [selected, setSelected] = useState(null); // option string user picked
  const [answered, setAnswered] = useState(false);

  const current = words[idx];

  function pick(option) {
    if (answered || !current) return;
    const correct = option === current.meaning;
    setSelected(option);
    setAnswered(true);
    setResults((r) => ({ ...r, correct: r.correct + (correct ? 1 : 0), wrong: r.wrong + (correct ? 0 : 1) }));
    saveProgress(current._id, correct).catch(() => {});
  }

  function next() {
    if (idx + 1 >= words.length) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (!started) {
    return (
      <div className="min-h-full bg-[#f3f1e9] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#faf9f4] border border-[#e7e3d8] rounded-2xl p-7 text-center shadow-sm">
          <i className="ti ti-cards text-[36px] text-[#9c9580]" />
          <h1 className="font-serif text-2xl text-[#1f1b14] mt-2">Vocab Quiz</h1>
          <p className="text-[#7a7460] text-sm mt-1.5">
            80% will be new or weak words, 20% review — to keep your dictionary fresh in memory.
          </p>

          <div className="flex items-center justify-center gap-2 mt-5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`w-12 h-12 rounded-full text-sm font-medium border transition-colors
                  ${size === s ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => start(size)}
            disabled={loading}
            className="w-full mt-5 py-3 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50"
          >
            {loading ? 'Preparing…' : 'Start Quiz'}
          </button>

          {!loading && words.length === 0 && started === false && (
            <button onClick={() => navigate('/vocab')} className="text-xs text-[#a8a290] mt-4 underline">
              Add some words first
            </button>
          )}

          <button onClick={() => navigate('/vocab')} className="block w-full text-xs text-[#a8a290] mt-4">
            ← Back to dictionary
          </button>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-full bg-[#f3f1e9] flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-[#7a7460]">No words to quiz yet. Add some to your dictionary first.</p>
          <button onClick={() => navigate('/vocab')} className="mt-3 text-sm text-[#1f1b14] underline">
            Go to Vocab Master
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((results.correct / words.length) * 100);
    return (
      <div className="min-h-full bg-[#f3f1e9] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#faf9f4] border border-[#e7e3d8] rounded-2xl p-7 text-center shadow-sm">
          <i className={`ti ${pct >= 70 ? 'ti-trophy' : 'ti-refresh'} text-[36px] text-[#9c9580]`} />
          <h1 className="font-serif text-2xl text-[#1f1b14] mt-2">Quiz complete</h1>
          <p className="text-[#7a7460] text-sm mt-1.5">
            {results.correct} / {words.length} correct ({pct}%)
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setStarted(false)}
              className="flex-1 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm font-medium hover:bg-[#f1eee5]"
            >
              Quiz again
            </button>
            <button
              onClick={() => navigate('/vocab')}
              className="flex-1 py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f]"
            >
              Dictionary
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f3f1e9] flex flex-col items-center px-4 py-8">
      {/* progress */}
      <div className="w-full max-w-md flex items-center gap-3 mb-6">
        <button onClick={() => setStarted(false)} className="text-[#a8a290] hover:text-[#7a7460]">
          <i className="ti ti-x text-[18px]" />
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-[#e7e3d8] overflow-hidden">
          <div className="h-full bg-[#1f1b14] rounded-full transition-all" style={{ width: `${((idx) / words.length) * 100}%` }} />
        </div>
        <span className="text-xs text-[#a8a290] shrink-0">{idx + 1}/{words.length}</span>
      </div>

      {/* question card */}
      <div
        className="w-full max-w-md bg-[#fdfcf9] border border-[#e7e3d8] rounded-[4px]
                   shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-14px_rgba(0,0,0,0.18)]
                   px-7 py-8 text-center"
      >
        <span className="text-[10px] uppercase tracking-wide text-[#a8a290] mb-2 block">
          {current.wordType?.replace('-', ' ') || 'general'} · {current.difficulty}
        </span>
        <h2 className="font-serif text-3xl text-[#1f1b14] mb-1">{current.word}</h2>
        <p className="text-[#a8a290] text-xs">What does this word mean?</p>
      </div>

      {/* MCQ options */}
      <div className="w-full max-w-md flex flex-col gap-2.5 mt-5">
        {(current.options || [current.meaning]).map((opt, i) => {
          const isCorrectOpt = opt === current.meaning;
          const isPicked = opt === selected;

          let style = 'bg-[#fdfcf9] border-[#e7e3d8] text-[#3f3a2e] hover:bg-[#f1eee5]';
          if (answered && isCorrectOpt) style = 'bg-emerald-50 border-emerald-300 text-emerald-700';
          else if (answered && isPicked && !isCorrectOpt) style = 'bg-rose-50 border-rose-300 text-rose-600';
          else if (answered) style = 'bg-[#fdfcf9] border-[#e7e3d8] text-[#a8a290] opacity-60';

          return (
            <button
              key={i}
              onClick={() => pick(opt)}
              disabled={answered}
              className={`text-left px-4 py-3 rounded-xl border text-sm leading-relaxed transition-colors ${style}
                          disabled:cursor-default`}
            >
              <span className="font-medium mr-1.5">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          {current.example && (
            <p className="text-[#7a7460] text-sm italic mt-4 text-center max-w-md">"{current.example}"</p>
          )}
          <button
            onClick={next}
            className="w-full max-w-md mt-5 py-3 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f]"
          >
            {idx + 1 >= words.length ? 'Finish' : 'Next word →'}
          </button>
        </>
      )}
    </div>
  );
}