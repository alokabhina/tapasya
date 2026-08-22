// src/pages/CAQuiz.jsx
// Full-page Current Affairs MCQ practice — setup → one question at a time
// → results. Was previously squeezed into a 340px sidebar panel inside
// CurrentAffairs.jsx; moved to its own route so it gets the whole screen,
// same as VocabQuiz/QuestionPractice do for their subjects.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCAQuestionsPractice, getCAQuestionsMeta } from '@/api/caQuestions';

const SIZES = [10, 20, 30, 50];

export default function CAQuiz() {
  const navigate = useNavigate();

  const [months, setMonths] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [count, setCount] = useState(10);

  const [stage, setStage] = useState('setup'); // 'setup' | 'quiz' | 'result'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    getCAQuestionsMeta().then(({ categories, months }) => { setCategories(categories); setMonths(months); });
  }, []);

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const items = await getCAQuestionsPractice({ month, category, count });
      if (!items.length) {
        setError('No questions found for these filters yet. Try a different month/category, or ask the admin to upload some.');
        return;
      }
      setQuestions(items);
      setIdx(0);
      setSelected(null);
      setAnswers([]);
      setStage('quiz');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  function pick(option) {
    if (selected) return;
    setSelected(option);
    const q = questions[idx];
    setAnswers((a) => [...a, {
      question: q.question, selected: option, correct: q.correctAnswer,
      isRight: option === q.correctAnswer, explanation: q.explanation,
    }]);
  }

  function next() {
    if (idx + 1 >= questions.length) { setStage('result'); return; }
    setIdx((i) => i + 1);
    setSelected(null);
  }

  function restart() {
    setStage('setup');
    setQuestions([]);
    setAnswers([]);
  }

  const q = questions[idx];
  const score = answers.filter((a) => a.isRight).length;

  return (
    <div className="min-h-full bg-[#0f172a] flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/current-affairs')} className="w-9 h-9 rounded-xl bg-[#141d2e] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
            <i className="ti ti-arrow-left text-base" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <i className="ti ti-brain text-orange-400" /> Current Affairs Quiz
            </h1>
            <p className="text-[12px] text-slate-500">Practice MCQs from the current affairs bank</p>
          </div>
        </div>

        {stage === 'setup' && (
          <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Month</label>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-black/30 border border-slate-700 text-sm text-slate-200">
                  <option value="">All months</option>
                  {months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-black/30 border border-slate-700 text-sm text-slate-200">
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Number of questions</label>
                <div className="flex gap-2">
                  {SIZES.map((n) => (
                    <button key={n} onClick={() => setCount(n)} className={`flex-1 h-11 rounded-xl text-sm font-semibold border ${count === n ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

            <button onClick={handleStart} disabled={loading} className="mt-6 w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              <i className="ti ti-player-play text-sm" /> {loading ? 'Loading...' : 'Start Quiz'}
            </button>
          </div>
        )}

        {stage === 'quiz' && q && (
          <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500">Question {idx + 1} of {questions.length}</span>
              <span className="text-xs text-orange-400 font-semibold">Score: {score}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${((idx + (selected ? 1 : 0)) / questions.length) * 100}%` }} />
            </div>

            <p className="text-base font-medium text-slate-100 mb-5 leading-relaxed">{q.question}</p>

            <div className="space-y-2.5">
              {q.options.map((opt) => {
                const isCorrect = opt === q.correctAnswer;
                const isSelected = opt === selected;
                let cls = 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600';
                if (selected) {
                  if (isCorrect) cls = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400';
                  else if (isSelected) cls = 'bg-red-500/15 border-red-500/40 text-red-400';
                  else cls = 'bg-slate-800/30 border-slate-800 text-slate-500';
                }
                return (
                  <button key={opt} onClick={() => pick(opt)} disabled={!!selected} className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${cls}`}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="mt-5 pt-5 border-t border-slate-800">
                {q.explanation && <p className="text-sm text-slate-400 mb-4">{q.explanation}</p>}
                <button onClick={next} className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold">
                  {idx + 1 >= questions.length ? 'See results' : 'Next question'}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'result' && (
          <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-6">
            <p className="text-sm font-semibold text-slate-300 mb-1">Quiz complete</p>
            <p className="text-5xl font-bold text-orange-400 mb-1">{score} / {questions.length}</p>
            <p className="text-sm text-slate-500 mb-5">{Math.round((score / questions.length) * 100)}% correct</p>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto mb-5 pr-1">
              {answers.map((a, i) => (
                <div key={i} className={`text-sm px-4 py-3 rounded-xl border ${a.isRight ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <p className="text-slate-300 mb-1">{a.question}</p>
                  {!a.isRight && <p className="text-red-400 text-[13px]">Your answer: {a.selected}</p>}
                  <p className="text-emerald-400 text-[13px]">Correct: {a.correct}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={restart} className="flex-1 h-11 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold">
                New quiz
              </button>
              <button onClick={() => navigate('/current-affairs')} className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold">
                Back to feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}