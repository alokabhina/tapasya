// src/components/todo/PhotoUpload.jsx
// Fixed: removed capture="environment" → gallery + camera both work
// Added: date saved with photo (uploadedAt), lightbox, remove/replace, progress inside card

import { useRef, useState } from 'react';
import { uploadPhoto } from '../../api/storage';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PX    = 800;

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg', 0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

async function convertHeic(file) {
  const { default: heic2any } = await import('heic2any');
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function PhotoUpload({ onUploaded, existingPhotoURL = '', existingPhotoDate = '' }) {
  const inputRef    = useRef(null);
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [preview,   setPreview]   = useState(existingPhotoURL);
  const [photoDate, setPhotoDate] = useState(existingPhotoDate);
  const [showFull,  setShowFull]  = useState(false);

  async function handleFile(e) {
    let file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setProgress(0);

    if (file.size > MAX_BYTES) { setError('File too large (max 5MB)'); return; }

    setUploading(true);
    try {
      if (/\.heic$/i.test(file.name) || file.type === 'image/heic') {
        setProgress(10);
        file = await convertHeic(file);
      }
      setProgress(25);
      const compressed     = await compressImage(file);
      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });
      setPreview(URL.createObjectURL(compressed));
      setProgress(50);
      const downloadURL = await uploadPhoto(compressedFile);
      setProgress(95);
      const uploadedAt = new Date().toISOString();
      setPhotoDate(uploadedAt);
      setPreview(downloadURL);
      setProgress(100);
      onUploaded?.(downloadURL, uploadedAt);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setPreview(existingPhotoURL);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove(e) {
    e.stopPropagation();
    setPreview(''); setPhotoDate('');
    onUploaded?.(null, null);
  }

  return (
    <div className="space-y-1.5">
      {/* Hidden input — NO capture, so user can choose gallery or camera */}
      <input ref={inputRef} type="file" accept="image/*,.heic"
        onChange={handleFile} className="sr-only" id="photo-upload-input" />

      {preview ? (
        <div className="relative">
          {/* Attached photo card */}
          <div
            onClick={() => !uploading && setShowFull(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-700/60
                       bg-slate-800/50 cursor-pointer hover:border-orange-500/40 transition-colors select-none"
          >
            {/* Thumbnail with upload overlay */}
            <div className="relative flex-shrink-0">
              <img src={preview} alt="Task photo"
                className="w-12 h-12 rounded-lg object-cover border border-slate-700/60" />
              {uploading && (
                <div className="absolute inset-0 rounded-lg bg-black/70 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Meta info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-medium">
                {uploading ? 'Uploading…' : 'Photo attached'}
              </p>
              {photoDate && !uploading && (
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <i className="ti ti-calendar text-[10px]" />
                  {formatDate(photoDate)}
                </p>
              )}
            </div>

            {/* Actions (replace + remove) */}
            {!uploading && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <label htmlFor="photo-upload-input"
                  onClick={e => e.stopPropagation()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500
                             hover:text-orange-400 hover:bg-slate-700/60 cursor-pointer transition-colors"
                  title="Replace photo"
                >
                  <i className="ti ti-refresh text-sm" />
                </label>
                <button onClick={handleRemove}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500
                             hover:text-red-400 hover:bg-red-900/30 transition-colors"
                  title="Remove photo"
                >
                  <i className="ti ti-x text-sm" />
                </button>
              </div>
            )}
          </div>

          {/* Inline progress bar */}
          {uploading && (
            <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      ) : (
        /* Upload button */
        <label htmlFor="photo-upload-input"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium
            cursor-pointer transition-all select-none
            ${uploading
              ? 'border-slate-700 text-slate-500 bg-slate-800/30 pointer-events-none'
              : 'border-slate-700 text-slate-400 bg-slate-800/60 hover:border-orange-500/50 hover:text-orange-400 active:scale-95'}`}
        >
          <i className="ti ti-photo text-base" />
          {uploading ? 'Uploading…' : 'Add Photo'}
          {uploading && (
            <div className="ml-auto h-1 bg-slate-700 rounded-full overflow-hidden w-16">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
          )}
        </label>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <i className="ti ti-alert-circle text-sm" />{error}
        </p>
      )}

      {/* Lightbox */}
      {showFull && preview && (
        <div className="fixed inset-0 z-[500] bg-black/92 flex flex-col items-center justify-center px-4"
          onClick={() => setShowFull(false)}>
          <button onClick={() => setShowFull(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800/80
                       flex items-center justify-center text-white hover:bg-slate-700 transition">
            <i className="ti ti-x text-lg" />
          </button>
          <img src={preview} alt="Full size"
            className="max-w-[90vw] max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()} />
          {photoDate && (
            <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
              <i className="ti ti-calendar text-[11px]" />
              Uploaded on {formatDate(photoDate)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}