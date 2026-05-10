// CircularProgressRing.jsx
// SVG circle ring — animated stroke-dashoffset
// props: progress (0-100), color, size, strokeWidth

export default function CircularProgressRing({
  progress = 0,
  color = '#f97316',
  size = 240,
  strokeWidth = 12,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      aria-hidden="true"
    >
      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth={strokeWidth}
      />

      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: `${center}px ${center}px`,
          transition: 'stroke-dashoffset 0.5s ease',
        }}
      />
    </svg>
  );
}