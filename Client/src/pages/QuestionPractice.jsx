// src/pages/QuestionPractice.jsx
// Practice session for the Question Bank — mcq & fill-blank (cloze) both
// render as option buttons (fill-blank just shows a sentence with a blank
// instead of a direct question). Same paper aesthetic as VocabQuiz.

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchQuestionPractice, saveQuestionProgress, fetchQuestionStats } from '@/api/QuestionBank';

const SIZES = [10, 15, 20];

const FORMATS = [
  { value: 'mcq',        label: 'MCQ' },
  { value: 'fill-blank', label: 'Fill Blank / Cloze' },
];

const TYPES = [
  { value: 'synonym',      label: 'Synonym' },
  { value: 'antonym',      label: 'Antonym' },
  { value: 'word-meaning', label: 'Word Meaning' },
  { value: 'idiom',        label: 'Idiom' },
  { value: 'phrasal-verb', label: 'Phrasal Verb' },
  { value: 'one-word',     label: 'One-Word Sub.' },
  { value: 'root-word',    label: 'Root Word' },
  { value: 'cloze',        label: 'Cloze / Filler' },
  { value: 'word-usage',   label: 'Word Usage' },
  { value: 'general',      label: 'General' },
];

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

const MASTERY_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'weak',     label: '⚡ Weak only' },
  { value: 'unseen',   label: '◌ New only' },
  { value: 'mastered', label: '✓ Review mastered' },
];

export default function QuestionPractice() {
  const navigate = useNavigate();

  const [size, setSize] = useState(10);
  const [selectedFormats, setSelectedFormats] = useState(new Set());     // empty = all
  const [selectedTypes, setSelectedTypes] = useState(new Set());         // empty = all
  const [selectedDifficulties, setSelectedDifficulties] = useState(new Set()); // empty = all
  const [masteryFilter, setMasteryFilter] = useState('all'); // 'all' | 'weak' | 'unseen' | 'mastered'
  const [studyDate, setStudyDate] = useState('all'); // 'all' | 'today'

  // Bank overview — used to only show filter chips that actually have
  // questions behind them (no point offering "Antonym" if there are zero).
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchQuestionStats()
      .then(setStats)
      .catch(() => setStats({ total: 0, byFormat: {}, byVocabType: {}, byDifficulty: {} }))
      .finally(() => setStatsLoading(false));
  }, []);

  const availableFormats = useMemo(
    () => FORMATS.filter((f) => (stats?.byFormat?.[f.value] || 0) > 0),
    [stats]
  );
  const availableTypes = useMemo(
    () => TYPES.filter((t) => (stats?.byVocabType?.[t.value] || 0) > 0),
    [stats]
  );
  const availableDifficulties = useMemo(
    () => DIFFICULTIES.filter((d) => (stats?.byDifficulty?.[d.value] || 0) > 0),
    [stats]
  );

  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ correct: 0, wrong: 0 });
  const [mistakes, setMistakes] = useState([]); // wrong answers this session, for the end-of-session review
  const [finished, setFinished] = useState(false);

  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  function toggle(setFn) {
    return (value) => setFn((s) => {
      const next = new Set(s);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }
  const toggleFormat = toggle(setSelectedFormats);
  const toggleType = toggle(setSelectedTypes);
  const toggleDifficulty = toggle(setSelectedDifficulties);

  const start = useCallback(async (n) => {
    setLoading(true);
    try {
      const data = await fetchQuestionPractice({
        n,
        format: selectedFormats.size ? [...selectedFormats] : undefined,
        vocabType: selectedTypes.size ? [...selectedTypes] : undefined,
        difficulty: selectedDifficulties.size ? [...selectedDifficulties] : undefined,
        masteryFilter,
        studyDate,
      });
      if (!data.questions?.length) {
        setQuestions([]);
      } else {
        setQuestions(data.questions);
        setIdx(0);
        setSelected(null); setAnswered(false);
        setResults({ correct: 0, wrong: 0 });
        setMistakes([]);
        setFinished(false);
        setStarted(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedFormats, selectedTypes, selectedDifficulties, masteryFilter, studyDate]);

  const current = questions[idx];

  function pickOption(option) {
    if (answered || !current) return;
    const correct = option === current.correctAnswer;
    setSelected(option);
    setAnswered(true);
    setResults((r) => ({ ...r, correct: r.correct + (correct ? 1 : 0), wrong: r.wrong + (correct ? 0 : 1) }));
    if (!correct) {
      setMistakes((m) => [...m, {
        question: current.question, passage: current.passage,
        picked: option, correctAnswer: current.correctAnswer,
        explanation: current.explanation, vocabType: current.vocabType,
      }]);
    }
    saveQuestionProgress(current._id, correct).catch(() => {});
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null); setAnswered(false);
    }
  }

  // ── Start screen ─────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-full bg-[#f3f1e9] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm bg-[#faf9f4] border border-[#e7e3d8] rounded-2xl p-7 text-center shadow-sm">
          <i className="ti ti-notebook text-[36px] text-[#9c9580]" />
          <h1 className="font-serif text-2xl text-[#1f1b14] mt-2">Question Practice</h1>
          <p className="text-[#7a7460] text-sm mt-1.5">
            Practice your own question bank — mcq &amp; fill-blank/cloze, mixed together.
          </p>

          {statsLoading ? (
            <p className="text-xs text-[#a8a290] mt-4">Loading your question bank…</p>
          ) : !stats?.total ? (
            <p className="text-xs text-[#a8a290] mt-4">Your question bank is empty — add some questions first.</p>
          ) : (
            <>
              {/* Format filter — only formats that actually have questions */}
              {availableFormats.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-[#a8a290] mt-4 mb-1.5">Formats</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {availableFormats.map((f) => (
                      <button key={f.value} onClick={() => toggleFormat(f.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
                          ${selectedFormats.has(f.value) ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}>
                        {f.label} <span className="opacity-60">({stats.byFormat[f.value]})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Type filter — only vocab types that actually have questions */}
              {availableTypes.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-[#a8a290] mt-3 mb-1.5">Types</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {availableTypes.map((t) => (
                      <button key={t.value} onClick={() => toggleType(t.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
                          ${selectedTypes.has(t.value) ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}>
                        {t.label} <span className="opacity-60">({stats.byVocabType[t.value]})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Difficulty filter — only difficulties that actually have questions */}
              {availableDifficulties.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-[#a8a290] mt-3 mb-1.5">Difficulty</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {availableDifficulties.map((d) => (
                      <button key={d.value} onClick={() => toggleDifficulty(d.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
                          ${selectedDifficulties.has(d.value) ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}>
                        {d.label} <span className="opacity-60">({stats.byDifficulty[d.value]})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Mastery filter — target just your weak spots, or drill new ones */}
          <p className="text-[10px] uppercase tracking-wide text-[#a8a290] mt-4 mb-1.5">Focus</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {MASTERY_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setMasteryFilter(f.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
                  ${masteryFilter === f.value ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Study date */}
          <div className="flex items-center justify-center gap-1.5 mt-4 bg-[#fdfcf9] border border-[#e7e3d8] rounded-full p-1">
            <button onClick={() => setStudyDate('all')}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${studyDate === 'all' ? 'bg-[#1f1b14] text-[#faf9f4]' : 'text-[#7a7460]'}`}>
              All Questions
            </button>
            <button onClick={() => setStudyDate('today')}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${studyDate === 'today' ? 'bg-[#1f1b14] text-[#faf9f4]' : 'text-[#7a7460]'}`}>
              Today's Only
            </button>
          </div>

          {/* Size */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {SIZES.map((s) => (
              <button key={s} onClick={() => setSize(s)}
                className={`w-12 h-12 rounded-full text-sm font-medium border transition-colors
                  ${size === s ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}>
                {s}
              </button>
            ))}
          </div>

          <button onClick={() => start(size)} disabled={loading || statsLoading || !stats?.total}
            className="w-full mt-5 py-3 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50">
            {loading ? 'Preparing…' : 'Start Practice'}
          </button>

          <button onClick={() => navigate('/vocab/questions')} className="block w-full text-xs text-[#a8a290] mt-4">
            ← Back to question bank
          </button>
        </div>
      </div>
    );
  }

  // ── Empty pool ───────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-full bg-[#f3f1e9] flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-[#7a7460]">No questions match this filter yet.</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <button onClick={() => { setSelectedFormats(new Set()); setSelectedTypes(new Set()); setSelectedDifficulties(new Set()); setMasteryFilter('all'); setStudyDate('all'); setStarted(false); }} className="text-sm text-[#1f1b14] underline">
              Clear filters
            </button>
            <button onClick={() => navigate('/vocab/questions')} className="text-sm text-[#1f1b14] underline">
              Go to Question Bank
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((results.correct / questions.length) * 100);
    return (
      <div className="min-h-full bg-[#f3f1e9] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-[#faf9f4] border border-[#e7e3d8] rounded-2xl p-7 text-center shadow-sm">
            <i className={`ti ${pct >= 70 ? 'ti-trophy' : 'ti-refresh'} text-[36px] text-[#9c9580]`} />
            <h1 className="font-serif text-2xl text-[#1f1b14] mt-2">Practice complete</h1>
            <p className="text-[#7a7460] text-sm mt-1.5">{results.correct} / {questions.length} correct ({pct}%)</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setStarted(false)} className="flex-1 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm font-medium hover:bg-[#f1eee5]">
                Practice again
              </button>
              <button onClick={() => navigate('/vocab/questions')} className="flex-1 py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f]">
                Question Bank
              </button>
            </div>
          </div>

          {/* Review mistakes — re-reading the correct answer + why right after
              a miss (testing effect + immediate feedback) is what actually
              makes it stick, vs the explanation flashing by once mid-session. */}
          {mistakes.length > 0 && (
            <div className="mt-4 bg-[#faf9f4] border border-[#e7e3d8] rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-wide text-[#a8a290] mb-3">
                Review your {mistakes.length} mistake{mistakes.length === 1 ? '' : 's'}
              </p>
              <div className="space-y-3">
                {mistakes.map((m, i) => (
                  <div key={i} className="border-t border-[#e7e3d8] pt-3 first:border-t-0 first:pt-0">
                    {m.passage && <p className="text-[11px] text-[#9c9580] mb-1">{m.passage}</p>}
                    <p className="font-serif text-[#1f1b14] text-sm leading-snug">{m.question}</p>
                    <p className="text-[12px] mt-1">
                      <span className="text-rose-500">You picked: {m.picked}</span>
                    </p>
                    <p className="text-[12px] text-emerald-600">Correct: {m.correctAnswer}</p>
                    {m.explanation && <p className="text-[11px] text-[#a8a290] italic mt-1">{m.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Active question ──────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#f3f1e9] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md flex items-center gap-3 mb-6">
        <button onClick={() => setStarted(false)} className="text-[#a8a290] hover:text-[#7a7460]">
          <i className="ti ti-x text-[18px]" />
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-[#e7e3d8] overflow-hidden">
          <div className="h-full bg-[#1f1b14] rounded-full transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-[#a8a290] shrink-0">{idx + 1}/{questions.length}</span>
      </div>

      {current.passage && (
        <div className="w-full max-w-md bg-[#f1eee5] rounded-xl px-4 py-3 mb-2.5 text-[13px] text-[#7a7460] leading-relaxed">
          {current.passage}
        </div>
      )}

      <div className="w-full max-w-md bg-[#fdfcf9] border border-[#e7e3d8] rounded-[4px]
                       shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-14px_rgba(0,0,0,0.18)] px-7 py-8 text-center">
        <span className="text-[10px] uppercase tracking-wide text-[#a8a290] mb-2 block">
          {current.vocabType?.replace('-', ' ')} · {current.difficulty} · {current.format.replace('-', ' ')}
        </span>
        <h2 className="font-serif text-xl text-[#1f1b14] leading-snug">{current.question}</h2>
      </div>

      {/* Both mcq and fill-blank render as option buttons */}
      <div className="w-full max-w-md flex flex-col gap-2.5 mt-5">
        {current.options.map((opt, i) => {
          const isCorrectOpt = opt === current.correctAnswer;
          const isPicked = opt === selected;
          let style = 'bg-[#fdfcf9] border-[#e7e3d8] text-[#3f3a2e] hover:bg-[#f1eee5]';
          if (answered && isCorrectOpt) style = 'bg-emerald-50 border-emerald-300 text-emerald-700';
          else if (answered && isPicked && !isCorrectOpt) style = 'bg-rose-50 border-rose-300 text-rose-600';
          else if (answered) style = 'bg-[#fdfcf9] border-[#e7e3d8] text-[#a8a290] opacity-60';
          return (
            <button key={i} onClick={() => pickOption(opt)} disabled={answered}
              className={`text-left px-4 py-3 rounded-xl border text-sm leading-relaxed transition-colors ${style} disabled:cursor-default`}>
              <span className="font-medium mr-1.5">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          {current.explanation && (
            <p className="text-[#7a7460] text-sm italic mt-4 text-center max-w-md">{current.explanation}</p>
          )}
          <button onClick={next} className="w-full max-w-md mt-5 py-3 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f]">
            {idx + 1 >= questions.length ? 'Finish' : 'Next question →'}
          </button>
        </>
      )}
    </div>
  );
}