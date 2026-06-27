// src/pages/VocabMaster.jsx
// Personal vocabulary dictionary — designed to feel like flipping through
// the pages of a physical dictionary: warm white/grey paper tones,
// serif word titles, page-turn pagination. Deliberately breaks from the
// app's dark theme because this page IS the book.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchWords, addWord, uploadWords, deleteWord, fetchVocabStats,
} from '@/api/vocab';
import BookReader from '@/components/vocab/PagedBook';

const TYPE_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'synonym',  label: 'Synonym' },
  { value: 'antonym',  label: 'Antonym' },
  { value: 'one-word', label: 'One-Word' },
  { value: 'idiom',    label: 'Idiom' },
  { value: 'general',  label: 'General' },
];

const DIFF_FILTERS = [
  { value: 'all',    label: 'All' },
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

export default function VocabMaster() {
  const navigate = useNavigate();

  const [words, setWords]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [bookIndex, setBookIndex] = useState(0); // current page being "read" in the flip book
  const [loading, setLoading]   = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [search, setSearch]     = useState('');
  const [wordType, setWordType] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [attemptedOnly, setAttemptedOnly] = useState(false);
  const [stats, setStats]       = useState(null);

  const [showAdd, setShowAdd]       = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchingRef = useRef(false);

  // Fresh load — called whenever search/filters change. Resets the book to page 1.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWords({ search, wordType, difficulty, attempted: attemptedOnly, page: 1, limit: 40 });
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
  }, [search, wordType, difficulty, attemptedOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchVocabStats().then(setStats).catch(() => {});
  }, [words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the next backend page and append it, so the book keeps going without a hard refresh.
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || page >= pages) return;
    fetchingRef.current = true;
    setFetchingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchWords({ search, wordType, difficulty, attempted: attemptedOnly, page: nextPage, limit: 40 });
      setWords((w) => [...w, ...data.words]);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingMore(false);
      fetchingRef.current = false;
    }
  }, [page, pages, search, wordType, difficulty, attemptedOnly]);

  async function handleDelete(id) {
    if (!confirm('Remove this word from your dictionary?')) return;
    try {
      await deleteWord(id);
      setWords((w) => {
        const next = w.filter((x) => x._id !== id);
        const maxPage = Math.max(0, Math.ceil(next.length / 5) - 1);
        setBookIndex((i) => Math.min(i, maxPage));
        return next;
      });
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e?.response?.data?.error || 'Could not delete word');
    }
  }

  return (
    <div className="min-h-full bg-[#f3f1e9]">
      {/* ── Header (compact) ── */}
      <div className="bg-[#faf9f4] border-b border-[#e7e3d8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="font-serif text-[19px] sm:text-[21px] text-[#1f1b14] tracking-tight whitespace-nowrap">
                शब्दकोश <span className="text-[#9c9580] text-sm font-sans">· Vocab Master</span>
              </h1>
              {stats && (
                <span className="hidden sm:flex items-center gap-3 text-[11px] text-[#9c9580] ml-2">
                  <span><b className="text-[#1f1b14]">{stats.totalWords}</b> total</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{stats.mastered}</span>
                  <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />{stats.weak}</span>
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/vocab/quiz')}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#1f1b14] text-[#faf9f4] text-xs font-medium
                         hover:bg-[#34301f] transition-colors flex items-center gap-1.5"
            >
              <i className="ti ti-bolt text-[13px]" /> Quiz
            </button>
          </div>

          {/* Search + Add/Upload — single compact row */}
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a290] text-[13px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a word…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#fdfcf9] border border-[#e7e3d8]
                           text-[#1f1b14] placeholder:text-[#a8a290] text-xs
                           focus:outline-none focus:border-[#c8c2ab]"
              />
            </div>
            <button
              onClick={() => setShowAdd(true)}
              title="Add word"
              className="w-8 h-8 shrink-0 rounded-lg bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14]
                         hover:bg-[#f1eee5] transition-colors flex items-center justify-center"
            >
              <i className="ti ti-plus text-[14px]" />
            </button>
            <button
              onClick={() => setShowUpload(true)}
              title="Upload JSON"
              className="w-8 h-8 shrink-0 rounded-lg bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14]
                         hover:bg-[#f1eee5] transition-colors flex items-center justify-center"
            >
              <i className="ti ti-upload text-[14px]" />
            </button>
          </div>

          {/* Filter chips — single horizontal scroll row, no wrapping */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto whitespace-nowrap pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip active={attemptedOnly} onClick={() => setAttemptedOnly((a) => !a)}>
              <i className="ti ti-flag-2 text-[11px] mr-1" />Attempted
            </Chip>
            <span className="w-px h-4 bg-[#e7e3d8] shrink-0" />
            {TYPE_FILTERS.map((f) => (
              <Chip key={f.value} active={wordType === f.value} onClick={() => setWordType(f.value)}>
                {f.label}
              </Chip>
            ))}
            <span className="w-px h-4 bg-[#e7e3d8] shrink-0" />
            {DIFF_FILTERS.map((f) => (
              <Chip key={f.value} active={difficulty === f.value} onClick={() => setDifficulty(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* ── Page content (the "book") ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {loading ? (
          <div className="flex justify-center">
            <div className="w-full max-w-[560px] min-h-[420px] rounded-[3px] bg-[#fdfcf9] border border-[#e7e3d8] animate-pulse" />
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-20">
            <i className="ti ti-book-2 text-[40px] text-[#c8c2ab]" />
            <p className="text-[#7a7460] mt-2">No words found. Try a different search, or add some words.</p>
          </div>
        ) : (
          <>
            <BookReader
              words={words}
              pageIndex={bookIndex}
              onPageChange={setBookIndex}
              onNearEnd={loadMore}
              canDelete={(w) => w.source !== 'seed'}
              onDelete={handleDelete}
            />
            {fetchingMore && (
              <p className="text-center text-xs text-[#a8a290] mt-3">Turning to the next page…</p>
            )}
            <p className="text-center text-xs text-[#a8a290] mt-1">{total} words in your dictionary</p>
          </>
        )}
      </div>

      {showAdd && (
        <AddWordModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
        />
      )}
      {showUpload && (
        <UploadJsonModal
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border
        ${active
          ? 'bg-[#1f1b14] text-[#faf9f4] border-[#1f1b14]'
          : 'bg-[#fdfcf9] text-[#7a7460] border-[#e7e3d8] hover:bg-[#f1eee5]'
        }`}
    >
      {children}
    </button>
  );
}

// ── Add Word Modal ────────────────────────────────────────────────────────────
function AddWordModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ word: '', meaning: '', wordType: 'general', difficulty: 'medium', example: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim()) return;
    setSaving(true); setError('');
    try {
      await addWord(form);
      onAdded();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not add word');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Add a word">
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="text-rose-500 text-xs">{error}</p>}
        <input
          autoFocus
          placeholder="Word"
          value={form.word}
          onChange={(e) => setForm({ ...form, word: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm focus:outline-none focus:border-[#c8c2ab]"
        />
        <textarea
          placeholder="Meaning"
          value={form.meaning}
          onChange={(e) => setForm({ ...form, meaning: e.target.value })}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm focus:outline-none focus:border-[#c8c2ab] resize-none"
        />
        <input
          placeholder="Example sentence (optional)"
          value={form.example}
          onChange={(e) => setForm({ ...form, example: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm focus:outline-none focus:border-[#c8c2ab]"
        />
        <div className="flex gap-2">
          <select
            value={form.wordType}
            onChange={(e) => setForm({ ...form, wordType: e.target.value })}
            className="flex-1 px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm"
          >
            {TYPE_FILTERS.filter((t) => t.value !== 'all').map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            className="flex-1 px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-sm"
          >
            {DIFF_FILTERS.filter((d) => d.value !== 'all').map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add word'}
        </button>
      </form>
    </ModalShell>
  );
}

// ── Upload JSON Modal ──────────────────────────────────────────────────────────
function UploadJsonModal({ onClose, onDone }) {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function submit() {
    setError(''); setResult(null);
    let parsed;
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('not array');
    } catch {
      setError('Invalid JSON. Paste the exact array ChatGPT gave you.');
      return;
    }
    setBusy(true);
    try {
      const res = await uploadWords(parsed);
      setResult(res);
      setTimeout(() => onDone(), 900);
    } catch (e) {
      setError(e?.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Upload from ChatGPT JSON">
      <p className="text-xs text-[#7a7460] mb-2">
        Paste the JSON array you got from ChatGPT — format: word, meaning, type, difficulty.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        placeholder='[{"word": "Abate", "meaning": "to reduce", "type": "synonym", "difficulty": "medium"}]'
        className="w-full px-3 py-2.5 rounded-xl bg-[#fdfcf9] border border-[#e7e3d8] text-[#1f1b14] text-xs font-mono
                   focus:outline-none focus:border-[#c8c2ab] resize-none"
      />
      {error && <p className="text-rose-500 text-xs mt-2">{error}</p>}
      {result && <p className="text-emerald-600 text-xs mt-2">Added {result.upserted} new words 🎉</p>}
      <button
        onClick={submit}
        disabled={busy || !raw.trim()}
        className="w-full mt-3 py-2.5 rounded-xl bg-[#1f1b14] text-[#faf9f4] text-sm font-medium hover:bg-[#34301f] disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload words'}
      </button>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }) {
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