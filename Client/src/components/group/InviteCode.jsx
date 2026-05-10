import { useEffect, useRef, useState } from 'react';

// Large mono code display + copy + QR code (qrcode.js) + Web Share API share
// Props: code (string), onRegenerate (fn) — owner only
export default function InviteCode({ code, onRegenerate, isOwner = false }) {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Generate QR code using qrcode.js (loaded via CDN or npm)
  useEffect(() => {
    if (!code || !qrRef.current) return;

    qrRef.current.innerHTML = '';

    // qrcode.js — window.QRCode should be available if loaded via CDN
    // If using npm: import QRCode from 'qrcode'; QRCode.toCanvas(...)
    if (window.QRCode) {
      new window.QRCode(qrRef.current, {
        text: `tapasya://join/${code}`,
        width: 140,
        height: 140,
        colorDark: '#f97316',
        colorLight: '#1e293b',
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    }
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select text
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tapasya Study Group',
          text: `Mere study group mein join karo! Code: ${code}`,
          url: `https://tapasya.app/join/${code}`,
        });
      } catch {
        // user cancelled share — ignore
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 border border-[#334155]">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-medium">
        Invite Code
      </p>

      {/* Large mono code */}
      <div className="text-center mb-5">
        <span className="font-mono text-4xl font-bold tracking-[0.25em] text-tapasya-orange select-all">
          {code}
        </span>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-5">
        <div
          className="rounded-xl overflow-hidden p-2 bg-[#1e293b] border border-[#334155]"
          ref={qrRef}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            copied
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-[#0f172a] text-slate-300 border border-[#334155] hover:border-tapasya-orange hover:text-tapasya-orange'
          }`}
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-base`} />
          {copied ? 'Copied!' : 'Copy'}
        </button>

        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-tapasya-orange text-white hover:bg-orange-600 transition-colors"
        >
          <i className="ti ti-share text-base" />
          Share
        </button>
      </div>

      {/* Regenerate (owner only) */}
      {isOwner && (
        <button
          onClick={onRegenerate}
          className="w-full mt-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 border border-[#334155] hover:border-[#475569] transition-colors"
        >
          <i className="ti ti-refresh mr-1" />
          Naya code generate karo
        </button>
      )}
    </div>
  );
}