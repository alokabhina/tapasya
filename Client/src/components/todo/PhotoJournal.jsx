// src/components/todo/PhotoJournal.jsx
// Daily photo journal — vertical timeline with date connectors
// Upload via gallery or camera, persistent per date, fully responsive

import { useRef, useState, useEffect } from 'react';
import { uploadPhoto } from '../../api/storage';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PX    = 1200;
const STORE_KEY = 'tapasya_photo_journal';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDateKey() {
  const now = new Date();
  if (now.getHours() < 4) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDateLabel(dateKey) {
  const today     = getDateKey();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  if (dateKey === today)     return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
    img.src = url;
  });
}

async function convertHeic(file) {
  const { default: heic2any } = await import('heic2any');
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose }) {
  const [current, setCurrent] = useState(index);
  const photo = photos[current];

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(c + 1, photos.length - 1));
      if (e.key === 'ArrowLeft')  setCurrent(c => Math.max(c - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length]);

  return (
    <div className="fixed inset-0 z-[600] bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}>
      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                   flex items-center justify-center text-white transition z-10">
        <i className="ti ti-x text-lg" />
      </button>

      {/* Nav arrows */}
      {current > 0 && (
        <button onClick={e => { e.stopPropagation(); setCurrent(c => c - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10
                     hover:bg-white/20 flex items-center justify-center text-white transition z-10">
          <i className="ti ti-chevron-left text-lg" />
        </button>
      )}
      {current < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setCurrent(c => c + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10
                     hover:bg-white/20 flex items-center justify-center text-white transition z-10">
          <i className="ti ti-chevron-right text-lg" />
        </button>
      )}

      {/* Image */}
      <img src={photo.url} alt="Journal photo"
        className="max-w-[92vw] max-h-[78vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()} />

      {/* Meta */}
      <div className="mt-4 text-center" onClick={e => e.stopPropagation()}>
        {photo.caption && (
          <p className="text-white/90 text-sm font-medium mb-1">{photo.caption}</p>
        )}
        <p className="text-white/40 text-xs">
          {formatDateLabel(photo.dateKey)} · {formatTime(photo.uploadedAt)}
          {photos.length > 1 && ` · ${current + 1} / ${photos.length}`}
        </p>
      </div>
    </div>
  );
}

// ── Single photo card ─────────────────────────────────────────────────────────
function PhotoCard({ photo, allPhotos, photoIndex, onDelete, onCaptionSave }) {
  const [editing,   setEditing]   = useState(false);
  const [caption,   setCaption]   = useState(photo.caption || '');
  const [lightbox,  setLightbox]  = useState(false);

  function saveCaption() {
    onCaptionSave(photo.id, caption.trim());
    setEditing(false);
  }

  return (
    <>
      <div className="group relative">
        {/* Photo */}
        <div className="relative overflow-hidden rounded-2xl cursor-pointer"
          style={{ aspectRatio: '4/3' }}
          onClick={() => setLightbox(true)}>
          <img src={photo.url} alt="Journal"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col
                          justify-between p-3">
            <div className="flex justify-end gap-1.5">
              <button onClick={e => { e.stopPropagation(); setEditing(true); }}
                className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center
                           text-white/80 hover:text-white hover:bg-black/70 transition">
                <i className="ti ti-pencil text-xs" />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(photo.id); }}
                className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center
                           text-white/80 hover:text-red-400 hover:bg-black/70 transition">
                <i className="ti ti-trash text-xs" />
              </button>
            </div>
            <div>
              {photo.caption && (
                <p className="text-white text-xs font-medium leading-snug line-clamp-2">{photo.caption}</p>
              )}
              <p className="text-white/60 text-[10px] mt-0.5">{formatTime(photo.uploadedAt)}</p>
            </div>
          </div>
        </div>

        {/* Caption below (mobile always visible) */}
        {photo.caption && (
          <p className="mt-1.5 text-xs text-slate-400 leading-snug line-clamp-2 sm:hidden px-0.5">
            {photo.caption}
          </p>
        )}
      </div>

      {/* Caption edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center px-4"
          onClick={() => setEditing(false)}>
          <div className="bg-[#151f2e] rounded-2xl border border-slate-700 w-full max-w-sm p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h4 className="text-white font-semibold mb-3 text-sm">Add Caption</h4>
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="What's happening in this photo?"
              rows={3} autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCaption(); } }}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2.5 text-sm
                         text-white placeholder-slate-600 focus:outline-none focus:border-orange-500
                         resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-xs text-slate-400
                           hover:bg-slate-800 transition">Cancel</button>
              <button onClick={saveCaption}
                className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-xs
                           font-semibold text-white transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox photos={allPhotos} index={photoIndex} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}

// ── Upload button ─────────────────────────────────────────────────────────────
function UploadButton({ onUploaded }) {
  const inputRef  = useRef(null);
  const [prog,    setProg]    = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleFile(e) {
    let file = e.target.files?.[0];
    if (!file) return;
    setError(''); setProg(0);
    if (file.size > MAX_BYTES) { setError('Max 5MB allowed'); return; }
    setUploading(true);
    try {
      if (/\.heic$/i.test(file.name) || file.type === 'image/heic') {
        setProg(10); file = await convertHeic(file);
      }
      setProg(25);
      const blob = await compressImage(file);
      const cf   = new File([blob], file.name, { type: 'image/jpeg' });
      setProg(55);
      const url  = await uploadPhoto(cf);
      setProg(100);
      onUploaded(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*,.heic"
        onChange={handleFile} className="sr-only" id="journal-upload" />
      <label htmlFor="journal-upload"
        className={`flex flex-col items-center justify-center gap-2 w-full rounded-2xl border-2
                    border-dashed transition-all cursor-pointer select-none
                    ${uploading
                      ? 'border-orange-500/30 bg-orange-500/5 pointer-events-none'
                      : 'border-slate-700 bg-slate-800/30 hover:border-orange-500/50 hover:bg-orange-500/5 active:scale-98'}`}
        style={{ minHeight: 110 }}>
        {uploading ? (
          <div className="flex flex-col items-center gap-2 px-4 py-3 w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${prog}%` }} />
            </div>
            <p className="text-xs text-orange-400">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 py-4">
            <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center">
              <i className="ti ti-camera-plus text-orange-400 text-xl" />
            </div>
            <p className="text-sm font-medium text-slate-300">Add Photo</p>
            <p className="text-[10px] text-slate-600 text-center">Camera or Gallery</p>
          </div>
        )}
      </label>
      {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}
    </div>
  );
}

// ── Date group ────────────────────────────────────────────────────────────────
function DateGroup({ dateKey, photos, isToday, onUpload, onDelete, onCaptionSave }) {
  const label     = formatDateLabel(dateKey);
  const allPhotos = photos; // for lightbox navigation within group

  return (
    <div className="relative">
      {/* ── Timeline node ── */}
      <div className="flex items-center gap-3 mb-3">
        {/* Dot */}
        <div className="relative flex-shrink-0 z-10">
          <div className={`w-3 h-3 rounded-full border-2 ${
            isToday
              ? 'bg-orange-500 border-orange-400 shadow-[0_0_8px_#f97316aa]'
              : 'bg-slate-700 border-slate-600'
          }`} />
        </div>

        {/* Date label */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-bold tracking-tight ${isToday ? 'text-orange-400' : 'text-slate-300'}`}>
            {label}
          </span>
          {isToday && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20
                             text-orange-400 border border-orange-500/30 uppercase tracking-wider">
              Live
            </span>
          )}
          <span className="text-[10px] text-slate-600">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Photos grid ── */}
      <div className="ml-6 pl-4 border-l-2 border-slate-800/80 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {photos.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              allPhotos={allPhotos}
              photoIndex={i}
              onDelete={onDelete}
              onCaptionSave={onCaptionSave}
            />
          ))}

          {/* Upload slot — only show on today */}
          {isToday && (
            <UploadButton onUploaded={url => onUpload(dateKey, url)} />
          )}
        </div>

        {/* Upload on past dates too — small button */}
        {!isToday && (
          <div className="mt-2">
            <label htmlFor={`journal-past-${dateKey}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800
                         text-[11px] text-slate-600 hover:text-slate-400 hover:border-slate-700
                         cursor-pointer transition-all select-none">
              <i className="ti ti-plus text-[11px]" />
              Add to this day
            </label>
            <input id={`journal-past-${dateKey}`} type="file" accept="image/*,.heic"
              className="sr-only"
              onChange={async e => {
                let file = e.target.files?.[0]; if (!file) return;
                try {
                  if (/\.heic$/i.test(file.name) || file.type === 'image/heic') file = await convertHeic(file);
                  const blob = await compressImage(file);
                  const cf   = new File([blob], file.name, { type: 'image/jpeg' });
                  const url  = await uploadPhoto(cf);
                  onUpload(dateKey, url);
                } catch {}
                e.target.value = '';
              }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main PhotoJournal ─────────────────────────────────────────────────────────
export default function PhotoJournal() {
  // entries: { [dateKey]: [{ id, url, uploadedAt, caption }] }
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  });

  function persist(next) { setEntries(next); localStorage.setItem(STORE_KEY, JSON.stringify(next)); }

  function handleUpload(dateKey, url) {
    const entry = { id: Date.now().toString(), url, uploadedAt: new Date().toISOString(), caption: '', dateKey };
    const next = { ...entries, [dateKey]: [...(entries[dateKey] || []), entry] };
    persist(next);
  }

  function handleDelete(dateKey, photoId) {
    const next = { ...entries, [dateKey]: (entries[dateKey] || []).filter(p => p.id !== photoId) };
    if (!next[dateKey].length) delete next[dateKey];
    persist(next);
  }

  function handleCaption(dateKey, photoId, caption) {
    const next = {
      ...entries,
      [dateKey]: (entries[dateKey] || []).map(p => p.id === photoId ? { ...p, caption } : p),
    };
    persist(next);
  }

  const todayKey = getDateKey();

  // Sort dates: today first, then descending
  const sortedDates = Object.keys(entries).sort((a, b) => b.localeCompare(a));
  const hasToday    = sortedDates.includes(todayKey);

  const totalPhotos = Object.values(entries).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/10
                          border border-orange-500/20 flex items-center justify-center">
            <i className="ti ti-polaroid text-orange-400 text-sm" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Photo Journal</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {totalPhotos > 0 ? `${totalPhotos} photo${totalPhotos !== 1 ? 's' : ''} · ${Object.keys(entries).length} days` : 'Capture your daily moments'}
            </p>
          </div>
        </div>

        {/* Quick upload CTA */}
        <label htmlFor="journal-upload-header"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 border
                     border-orange-500/30 text-orange-400 text-xs font-medium cursor-pointer
                     hover:bg-orange-500/25 transition-all select-none active:scale-95">
          <i className="ti ti-camera text-xs" />
          <span className="hidden sm:inline">Add Photo</span>
          <span className="sm:hidden">+</span>
        </label>
        <input id="journal-upload-header" type="file" accept="image/*,.heic"
          className="sr-only"
          onChange={async e => {
            let file = e.target.files?.[0]; if (!file) return;
            try {
              if (/\.heic$/i.test(file.name) || file.type === 'image/heic') file = await convertHeic(file);
              const blob = await compressImage(file);
              const cf   = new File([blob], file.name, { type: 'image/jpeg' });
              const url  = await uploadPhoto(cf);
              handleUpload(todayKey, url);
            } catch {}
            e.target.value = '';
          }} />
      </div>

      {/* ── Timeline body ── */}
      <div className="px-5 pt-5 pb-2">
        {/* Today — always show even if empty */}
        {!hasToday && (
          <DateGroup
            key={todayKey}
            dateKey={todayKey}
            photos={[]}
            isToday={true}
            onUpload={handleUpload}
            onDelete={(id) => handleDelete(todayKey, id)}
            onCaptionSave={(id, cap) => handleCaption(todayKey, id, cap)}
          />
        )}

        {sortedDates.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40
                            flex items-center justify-center mb-3">
              <i className="ti ti-camera-off text-2xl text-slate-700" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No photos yet</p>
            <p className="text-slate-600 text-xs mt-1">Click "Add Photo" to start your journal</p>
          </div>
        )}

        {sortedDates.map(dateKey => (
          <DateGroup
            key={dateKey}
            dateKey={dateKey}
            photos={entries[dateKey] || []}
            isToday={dateKey === todayKey}
            onUpload={handleUpload}
            onDelete={(id) => handleDelete(dateKey, id)}
            onCaptionSave={(id, cap) => handleCaption(dateKey, id, cap)}
          />
        ))}
      </div>
    </div>
  );
}