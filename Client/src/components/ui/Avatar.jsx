// Avatar.jsx
// photoURL hai → img tag, nahi → colored circle with initials
// props: photoURL, name, size (sm/md/lg)

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-lg',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Simple deterministic color from name
const BG_COLORS = [
  '#7c2d12', '#1e3a8a', '#4a1d96', '#14532d',
  '#7f1d1d', '#064e3b', '#1e1b4b', '#0c4a6e',
];
function bgFromName(name = '') {
  const idx = name.charCodeAt(0) % BG_COLORS.length;
  return BG_COLORS[idx] || '#1e293b';
}

export default function Avatar({ photoURL, name = '', size = 'md' }) {
  const cls = SIZE_MAP[size] || SIZE_MAP.md;

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || 'User avatar'}
        className={`${cls} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: bgFromName(name) }}
      aria-label={`Avatar for ${name}`}
    >
      {getInitials(name) || '?'}
    </div>
  );
}