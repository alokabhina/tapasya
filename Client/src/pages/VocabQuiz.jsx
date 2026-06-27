// src/pages/VocabQuiz.jsx
// Flashcard-style quiz using the smart 80/20 (unseen+weak / review) word pool.
// Same paper aesthetic as VocabMaster, so it feels like one continuous book.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchQuiz, saveProgress, fetchWords } from '@/api/Vocab';

const SIZES = [10, 15, 20];

export default function VocabQuiz() {
  const navigate = useNavigate();

  const [size, setSize]       = useState(10);
  const [mode, setMode]       = useState('recognition'); // 'recognition' (word→meaning) | 'reverse' (meaning→word)
  const [started, setStarted] = useState(false);
  const [words, setWords]     = useState([]);
  const [idx, setIdx]         = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const start = useCallback(async (n, wordIds) => {
    setLoading(true);
    try {
      const data = await fetchQuiz({ n, mode, wordIds });
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
  }, [mode]);

  const [selected, setSelected] = useState(null); // option string user picked
  const [answered, setAnswered] = useState(false);

  const current = words[idx];
  const correctAnswer = current ? (current.mode === 'reverse' ? current.word : current.meaning) : null;

  function pick(option) {
    if (answered || !current) return;
    const correct = option === correctAnswer;
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
            Due/weak words get priority — keeps your dictionary fresh in memory.
          </p>

          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-1.5 mt-4 bg-[#fdfcf9] border border-[#e7e3d8] rounded-full p-1">
            <button
              onClick={() => setMode('recognition')}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${mode === 'recognition' ? 'bg-[#1f1b14] text-[#faf9f4]' : 'text-[#7a7460]'}`}
            >
              Word → Meaning
            </button>
            <button
              onClick={() => setMode('reverse')}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${mode === 'reverse' ? 'bg-[#1f1b14] text-[#faf9f4]' : 'text-[#7a7460]'}`}
            >
              Meaning → Word
            </button>
          </div>

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

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => start(size)}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50"
            >
              {loading ? 'Preparing…' : 'Start Quiz'}
            </button>
            <button
              onClick={() => setShowPicker(true)}
              title="Pick specific words for this quiz"
              className="px-3.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] hover:bg-[#f1eee5]"
            >
              <i className="ti ti-list-check text-[16px]" />
            </button>
          </div>
          <p className="text-[10px] text-[#a8a290] mt-1.5">
            Tap the list icon to quiz only the words you choose
          </p>

          {!loading && words.length === 0 && started === false && (
            <button onClick={() => navigate('/vocab')} className="text-xs text-[#a8a290] mt-4 underline">
              Add some words first
            </button>
          )}

          <button onClick={() => navigate('/vocab')} className="block w-full text-xs text-[#a8a290] mt-4">
            ← Back to dictionary
          </button>
        </div>

        {showPicker && (
          <WordPickerModal
            onClose={() => setShowPicker(false)}
            onStart={(ids) => { setShowPicker(false); start(ids.length, ids); }}
          />
        )}
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
        {mode === 'reverse' ? (
          <>
            <h2 className="font-serif text-xl text-[#1f1b14] mb-1 leading-snug">{current.meaning}</h2>
            <p className="text-[#a8a290] text-xs">Which word means this?</p>
          </>
        ) : (
          <>
            <h2 className="font-serif text-3xl text-[#1f1b14] mb-1">{current.word}</h2>
            <p className="text-[#a8a290] text-xs">What does this word mean?</p>
          </>
        )}
      </div>

      {/* MCQ options */}
      <div className="w-full max-w-md flex flex-col gap-2.5 mt-5">
        {(current.options || [correctAnswer]).map((opt, i) => {
          const isCorrectOpt = opt === correctAnswer;
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

// ── Word Picker Modal — choose specific words for a custom quiz ────────────────
function WordPickerModal({ onClose, onStart }) {
  const [search, setSearch] = useState('');
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchWords({ search, page: 1, limit: 200 })
      .then((d) => { if (active) setList(d.words); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search]);

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < 50) next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#faf9f4] rounded-2xl border border-[#e7e3d8] shadow-2xl p-5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-serif text-lg text-[#1f1b14]">Pick words for this quiz</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-[#a8a290] hover:bg-[#f1eee5]">
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>

        <input
          autoFocus
          placeholder="Search words…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm mb-3 shrink-0
                     focus:outline-none focus:border-[#c8c2ab]"
        />

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="text-center text-xs text-[#a8a290] py-8">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-center text-xs text-[#a8a290] py-8">No words found.</p>
          ) : (
            <div className="space-y-1">
              {list.map((w) => (
                <label
                  key={w._id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#f1eee5] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(w._id)}
                    onChange={() => toggle(w._id)}
                    className="accent-[#1f1b14] shrink-0"
                  />
                  <span className="font-serif text-sm text-[#1f1b14] truncate">{w.word}</span>
                  <span className="text-[11px] text-[#a8a290] truncate flex-1">{w.meaning}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e7e3d8] shrink-0">
          <span className="text-xs text-[#7a7460]">{selected.size} selected</span>
          <button
            onClick={() => onStart([...selected])}
            disabled={selected.size === 0}
            className="px-5 py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-40"
          >
            Start quiz with {selected.size} words
          </button>
        </div>
      </div>
    </div>
  );
}