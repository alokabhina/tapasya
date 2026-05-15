// src/components/layout/PageLoader.jsx
import { useState, useEffect, useRef } from 'react';

const QUOTES = [
  "Consistency beats intensity 🌱",
  "Small steps every day 📚",
  "Your future self is watching 🔥",
  "Deep work > multitasking 🧠",
  "Show up. Every single day 💪",
  "Progress, not perfection ✨",
  "One subject at a time 🎯",
  "Rest, then rise stronger 💤",
];

function TreeRing({ progress, size = 180 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const p = Math.max(0, Math.min(1, progress));

  // tree stages
  const trunkH   = p * 52;
  const trunkY   = cx + 30 - trunkH;
  const branchOp = Math.max(0, (p - 0.3) / 0.4);
  const leafOp   = Math.max(0, (p - 0.55) / 0.35);
  const leafScale= 0.3 + leafOp * 0.7;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      {/* progress arc */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="url(#lg)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - p)}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#22c55e" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* trunk */}
      {trunkH > 0 && (
        <rect x={cx - 4} y={trunkY} width="8" height={trunkH}
          rx="3" fill="#854d0e"
          style={{ transition: 'y 0.3s ease, height 0.3s ease' }}
        />
      )}

      {/* branches */}
      <line x1={cx} y1={trunkY + trunkH * 0.5} x2={cx - 18} y2={trunkY + trunkH * 0.3}
        stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" opacity={branchOp}
        style={{ transition: 'opacity 0.5s' }} />
      <line x1={cx} y1={trunkY + trunkH * 0.38} x2={cx + 16} y2={trunkY + trunkH * 0.2}
        stroke="#16a34a" strokeWidth="3" strokeLinecap="round" opacity={branchOp}
        style={{ transition: 'opacity 0.5s' }} />

      {/* foliage */}
      <g opacity={leafOp} style={{ transition: 'opacity 0.5s', transformOrigin: `${cx}px ${trunkY}px`, transform: `scale(${leafScale})` }}>
        <ellipse cx={cx - 12} cy={trunkY - 10} rx="14" ry="13" fill="#15803d" opacity="0.85" />
        <ellipse cx={cx + 11} cy={trunkY - 8}  rx="13" ry="11" fill="#166534" opacity="0.85" />
        <ellipse cx={cx}      cy={trunkY - 18} rx="16" ry="15" fill="#22c55e" />
        <ellipse cx={cx - 4}  cy={trunkY - 24} rx="9"  ry="8"  fill="#4ade80" opacity="0.6" />
      </g>
    </svg>
  );
}

export default function PageLoader({ mini = false }) {
  const [progress, setProgress] = useState(0);
  const [quote, setQuote]       = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const start = useRef(Date.now());

  useEffect(() => {
    const CYCLE = 3200; // ms — ring completes & restarts every 3.2s
    const id = setInterval(() => {
      const t = (Date.now() - start.current) % CYCLE;
      setProgress(t / CYCLE); // linear 0→1 loop, never stops
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  if (mini) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <TreeRing progress={progress} size={80} />
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-[#0f172a]">
      <TreeRing progress={progress} size={180} />
      <p
        key={quote}
        className="text-slate-400 text-sm text-center px-8 max-w-xs"
        style={{ animation: 'fadeIn 0.5s ease' }}
      >
        {quote}
      </p>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}