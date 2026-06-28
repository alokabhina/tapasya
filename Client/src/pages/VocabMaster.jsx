// src/pages/VocabMaster.jsx
// Fixed-viewport layout — header stays top, book fills remaining height.
// No page scroll needed. Dark mode toggle + customizable words-per-page.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchWords, addWord, uploadWords, deleteWord, fetchVocabStats, fetchStreak, setDailyTarget,
} from '@/api/Vocab';
import BookReader from '@/components/vocab/PagedBook';

const TYPE_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'synonym',  label: 'Syn' },
  { value: 'antonym',  label: 'Ant' },
  { value: 'one-word', label: '1W' },
  { value: 'idiom',    label: 'Idiom' },
  { value: 'general',  label: 'Gen' },
];

const DIFF_FILTERS = [
  { value: 'all',    label: 'All' },
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Med' },
  { value: 'hard',   label: 'Hard' },
];

const MASTERY_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'mastered', label: '✓ Done' },
  { value: 'weak',     label: '⚡ Weak' },
  { value: 'unseen',   label: '◌ New' },
];

// Words per page options
const PAGE_SIZES = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
];

export default function VocabMaster() {
  const navigate = useNavigate();

  const [words, setWords]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [pages, setPages]             = useState(1);
  const [page, setPage]               = useState(1);
  const [bookIndex, setBookIndex]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [search, setSearch]           = useState('');
  const [wordType, setWordType]       = useState('all');
  const [difficulty, setDifficulty]   = useState('all');
  const [masteryFilter, setMasteryFilter] = useState('all');
  const [mine, setMine]               = useState(false);
  const [stats, setStats]             = useState(null);
  const [streak, setStreak]           = useState(null);

  // NEW: per-page size + dark mode
  const [pageSize, setPageSize]       = useState(5);
  const [darkMode, setDarkMode]       = useState(false);

  const [showAdd, setShowAdd]         = useState(false);
  const [showUpload, setShowUpload]   = useState(false);
  const [showTarget, setShowTarget]   = useState(false);

  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWords({ search, wordType, difficulty, masteryFilter, mine, page: 1, limit: 40 });
      setWords(data.words);
      setTotal(data.total);
      setPages(data.pages || 1);
      setPage(1);
      setBookIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, wordType, difficulty, masteryFilter, mine]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchVocabStats().then(setStats).catch(() => {});
  }, [words.length]); // eslint-disable-line

  useEffect(() => {
    fetchStreak().then(setStreak).catch(() => {});
  }, []);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || page >= pages) return;
    fetchingRef.current = true;
    setFetchingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchWords({ search, wordType, difficulty, masteryFilter, mine, page: nextPage, limit: 40 });
      setWords((w) => [...w, ...data.words]);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingMore(false);
      fetchingRef.current = false;
    }
  }, [page, pages, search, wordType, difficulty, masteryFilter, mine]);

  async function handleDelete(id) {
    if (!confirm('Remove this word from your dictionary?')) return;
    try {
      await deleteWord(id);
      setWords((w) => {
        const next = w.filter((x) => x._id !== id);
        const maxPage = Math.max(0, Math.ceil(next.length / pageSize) - 1);
        setBookIndex((i) => Math.min(i, maxPage));
        return next;
      });
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e?.response?.data?.error || 'Could not delete word');
    }
  }

  // ── theme tokens ─────────────────────────────────────────────────────────
  const dm = darkMode;
  const bg      = dm ? 'bg-[#12110e]'      : 'bg-[#f3f1e9]';
  const hdrBg   = dm ? 'bg-[#1a1814]'      : 'bg-[#faf9f4]';
  const hdrBdr  = dm ? 'border-[#2e2c26]'  : 'border-[#e7e3d8]';
  const titleClr= dm ? 'text-[#e8e3d5]'    : 'text-[#1f1b14]';
  const metaClr = dm ? 'text-[#6a6350]'    : 'text-[#9c9580]';
  const inputBg = dm ? 'bg-[#242118] border-[#2e2c26] text-[#e8e3d5] placeholder:text-[#4a4538]'
                     : 'bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14] placeholder:text-[#a8a290]';
  const iconClr = dm ? 'text-[#6a6350]'    : 'text-[#a8a290]';
  const btnBg   = dm ? 'bg-[#242118] border-[#2e2c26] text-[#c0b99a] hover:bg-[#2e2c26]'
                     : 'bg-[#fdfcf9] border-[#e7e3d8] text-[#1f1b14] hover:bg-[#f1eee5]';
  const quizBtn = dm ? 'bg-[#e8e3d5] text-[#1a1814] hover:bg-[#d4cfc0]'
                     : 'bg-[#1f1b14] text-[#faf9f4] hover:bg-[#34301f]';
  const streakBg= dm ? 'bg-[#1e1c18] border-[#2e2c26] hover:bg-[#242118]'
                     : 'bg-[#fdfcf9] border-[#e7e3d8] hover:bg-[#f6f4ec]';
  const streakTxt= dm ? 'text-[#7a7460]'   : 'text-[#7a7460]';
  const streakBar= dm ? 'bg-[#2a2822]'     : 'bg-[#ece8db]';
  const chipBase= dm
    ? 'bg-[#1e1c18] text-[#7a7460] border-[#2e2c26] hover:bg-[#242118]'
    : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]';
  const chipActive= dm
    ? 'bg-[#e8e3d5] text-[#1a1814] border-[#e8e3d5]'
    : 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]';

  return (
    // Fills the main content area — no outer scroll, respects sidebar
    <div className={`h-full flex flex-col ${bg} transition-colors duration-200 overflow-hidden`}>

      {/* ── HEADER (compact, fixed height) ─────────────────────────────────── */}
      <div className={`${hdrBg} border-b ${hdrBdr} shrink-0 transition-colors duration-200`}>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-2.5 pb-2">

          {/* Row 1: title + quiz + dark toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className={`font-serif text-[17px] sm:text-[20px] ${titleClr} tracking-tight whitespace-nowrap`}>
                शब्दकोश <span className={`${metaClr} text-xs font-sans`}>· Vocab Master</span>
              </h1>
              {stats && (
                <span className={`hidden sm:flex items-center gap-2.5 text-[10px] ${metaClr} ml-1`}>
                  <span><b className={titleClr}>{stats.totalWords}</b> words</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{stats.mastered}</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />{stats.weak}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode((d) => !d)}
                title={darkMode ? 'Light mode' : 'Dark mode'}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${btnBg}`}
              >
                <i className={`ti ${darkMode ? 'ti-sun' : 'ti-moon'} text-[14px]`} />
              </button>

              {/* Quiz */}
              <button
                onClick={() => navigate('/vocab/quiz')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${quizBtn}`}
              >
                <i className="ti ti-bolt text-[12px]" /> Quiz
              </button>
            </div>
          </div>

          {/* Row 2: Search + Add + Upload */}
          <div className="mt-1.5 flex gap-1.5">
            <div className="relative flex-1">
              <i className={`ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 ${iconClr} text-[12px]`} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a word…"
                className={`w-full pl-7 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none ${inputBg} transition-colors`}
              />
            </div>
            <button
              onClick={() => setShowAdd(true)}
              title="Add word"
              className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${btnBg}`}
            >
              <i className="ti ti-plus text-[13px]" />
            </button>
            <button
              onClick={() => setShowUpload(true)}
              title="Upload JSON"
              className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${btnBg}`}
            >
              <i className="ti ti-upload text-[13px]" />
            </button>
          </div>

          {/* Row 3: Streak + Words-per-page selector */}
          <div className="mt-1.5 flex gap-1.5 items-center">
            {streak ? (
              <button
                onClick={() => setShowTarget(true)}
                className={`flex-1 flex items-center gap-2 ${streakBg} border rounded-lg px-2.5 py-1.5 transition-colors min-w-0`}
              >
                <span className="text-[12px] shrink-0">🔥</span>
                <span className={`text-[10px] ${streakTxt} shrink-0`}>
                  <b className={titleClr}>{streak.currentStreak}d</b>
                </span>
                <div className={`flex-1 h-1.5 rounded-full ${streakBar} overflow-hidden`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, (streak.todayCount / streak.dailyTarget) * 100)}%` }}
                  />
                </div>
                <span className={`text-[10px] ${metaClr} shrink-0`}>{streak.todayCount}/{streak.dailyTarget}</span>
                <i className={`ti ti-pencil text-[10px] ${metaClr} shrink-0`} />
              </button>
            ) : <div className="flex-1" />}

            {/* Words per page selector */}
            <div className={`flex items-center gap-1 ${btnBg} border rounded-lg px-2 py-1 shrink-0`}>
              <i className={`ti ti-layout-grid text-[11px] ${metaClr}`} />
              <span className={`text-[10px] ${metaClr} mr-0.5`}>Per pg:</span>
              {PAGE_SIZES.map((ps) => (
                <button
                  key={ps.value}
                  onClick={() => { setPageSize(ps.value); setBookIndex(0); }}
                  className={`w-6 h-5 rounded text-[10px] font-medium transition-colors
                    ${pageSize === ps.value
                      ? (darkMode ? 'bg-[#e8e3d5] text-[#1a1814]' : 'bg-[#1f1b14] text-white')
                      : (darkMode ? 'text-[#7a7460] hover:bg-[#2e2c26]' : 'text-[#7a7460] hover:bg-[#f1eee5]')
                    }`}
                >
                  {ps.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Filter chips */}
          <div className="flex items-center gap-1 mt-1.5 overflow-x-auto whitespace-nowrap pb-0.5
                          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MASTERY_FILTERS.map((f) => (
              <Chip key={f.value} active={masteryFilter === f.value} onClick={() => setMasteryFilter(f.value)}
                    chipBase={chipBase} chipActive={chipActive}>
                {f.label}
              </Chip>
            ))}
            <span className={`w-px h-3.5 ${darkMode ? 'bg-[#2e2c26]' : 'bg-[#e7e3d8]'} shrink-0`} />
            <Chip active={mine} onClick={() => setMine((m) => !m)} chipBase={chipBase} chipActive={chipActive}>
              <i className="ti ti-user text-[10px] mr-0.5" />Me
            </Chip>
            <span className={`w-px h-3.5 ${darkMode ? 'bg-[#2e2c26]' : 'bg-[#e7e3d8]'} shrink-0`} />
            {TYPE_FILTERS.map((f) => (
              <Chip key={f.value} active={wordType === f.value} onClick={() => setWordType(f.value)}
                    chipBase={chipBase} chipActive={chipActive}>
                {f.label}
              </Chip>
            ))}
            <span className={`w-px h-3.5 ${darkMode ? 'bg-[#2e2c26]' : 'bg-[#e7e3d8]'} shrink-0`} />
            {DIFF_FILTERS.map((f) => (
              <Chip key={f.value} active={difficulty === f.value} onClick={() => setDifficulty(f.value)}
                    chipBase={chipBase} chipActive={chipActive}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOOK AREA (fills remaining height, no scroll) ────────────────── */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 py-4 min-h-0 overflow-hidden">
        {loading ? (
          <div className={`w-full max-w-[600px] flex-1 rounded-[3px] ${dm ? 'bg-[#1a1814]' : 'bg-[#fdfcf9]'} border ${dm ? 'border-[#2e2c26]' : 'border-[#e7e3d8]'} animate-pulse`} />
        ) : words.length === 0 ? (
          <div className="text-center py-20">
            <i className={`ti ti-book-2 text-[40px] ${metaClr}`} />
            <p className={`${metaClr} mt-2 text-sm`}>No words found. Try a different search, or add some words.</p>
          </div>
        ) : (
          <div className="w-full max-w-[600px] flex-1 flex flex-col min-h-0">
            <BookReader
              words={words}
              pageIndex={bookIndex}
              onPageChange={setBookIndex}
              onNearEnd={loadMore}
              canDelete={(w) => w.source !== 'seed'}
              onDelete={handleDelete}
              pageSize={pageSize}
              darkMode={darkMode}
            />
            {fetchingMore && (
              <p className={`text-center text-[10px] ${metaClr} mt-1`}>Loading more…</p>
            )}
            <p className={`text-center text-[10px] ${metaClr} mt-0.5`}>{total} words total</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <AddWordModal darkMode={darkMode} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />
      )}
      {showUpload && (
        <UploadJsonModal darkMode={darkMode} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />
      )}
      {showTarget && (
        <TargetModal darkMode={darkMode} current={streak?.dailyTarget || 10} onClose={() => setShowTarget(false)}
          onSaved={(s) => { setShowTarget(false); setStreak(s); }} />
      )}
    </div>
  );
}

/* ── Chip ── */
function Chip({ children, active, onClick, chipBase, chipActive }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border
        ${active ? chipActive : chipBase}`}
    >
      {children}
    </button>
  );
}

/* ── Modal shell (dark-aware) ── */
function ModalShell({ title, onClose, children, darkMode }) {
  const bg  = darkMode ? 'bg-[#1a1814] border-[#2e2c26]' : 'bg-[#faf9f4] border-[#e7e3d8]';
  const ttl = darkMode ? 'text-[#e8e3d5]' : 'text-[#1f1b14]';
  const cls = darkMode ? 'text-[#6a6350] hover:bg-[#2e2c26]' : 'text-[#a8a290] hover:bg-[#f1eee5]';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md ${bg} rounded-2xl border shadow-2xl p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-serif text-lg ${ttl}`}>{title}</h3>
          <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center ${cls}`}>
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Add Word Modal ── */
function AddWordModal({ onClose, onAdded, darkMode }) {
  const [form, setForm] = useState({ word: '', meaning: '', wordType: 'general', difficulty: 'medium', example: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const inp = darkMode
    ? 'w-full px-3 py-2.5 rounded-xl bg-[#242118] border border-[#2e2c26] text-[#e8e3d5] text-sm focus:outline-none focus:border-[#4a4538]'
    : 'w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm focus:outline-none focus:border-[#c8c2ab]';
  const btn = darkMode
    ? 'w-full py-2.5 rounded-xl bg-[#e8e3d5] text-[#1a1814] text-sm font-medium hover:bg-[#d4cfc0] disabled:opacity-50'
    : 'w-full py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50';

  async function submit(e) {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim()) return;
    setSaving(true); setError('');
    try { await addWord(form); onAdded(); }
    catch (e) { setError(e?.response?.data?.error || 'Could not add word'); }
    finally { setSaving(false); }
  }

  const TYPE_FULL = [
    { value: 'synonym', label: 'Synonym' }, { value: 'antonym', label: 'Antonym' },
    { value: 'one-word', label: 'One-Word' }, { value: 'idiom', label: 'Idiom' }, { value: 'general', label: 'General' },
  ];
  const DIFF_FULL = [
    { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' },
  ];

  return (
    <ModalShell onClose={onClose} title="Add a word" darkMode={darkMode}>
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="text-rose-500 text-xs">{error}</p>}
        <input autoFocus placeholder="Word" value={form.word}
          onChange={(e) => setForm({ ...form, word: e.target.value })} className={inp} />
        <textarea placeholder="Meaning" value={form.meaning}
          onChange={(e) => setForm({ ...form, meaning: e.target.value })}
          rows={2} className={`${inp} resize-none`} />
        <input placeholder="Example sentence (optional)" value={form.example}
          onChange={(e) => setForm({ ...form, example: e.target.value })} className={inp} />
        <div className="flex gap-2">
          <select value={form.wordType} onChange={(e) => setForm({ ...form, wordType: e.target.value })} className={`flex-1 ${inp}`}>
            {TYPE_FULL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className={`flex-1 ${inp}`}>
            {DIFF_FULL.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className={btn}>{saving ? 'Saving…' : 'Add word'}</button>
      </form>
    </ModalShell>
  );
}

/* ── Best prompts to give ChatGPT for extracting vocab as JSON ── */
const VOCAB_JSON_SHAPE = '[{"word": "Abate", "meaning": "to reduce in intensity", "type": "synonym", "difficulty": "medium", "example": "The storm finally began to abate."}]'

const PROMPT_PHOTOS = `You are helping me digitize a handwritten/printed vocabulary list from photos for my exam prep app.

Look at the attached image(s) carefully and extract every vocabulary word along with its meaning. If a word's type or difficulty isn't written, infer it sensibly.

Return ONLY a valid JSON array (no markdown, no explanation, no code fences) where each item looks exactly like this:
${VOCAB_JSON_SHAPE}

Rules:
- "type" must be one of: "synonym", "antonym", "one-word", "idiom", "general"
- "difficulty" must be one of: "easy", "medium", "hard"
- "example" is optional — include a short example sentence if you can, otherwise omit it
- Keep "meaning" short and clear (under 15 words)
- Do not skip any word visible in the image, even if handwriting is unclear — make your best guess
- Output raw JSON only, starting with [ and ending with ]`

const PROMPT_PDF = `You are helping me digitize a vocabulary list from an attached PDF for my exam prep app.

Read through the entire PDF and extract every vocabulary word along with its meaning. If a word's type or difficulty isn't mentioned, infer it sensibly.

Return ONLY a valid JSON array (no markdown, no explanation, no code fences) where each item looks exactly like this:
${VOCAB_JSON_SHAPE}

Rules:
- "type" must be one of: "synonym", "antonym", "one-word", "idiom", "general"
- "difficulty" must be one of: "easy", "medium", "hard"
- "example" is optional — include a short example sentence if you can, otherwise omit it
- Keep "meaning" short and clear (under 15 words)
- Go through the whole document, do not skip any pages or words
- Output raw JSON only, starting with [ and ending with ]`

function CopyPromptBox({ darkMode, prompt }) {
  const [copied, setCopied] = useState(false);
  const box = darkMode
    ? 'bg-[#242118] border-[#2e2c26] text-[#a8a290]'
    : 'bg-[#fdfcf9] border-[#e7e3d8] text-[#7a7460]';
  const btn = darkMode
    ? 'bg-[#2e2c26] text-[#e8e3d5] hover:bg-[#3a372e]'
    : 'bg-[#1f1b14] text-[#faf9f4] hover:bg-[#34301f]';

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard unavailable */ }
  }

  return (
    <div className={`relative rounded-xl border p-3 text-[11px] font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap ${box}`}>
      {prompt}
      <button
        onClick={copy}
        className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-sans font-medium transition-colors flex items-center gap-1 ${btn}`}
      >
        <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-[11px]`} />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/* ── Upload JSON Modal ── */
function UploadJsonModal({ onClose, onDone, darkMode }) {
  const [raw, setRaw]       = useState('');
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');
  const [result, setResult] = useState(null);
  const [sourceTab, setSourceTab] = useState('photos'); // 'photos' | 'pdf'

  const inp = darkMode
    ? 'w-full px-3 py-2.5 rounded-xl bg-[#242118] border border-[#2e2c26] text-[#e8e3d5] text-xs font-mono focus:outline-none focus:border-[#4a4538] resize-none'
    : 'w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-xs font-mono focus:outline-none focus:border-[#c8c2ab] resize-none';
  const btn = darkMode
    ? 'w-full mt-3 py-2.5 rounded-xl bg-[#e8e3d5] text-[#1a1814] text-sm font-medium hover:bg-[#d4cfc0] disabled:opacity-50'
    : 'w-full mt-3 py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50';
  const hint = darkMode ? 'text-[#6a6350]' : 'text-[#7a7460]';
  const label = darkMode ? 'text-[#e8e3d5]' : 'text-[#1f1b14]';
  const stepNum = darkMode
    ? 'bg-[#e8e3d5] text-[#1a1814]'
    : 'bg-[#1f1b14] text-[#faf9f4]';
  const tabBase = 'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors';
  const tabOn = darkMode ? 'bg-[#e8e3d5] text-[#1a1814]' : 'bg-[#1f1b14] text-[#faf9f4]';
  const tabOff = darkMode ? 'bg-[#242118] text-[#a8a290] hover:text-[#e8e3d5]' : 'bg-[#fdfcf9] text-[#7a7460] hover:text-[#1f1b14]';

  async function submit() {
    setError(''); setResult(null);
    let parsed;
    try { parsed = JSON.parse(raw); if (!Array.isArray(parsed)) throw new Error(); }
    catch { setError('Invalid JSON. Paste the exact array.'); return; }
    setBusy(true);
    try { const res = await uploadWords(parsed); setResult(res); setTimeout(() => onDone(), 900); }
    catch (e) { setError(e?.response?.data?.error || 'Upload failed'); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Upload from ChatGPT JSON" darkMode={darkMode}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${stepNum}`}>1</span>
            <p className={`text-xs font-medium ${label}`}>Send your vocab to ChatGPT</p>
          </div>
          <p className={`text-[11px] ${hint} mb-2 ml-7`}>
            Click pics of your vocab list (notes / book) or upload a PDF to ChatGPT, then paste this prompt with it:
          </p>
          <div className="ml-7 flex gap-1.5 mb-2">
            <button onClick={() => setSourceTab('photos')} className={`${tabBase} ${sourceTab === 'photos' ? tabOn : tabOff}`}>
              <i className="ti ti-camera text-[12px] mr-1" />Photos
            </button>
            <button onClick={() => setSourceTab('pdf')} className={`${tabBase} ${sourceTab === 'pdf' ? tabOn : tabOff}`}>
              <i className="ti ti-file-text text-[12px] mr-1" />PDF
            </button>
          </div>
          <div className="ml-7">
            <CopyPromptBox darkMode={darkMode} prompt={sourceTab === 'photos' ? PROMPT_PHOTOS : PROMPT_PDF} />
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${stepNum}`}>2</span>
            <p className={`text-xs font-medium ${label}`}>Copy ChatGPT's JSON reply and paste it here</p>
          </div>
          <div className="ml-7">
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={6}
              placeholder='[{"word": "Abate", "meaning": "to reduce", "type": "synonym", "difficulty": "medium"}]'
              className={inp} />
          </div>
        </div>

        {/* Step 3 */}
        <div className="ml-7">
          {error && <p className="text-rose-500 text-xs mb-1">{error}</p>}
          {result && <p className="text-emerald-600 text-xs mb-1">Added {result.upserted} new words 🎉</p>}
          <button onClick={submit} disabled={busy || !raw.trim()} className={btn.replace('mt-3','')}>
            {busy ? 'Uploading…' : 'Upload words'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Daily Target Modal ── */
function TargetModal({ current, onClose, onSaved, darkMode }) {
  const [val, setVal]       = useState(current);
  const [saving, setSaving] = useState(false);

  const inp = darkMode
    ? 'w-full px-3 py-2.5 rounded-xl bg-[#242118] border border-[#2e2c26] text-[#e8e3d5] text-sm focus:outline-none'
    : 'w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm focus:outline-none';
  const btn = darkMode
    ? 'w-full mt-3 py-2.5 rounded-xl bg-[#e8e3d5] text-[#1a1814] text-sm font-medium hover:bg-[#d4cfc0] disabled:opacity-50'
    : 'w-full mt-3 py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50';
  const hint = darkMode ? 'text-[#6a6350]' : 'text-[#7a7460]';

  async function submit() {
    setSaving(true);
    try { const s = await setDailyTarget(val); onSaved(s); }
    catch { alert('Could not update target'); }
    finally { setSaving(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Daily revision target" darkMode={darkMode}>
      <p className={`text-xs ${hint} mb-3`}>Aaj kitne words revise karna chahte ho? (5–100)</p>
      <input type="number" min={5} max={100} value={val} onChange={(e) => setVal(+e.target.value)} className={inp} />
      <button onClick={submit} disabled={saving} className={btn}>{saving ? 'Saving…' : 'Save target'}</button>
    </ModalShell>
  );
}