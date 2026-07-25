// src/components/home/TodoRing.jsx
import { useNavigate } from 'react-router-dom';
import CircularProgress from './CircularProgress';

export default function TodoRing({ todos = [], size = 96 }) {
  const navigate = useNavigate();
  const total = todos.length;
  const done = todos.filter((t) => t.done || t.completed).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <button
      onClick={() => navigate('/todo')}
      className="block p-0 m-0 border-0 bg-transparent shrink-0 leading-none"
    >
      <CircularProgress size={size} pct={pct} color="#a855f7" trackColor="rgba(255,255,255,0.1)">
        <i className="ti ti-checkbox text-[15px]" style={{ color: '#a855f7' }} />
        <span className="text-[12px] font-semibold text-white leading-tight">{done}/{total}</span>
        <span className="text-[9px] text-slate-500 leading-none">tasks</span>
      </CircularProgress>
    </button>
  );
}