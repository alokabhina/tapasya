import { useState, useEffect } from 'react';
import { useSubjectStore } from '../../store/subjectStore';
import { updateSession } from '../../api/sessions';
import { useAuth } from '../../hooks/useAuth';

function tsToInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SessionEditModal({ session, onClose, onSaved, onSave }) {
  const { user } = useAuth();
  const subjects = useSubjectStore((s) => s.subjects);

  const [subjectId, setSubjectId] = useState(session?.subjectId || '');
  const [startTime, setStartTime] = useState(tsToInput(session?.startTime));
  const [endTime,   setEndTime]   = useState(tsToInput(session?.endTime));
  const [notes,     setNotes]     = useState(session?.notes || '');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (!startTime || !endTime) { setError('Start and end time required'); return; }
    const start = new Date(startTime);
    const end   = new Date(endTime);
    if (end <= start) { setError('End time must be after start time'); return; }

    const subj = subjects.find((s) => s.id === subjectId || s._id === subjectId);
    const duration = Math.round((end - start) / 1000);

    setSaving(true);
    setError('');
    try {
      const sessionId = session._id || session.id;
      await updateSession(sessionId, {
        subjectId,
        subjectName:  subj?.name  || session.subjectName,
        subjectColor: subj?.color || session.subjectColor,
        startTime: start,
        endTime:   end,
        durationSeconds: duration,
        notes,
      });
      onSaved?.();
      onSave?.();
      onClose?.();
    } catch (e) {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-[#1a2234] border border-slate-700/50 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">Edit Session</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
          >
            <i className="ti ti-x text-xs text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500"
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Start Time</label>
            <input
              type="datetime-local" value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">End Time</label>
            <input
              type="datetime-local" value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="What did you study?"
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 resize-none placeholder-slate-600"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}