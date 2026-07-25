// src/constants/breakTypes.js
export const BREAK_TYPES = [
  { value: 'lunch',  label: 'Lunch',  icon: 'ti-soup',     color: '#f97316' },
  { value: 'walk',   label: 'Walk',   icon: 'ti-walk',     color: '#22c55e' },
  { value: 'nap',    label: 'Nap',    icon: 'ti-bed',      color: '#818cf8' },
  { value: 'rest',   label: 'Rest',   icon: 'ti-armchair', color: '#38bdf8' },
  { value: 'custom', label: 'Custom', icon: 'ti-dots',     color: '#e879f9' },
];

export function breakTypeMeta(value) {
  return BREAK_TYPES.find((t) => t.value === value) || BREAK_TYPES[3]; // default 'rest'
}