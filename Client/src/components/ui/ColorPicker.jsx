// ColorPicker.jsx
// 12 preset color swatches, tap to select, orange ring on active

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-8 h-8 rounded-lg flex-shrink-0 transition-transform active:scale-90"
          style={{
            backgroundColor: color,
            outline: value === color ? `2px solid #f97316` : '2px solid transparent',
            outlineOffset: '2px',
          }}
          aria-label={`Select color ${color}`}
          aria-pressed={value === color}
        />
      ))}
    </div>
  );
}