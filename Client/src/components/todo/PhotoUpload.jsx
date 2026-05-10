// src/components/todo/PhotoUpload.jsx
// File input (image/* capture), Canvas API compress to 800px
// heic2any for HEIC, 5MB check, upload to Firebase Storage, progress bar
// import firebase/storage.js

import { useRef, useState } from 'react';
import { uploadPhoto } from '../../api/storage';
import { useAuth } from '../../hooks/useAuth';

const MAX_BYTES   = 5 * 1024 * 1024; // 5MB
const MAX_PX      = 800;

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
        'image/jpeg',
        0.82
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

export default function PhotoUpload({ onUploaded }) {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [progress,  setProgress]  = useState(0);  // 0-100
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [preview,   setPreview]   = useState('');

  async function handleFile(e) {
    let file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setProgress(0);

    // 5MB check (before compression)
    if (file.size > MAX_BYTES) {
      setError('File too large (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      // HEIC → JPEG
      if (/\.heic$/i.test(file.name) || file.type === 'image/heic') {
        setProgress(10);
        file = await convertHeic(file);
      }

      // Compress
      setProgress(25);
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });

      // Preview
      setPreview(URL.createObjectURL(compressed));
      setProgress(40);

      // Upload via REST API
      setProgress(70);
      const downloadURL = await uploadPhoto(compressedFile);
      setProgress(95);

      setProgress(100);
      onUploaded?.(downloadURL);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setPreview('');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic"
        capture="environment"
        onChange={handleFile}
        className="sr-only"
        id="photo-upload-input"
      />

      <label
        htmlFor="photo-upload-input"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors
          ${uploading
            ? 'border-slate-700 text-slate-500 bg-slate-800/40 cursor-not-allowed'
            : 'border-slate-700 text-slate-400 bg-slate-800/60 hover:border-orange-500/50 hover:text-orange-400'}`}
      >
        <i className="ti ti-camera text-base" />
        {uploading ? 'Uploading...' : 'Add photo'}
      </label>

      {/* Progress bar */}
      {uploading && (
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Preview */}
      {preview && !uploading && (
        <img
          src={preview}
          alt="Uploaded"
          className="w-20 h-20 object-cover rounded-xl border border-slate-700"
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}