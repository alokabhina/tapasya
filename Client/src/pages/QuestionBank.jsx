// src/pages/QuestionBank.jsx
// Personal question bank — browse/manage mcq & fill-blank (cloze) questions
// practice questions. Separate from the dictionary's auto-generated
// word↔meaning quiz (see VocabMaster.jsx / VocabQuiz.jsx).

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchQuestions, addQuestion, uploadQuestions, deleteQuestion, fetchQuestionStats,
} from '@/api/QuestionBank';

const FORMAT_FILTERS = [
  { value: 'all',         label: 'All Formats' },
  { value: 'mcq',         label: 'MCQ' },
  { value: 'fill-blank',  label: 'Fill Blank / Cloze' },
];

const TYPE_FILTERS = [
  { value: 'all',           label: 'All Types' },
  { value: 'synonym',       label: 'Synonym' },
  { value: 'antonym',       label: 'Antonym' },
  { value: 'word-meaning',  label: 'Word Meaning' },
  { value: 'idiom',         label: 'Idiom' },
  { value: 'phrasal-verb',  label: 'Phrasal Verb' },
  { value: 'one-word',      label: 'One-Word Sub.' },
  { value: 'root-word',     label: 'Root Word' },
  { value: 'cloze',         label: 'Cloze / Filler' },
  { value: 'word-usage',    label: 'Word Usage' },
  { value: 'general',       label: 'General' },
];

const DIFF_FILTERS = [
  { value: 'all',    label: 'All Levels' },
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

const DATE_FILTERS = [
  { value: 'all',   label: 'All Dates' },
  { value: 'today', label: "Today's" },
];

const FORMAT_LABEL = { mcq: 'MCQ', 'fill-blank': 'Fill Blank' };
const FORMAT_ICON  = { mcq: 'ti-list-check', 'fill-blank': 'ti-pencil' };

export default function QuestionBank() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [format, setFormat]       = useState('all');
  const [vocabType, setVocabType] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [studyDate, setStudyDate] = useState('all');
  const [stats, setStats]         = useState(null);

  const [showAdd, setShowAdd]     = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuestions({ search, format, vocabType, difficulty, studyDate, page: 1, limit: 30 });
      setQuestions(data.questions);
      setTotal(data.total);
      setPages(data.pages || 1);
      setPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, format, vocabType, difficulty, studyDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchQuestionStats().then(setStats).catch(() => {}); }, [questions.length]); // eslint-disable-line

  async function loadMore() {
    if (page >= pages) return;
    try {
      const nextPage = page + 1;
      const data = await fetchQuestions({ search, format, vocabType, difficulty, studyDate, page: nextPage, limit: 30 });
      setQuestions((q) => [...q, ...data.questions]);
      setPage(nextPage);
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this question from your bank?')) return;
    try {
      await deleteQuestion(id);
      setQuestions((q) => q.filter((x) => x._id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e?.response?.data?.error || 'Could not delete question');
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#f3f1e9] overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-[#faf9f4] border-b border-[#e7e3d8] shrink-0">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-2.5 pb-2">

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="font-serif text-[17px] sm:text-[20px] text-[#1f1b14] tracking-tight whitespace-nowrap">
                प्रश्न बैंक <span className="text-[#9c9580] text-xs font-sans">· Question Bank</span>
              </h1>
              {stats && (
                <span className="hidden sm:flex items-center gap-2.5 text-[10px] text-[#9c9580] ml-1">
                  <span><b className="text-[#1f1b14]">{stats.total}</b> questions</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{stats.mastered}</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />{stats.weak}</span>
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/vocab/questions/practice')}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 bg-[#1f1b14] text-[#faf9f4] hover:bg-[#34301f] shrink-0"
            >
              <i className="ti ti-player-play text-[12px]" /> Practice
            </button>
          </div>

          <div className="mt-1.5 flex gap-1.5">
            <div className="relative flex-1">
              <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a8a290] text-[12px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions…"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14] placeholder:text-[#a8a290]"
              />
            </div>
            <button
              onClick={() => setShowAdd(true)}
              title="Add question"
              className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14] hover:bg-[#f1eee5]"
            >
              <i className="ti ti-plus text-[13px]" />
            </button>
            <button
              onClick={() => setShowUpload(true)}
              title="Upload JSON"
              className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14] hover:bg-[#f1eee5]"
            >
              <i className="ti ti-upload text-[13px]" />
            </button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto whitespace-nowrap pb-0.5
                          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FORMAT_FILTERS.map((f) => (
              <Chip key={f.value} active={format === f.value} onClick={() => setFormat(f.value)}>{f.label}</Chip>
            ))}
            <span className="w-px h-3.5 bg-[#e7e3d8] shrink-0" />
            {DATE_FILTERS.map((f) => (
              <Chip key={f.value} active={studyDate === f.value} onClick={() => setStudyDate(f.value)}>{f.label}</Chip>
            ))}
            <span className="w-px h-3.5 bg-[#e7e3d8] shrink-0" />
            <select
              value={vocabType}
              onChange={(e) => setVocabType(e.target.value)}
              className="shrink-0 text-[10px] font-medium rounded-lg px-2 py-1 border focus:outline-none bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14]"
            >
              {TYPE_FILTERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="shrink-0 text-[10px] font-medium rounded-lg px-2 py-1 border focus:outline-none bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14]"
            >
              {DIFF_FILTERS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── LIST ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4">
          {loading ? (
            <p className="text-center text-xs text-[#a8a290] py-10">Loading…</p>
          ) : questions.length === 0 ? (
            <div className="text-center py-14">
              <i className="ti ti-inbox text-[32px] text-[#c8c2ab]" />
              <p className="text-[#7a7460] text-sm mt-2">No questions yet — add one or upload a JSON set.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div key={q._id} className="bg-[#fdfcf9] border border-[#e7e3d8] rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f1eee5] text-[#7a7460]">
                        <i className={`ti ${FORMAT_ICON[q.format]} text-[10px]`} />{FORMAT_LABEL[q.format]}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f1eee5] text-[#7a7460]">{q.vocabType}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f1eee5] text-[#7a7460]">{q.difficulty}</span>
                      {q.relatedWord && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f1eee5] text-[#7a7460]">↳ {q.relatedWord}</span>}
                    </div>
                    <button onClick={() => handleDelete(q._id)} className="text-[#c8c2ab] hover:text-rose-500 shrink-0">
                      <i className="ti ti-trash text-[13px]" />
                    </button>
                  </div>
                  <p className="font-serif text-[#1f1b14] text-sm leading-snug">{q.question}</p>
                  {q.passage && (
                    <p className="mt-1 text-[11px] text-[#9c9580] bg-[#f1eee5] rounded-lg px-2 py-1.5 leading-relaxed">{q.passage}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.options.map((o, i) => (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded-lg border ${o === q.correctAnswer ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-[#e7e3d8] text-[#7a7460]'}`}>{o}</span>
                    ))}
                  </div>
                  {q.explanation && <p className="mt-1 text-[11px] text-[#a8a290] italic">{q.explanation}</p>}
                </div>
              ))}
              {page < pages && (
                <button onClick={loadMore} className="w-full py-2.5 rounded-xl text-xs text-[#7a7460] hover:bg-[#f1eee5]">
                  Load more ({total - questions.length} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddQuestionModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {showUpload && <UploadJsonModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors
        ${active ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]' : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'}`}
    >
      {children}
    </button>
  );
}

function ModalShell({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#faf9f4] rounded-2xl border border-[#e7e3d8] shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-[#1f1b14]">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-[#a8a290] hover:bg-[#f1eee5]">
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Add Question Modal — mcq & fill-blank share the same options-based form ── */
function AddQuestionModal({ onClose, onDone }) {
  const [format, setFormat] = useState('mcq');
  const [question, setQuestion] = useState('');
  const [passage, setPassage] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [vocabType, setVocabType] = useState('general');
  const [difficulty, setDifficulty] = useState('medium');
  const [relatedWord, setRelatedWord] = useState('');
  const [explanation, setExplanation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full px-3 py-2 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm focus:outline-none focus:border-[#c8c2ab]';
  const label = 'text-xs font-medium text-[#1f1b14] mb-1 block';

  async function submit() {
    setError('');
    if (!question.trim()) { setError('Question text required'); return; }
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (cleaned.length < 2) { setError('Add at least 2 options'); return; }
    const correct = options[correctIdx]?.trim();
    if (!correct) { setError('Pick a valid correct option'); return; }

    setBusy(true);
    try {
      await addQuestion({
        question, format, options: cleaned, correctAnswer: correct,
        passage, vocabType, difficulty, relatedWord, explanation, source: 'manual',
      });
      onDone();
    } catch (e) { setError(e?.response?.data?.error || 'Could not add question'); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Add a question">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {/* Format switch */}
        <div className="flex gap-1.5 bg-[#fdfcf9] border border-[#e7e3d8] rounded-full p-1">
          {FORMAT_FILTERS.slice(1).map((f) => (
            <button key={f.value} onClick={() => setFormat(f.value)}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${format === f.value ? 'bg-[#1f1b14] text-[#faf9f4]' : 'text-[#7a7460]'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div>
          <label className={label}>Question {format === 'fill-blank' && <span className="text-[#a8a290] font-normal">(use ___ for the blank)</span>}</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} className={inp + ' resize-none'} />
        </div>

        <div>
          <label className={label}>Passage <span className="text-[#a8a290] font-normal">(optional — for RC vocab or multi-line cloze context)</span></label>
          <textarea value={passage} onChange={(e) => setPassage(e.target.value)} rows={2} className={inp + ' resize-none'} />
        </div>

        <div>
          <label className={label}>Options — tap ● to mark the correct one</label>
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button onClick={() => setCorrectIdx(i)} className={`w-4 h-4 rounded-full border shrink-0 ${correctIdx === i ? 'bg-emerald-500 border-emerald-500' : 'border-[#c8c2ab]'}`} />
                <input value={o} onChange={(e) => setOptions((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Option ${i + 1}`} className={inp} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>Type</label>
            <select value={vocabType} onChange={(e) => setVocabType(e.target.value)} className={inp}>
              {TYPE_FILTERS.slice(1).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inp}>
              {DIFF_FILTERS.slice(1).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Related word <span className="text-[#a8a290] font-normal">(optional)</span></label>
          <input value={relatedWord} onChange={(e) => setRelatedWord(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={label}>Explanation <span className="text-[#a8a290] font-normal">(shown after answering, optional)</span></label>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={inp + ' resize-none'} />
        </div>

        {error && <p className="text-rose-500 text-xs">{error}</p>}
        <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50">
          {busy ? 'Adding…' : 'Add question'}
        </button>
      </div>
    </ModalShell>
  );
}

/* ── Copy-paste ChatGPT prompts (photos / pdf / text notes → JSON) ── */
const QUESTION_JSON_SHAPE = `{
  "question": "Choose the correct synonym of 'Abate'",
  "format": "mcq",              // "mcq" (asked directly) | "fill-blank" (cloze/sentence-completion — question has "___")
  "options": ["Increase", "Diminish", "Ignore", "Repeat"],  // always 4 options, for BOTH formats
  "correctAnswer": "Diminish",  // must exactly match one of the options
  "explanation": "Abate means to reduce or lessen in intensity.",
  "passage": "",                 // optional — a short paragraph, only for RC-vocab or multi-line cloze questions
  "vocabType": "synonym",       // one of: synonym | antonym | word-meaning | idiom | phrasal-verb | one-word | root-word | cloze | word-usage | general
  "difficulty": "medium",       // "easy" | "medium" | "hard"
  "relatedWord": "Abate"        // optional — the vocab word this question is testing
}`;

const RULES = `Rules:
- "format" must be one of: "mcq", "fill-blank" — both are multiple-choice with exactly 4 options; "fill-blank" just means the question text has "___" where the blank goes
- "correctAnswer" must be an EXACT copy of one of the 4 options
- "vocabType" — match it to the question type using this mapping, and use a good mix across the set:
    - Synonyms → "synonym"
    - Antonyms → "antonym"
    - Word Meaning → "word-meaning"
    - Idioms & Phrases → "idiom"
    - Phrasal Verbs → "phrasal-verb"
    - One-word Substitution → "one-word"
    - Cloze Test / Sentence Completion (Fillers) → "cloze" with format "fill-blank"
    - Reading Comprehension vocabulary → whichever type fits (synonym/antonym/word-meaning), and put the short paragraph in "passage"
    - Word Swap / Word Usage (select the correctly used word) → "word-usage"
    - Root word / prefix-suffix breakdown → "root-word"
  (Note: "Match the Column" isn't supported in this format — skip that type.)
- "difficulty" must be one of: "easy", "medium", "hard"
- "explanation" should be short (under 20 words) — why the answer is correct
- "passage" — leave as "" unless it's an RC-vocab or multi-sentence cloze question
- "relatedWord" is optional — include it if the question is testing a specific word
- Create a good mix of vocabType and format, not just one repeated type
- Output ONLY a valid JSON array (no markdown, no explanation, no code fences), starting with [ and ending with ]`;

const PROMPT_PHOTOS = `You are helping me build a practice question set from photos of my vocabulary notes for my exam prep app.

Look at the attached image(s) and, for each word/idiom/root-word you see, create ONE good practice question testing it — cover a good mix of question types (synonym, antonym, idiom, phrasal verb, one-word substitution, cloze/filler, word usage) — don't just repeat "what does X mean" every time.

Return each item shaped exactly like this:
${QUESTION_JSON_SHAPE}

${RULES}`;

const PROMPT_PDF = `You are helping me build a practice question set from an attached PDF of vocabulary notes for my exam prep app.

Read through the whole PDF and, for each word/idiom/root-word covered, create ONE good practice question testing it — cover a good mix of question types (synonym, antonym, idiom, phrasal verb, one-word substitution, cloze/filler, word usage) — don't just repeat "what does X mean" every time.

Return each item shaped exactly like this:
${QUESTION_JSON_SHAPE}

${RULES}`;

const PROMPT_TEXT = `I'm pasting the vocabulary I studied today below (words, meanings, idioms, root words — whatever I've written). Turn this into a practice question set for my exam prep app — for each item create ONE good question, covering a good mix of question types (synonym, antonym, idiom, phrasal verb, one-word substitution, cloze/filler, word usage), not just "what does X mean" every time.

Return each item shaped exactly like this:
${QUESTION_JSON_SHAPE}

${RULES}

Here's what I studied today:
[PASTE YOUR VOCAB NOTES HERE]`;

function CopyPromptBox({ prompt }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard unavailable */ }
  }
  return (
    <div className="relative rounded-xl border p-3 text-[11px] font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap bg-[#fdfcf9] border-[#e7e3d8] text-[#7a7460]">
      {prompt}
      <button onClick={copy} className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-sans font-medium transition-colors flex items-center gap-1 bg-[#1f1b14] text-[#faf9f4] hover:bg-[#34301f]">
        <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-[11px]`} />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/* ── Upload JSON Modal ── */
function UploadJsonModal({ onClose, onDone }) {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [sourceTab, setSourceTab] = useState('text'); // 'photos' | 'pdf' | 'text'

  const tabBase = 'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors';
  const tabOn = 'bg-[#1f1b14] text-[#faf9f4]';
  const tabOff = 'bg-[#fdfcf9] text-[#7a7460] hover:text-[#1f1b14]';
  const stepNum = 'bg-[#1f1b14] text-[#faf9f4]';
  const prompts = { photos: PROMPT_PHOTOS, pdf: PROMPT_PDF, text: PROMPT_TEXT };

  async function submit() {
    setError(''); setResult(null);
    let parsed;
    try { parsed = JSON.parse(raw); if (!Array.isArray(parsed)) throw new Error(); }
    catch { setError('Invalid JSON. Paste the exact array.'); return; }
    setBusy(true);
    try {
      const res = await uploadQuestions(parsed);
      setResult(res);
      setTimeout(() => onDone(), 900);
    } catch (e) { setError(e?.response?.data?.error || 'Upload failed'); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Upload from ChatGPT JSON">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#1f1b14] text-[#faf9f4]">1</span>
            <p className="text-xs font-medium text-[#1f1b14]">Send your vocab to ChatGPT</p>
          </div>
          <p className="text-[11px] text-[#7a7460] mb-2 ml-7">
            Paste today's vocab notes as text, or attach photos/a PDF, then paste this prompt with it:
          </p>
          <div className="ml-7 flex gap-1.5 mb-2">
            <button onClick={() => setSourceTab('text')} className={`${tabBase} ${sourceTab === 'text' ? tabOn : tabOff}`}>
              <i className="ti ti-notes text-[12px] mr-1" />Text
            </button>
            <button onClick={() => setSourceTab('photos')} className={`${tabBase} ${sourceTab === 'photos' ? tabOn : tabOff}`}>
              <i className="ti ti-camera text-[12px] mr-1" />Photos
            </button>
            <button onClick={() => setSourceTab('pdf')} className={`${tabBase} ${sourceTab === 'pdf' ? tabOn : tabOff}`}>
              <i className="ti ti-file-text text-[12px] mr-1" />PDF
            </button>
          </div>
          <div className="ml-7">
            <CopyPromptBox prompt={prompts[sourceTab]} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#1f1b14] text-[#faf9f4]">2</span>
            <p className="text-xs font-medium text-[#1f1b14]">Copy ChatGPT's JSON reply and paste it here</p>
          </div>
          <div className="ml-7">
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={6}
              placeholder='[{"question": "...", "format": "mcq", "options": [...], "correctAnswer": "..."}]'
              className="w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-xs font-mono focus:outline-none focus:border-[#c8c2ab] resize-none" />
          </div>
        </div>

        <div className="ml-7">
          {error && <p className="text-rose-500 text-xs mb-1">{error}</p>}
          {result && (
            <p className="text-emerald-600 text-xs mb-1">
              Added {result.inserted} question{result.inserted === 1 ? '' : 's'} 🎉
              {result.skipped > 0 && ` (${result.skipped} skipped — check formatting)`}
            </p>
          )}
          <button onClick={submit} disabled={busy || !raw.trim()}
            className="w-full py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50">
            {busy ? 'Uploading…' : 'Upload questions'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}