// src/pages/Todo.jsx
// ✅ 4am-to-4am daily reset logic
// ✅ Prev/Next day navigation in history
// ✅ Todo stats: per-subject counts + repeated task graphs
// ✅ Full responsive design

import { useState, useEffect, useRef, useMemo } from "react";
import { getTodos, addTodo, updateTodo, deleteTodo } from "../api/todos";
import { getWatchList } from "../api/watch";
import { useUserStore } from "../store/userStore";
import { useSubjectStore } from "../store/subjectStore";
import { getDateString, getStudyDayString } from "../utils/time";
import PhotoJournal from "../components/todo/PhotoJournal";
import VideoPlayerModal from "../components/watch/VideoPlayerModal";

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return getDateString(dt);
}

function formatDayLabel(dateStr) {
  const today = getStudyDayString();
  const yesterday = addDays(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function formatUpcomingDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function getUpcomingDateString(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return getDateString(d);
}

// ── Goals localStorage ────────────────────────────────────────────────────────
const GOALS_KEY = "tapasya_long_goals";
function loadGoals() { try { return JSON.parse(localStorage.getItem(GOALS_KEY) || "[]"); } catch { return []; } }
function saveGoals(goals) { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }
function daysLeft(deadline) { return Math.max(0, Math.ceil((new Date(deadline + "T23:59:59") - new Date()) / 86400000)); }

function groupByDate(tasks) {
  const groups = {};
  tasks.forEach((t) => {
    const d = t.date || getStudyDayString();
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });
  return Object.entries(groups).sort(([a], [b]) => a > b ? 1 : -1);
}

const PRIORITY_CONFIG = {
  High:   { dot: "bg-red-500",    badge: "text-red-400",    bgBadge: "bg-red-500/10 border-red-500/20" },
  Medium: { dot: "bg-orange-500", badge: "text-orange-400", bgBadge: "bg-orange-500/10 border-orange-500/20" },
  Low:    { dot: "bg-green-500",  badge: "text-green-400",  bgBadge: "bg-green-500/10 border-green-500/20" },
};

function formatEstTime(mins) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const QUOTES = [
  "Discipline is the bridge between goals and accomplishment.",
  "Small steps every day lead to big results.",
  "The expert was once a beginner who never quit.",
  "Focus on progress, not perfection.",
  "Every task completed is a step toward your dream.",
];
const todayQuote = QUOTES[new Date().getDate() % QUOTES.length];

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ subjects, onClose, onAdd, defaultDate }) {
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [estMins, setEstMins] = useState("");
  const [taskDate, setTaskDate] = useState(defaultDate || getStudyDayString());
  const [adding, setAdding] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [videoOptions, setVideoOptions] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [linkedVideo, setLinkedVideo] = useState(null); // { itemId, youtubeId, title, thumbnail }
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  async function handleOpenVideoPicker() {
    const next = !videoPickerOpen;
    setVideoPickerOpen(next);
    if (next && videoOptions.length === 0) {
      setVideoLoading(true);
      try {
        const items = await getWatchList({ completed: false });
        setVideoOptions(items);
      } catch { setVideoOptions([]); }
      finally { setVideoLoading(false); }
    }
  }

  function pickVideo(v) {
    setLinkedVideo({ itemId: v._id, youtubeId: v.youtubeId, title: v.title, thumbnail: v.thumbnail });
    setVideoPickerOpen(false);
  }

  async function handleAdd() {
    if (!text.trim() || adding) return;
    setAdding(true);
    const sub = subjects.find((s) => (s.id || s._id) === subjectId);
    await onAdd({
      text: text.trim(),
      subjectId: subjectId || null,
      subjectName: sub?.name || null,
      subjectColor: sub?.color || null,
      priority,
      estMins: parseInt(estMins) || null,
      done: false,
      date: taskDate,
      linkedWatchItem: linkedVideo || null,
    });
    setAdding(false);
    setText(""); setEstMins(""); setLinkedVideo(null);
    inputRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-0 sm:mx-4 mb-28 sm:mb-0 bg-[#151f2e] rounded-t-2xl sm:rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <i className="ti ti-checkbox text-orange-400 text-sm" />
              </div>
              <h3 className="text-white font-semibold">Add Task</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <i className="ti ti-x text-slate-400 text-xs" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#0f172a] rounded-xl border border-slate-700 px-3 py-2.5 mb-3 focus-within:border-orange-500 transition-colors">
            <i className="ti ti-pencil text-slate-600 text-sm flex-shrink-0" />
            <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") onClose(); }}
              placeholder="What do you need to do?"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none" />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Est. Time (min)</label>
              <input type="number" value={estMins} onChange={(e) => setEstMins(e.target.value)} placeholder="e.g. 90" min="1" max="480"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Date</label>
              <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button onClick={() => setSubjectId("")}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors ${subjectId === "" ? "bg-slate-700 text-white border-slate-600" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}>
                No subject
              </button>
              {subjects.map((s) => {
                const sid = s.id || s._id; const active = subjectId === sid;
                return (
                  <button key={sid} onClick={() => setSubjectId(sid)}
                    className="text-xs px-3 py-1 rounded-lg border transition-all"
                    style={active ? { backgroundColor: s.color + "33", borderColor: s.color, color: s.color } : { borderColor: "#1e293b", color: "#64748b" }}>
                    {active && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: s.color }} />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Optional: attach a watchlist video — completing this task also
              marks the video watched, and vice versa (see Watch tab). */}
          <div className="mb-4">
            {linkedVideo ? (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30">
                {linkedVideo.thumbnail
                  ? <img src={linkedVideo.thumbnail} alt="" className="w-10 h-7 rounded object-cover shrink-0" />
                  : <div className="w-10 h-7 rounded bg-slate-800 flex items-center justify-center shrink-0"><i className="ti ti-video text-slate-600 text-xs" /></div>}
                <span className="flex-1 text-xs text-slate-200 truncate">{linkedVideo.title}</span>
                <button onClick={() => setLinkedVideo(null)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 shrink-0">
                  <i className="ti ti-x text-xs" />
                </button>
              </div>
            ) : (
              <button onClick={handleOpenVideoPicker} type="button"
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors">
                <i className="ti ti-brand-youtube text-sm" /> Video attach karo (optional)
              </button>
            )}

            {videoPickerOpen && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] divide-y divide-slate-800">
                {videoLoading && (
                  <p className="px-3 py-3 text-xs text-slate-500 text-center">Loading...</p>
                )}
                {!videoLoading && videoOptions.length === 0 && (
                  <p className="px-3 py-3 text-xs text-slate-500 text-center">Watchlist khali hai</p>
                )}
                {!videoLoading && videoOptions.map((v) => (
                  <button key={v._id} onClick={() => pickVideo(v)} type="button"
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-800/60 transition-colors">
                    {v.thumbnail
                      ? <img src={v.thumbnail} alt="" className="w-9 h-6 rounded object-cover shrink-0" />
                      : <div className="w-9 h-6 rounded bg-slate-800 shrink-0" />}
                    <span className="flex-1 text-[11px] text-slate-300 truncate">{v.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:bg-slate-800 transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={!text.trim() || adding}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2">
              {adding ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <><i className="ti ti-plus text-sm" /> Add Task</>}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-700 mt-2">Enter to add · Esc to close</p>
        </div>
      </div>
    </div>
  );
}

// ── Goal Modal ─────────────────────────────────────────────────────────────────
function GoalModal({ goal, subjects, onClose, onSave }) {
  const [title, setTitle] = useState(goal?.title || "");
  const [subjectId, setSubjectId] = useState(goal?.subjectId || "");
  const [deadline, setDeadline] = useState(goal?.deadline || "");
  const [totalChapters, setTotalChapters] = useState(goal?.totalChapters || "");
  const [doneChapters, setDoneChapters] = useState(goal?.doneChapters || 0);
  const [notes, setNotes] = useState(goal?.notes || "");

  function handleSave() {
    if (!title.trim() || !deadline) return;
    onSave({ id: goal?.id || Date.now().toString(), title: title.trim(), subjectId, deadline,
      totalChapters: parseInt(totalChapters) || 0, doneChapters: parseInt(doneChapters) || 0,
      notes: notes.trim(), createdAt: goal?.createdAt || new Date().toISOString() });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#151f2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border border-slate-700 shadow-2xl overflow-hidden mb-28 sm:mb-0">
        <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 to-orange-400" />
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white">{goal?.id ? "Edit Goal" : "New Long-term Goal"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700"><i className="ti ti-x text-slate-400 text-sm" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Goal Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g. "Complete Maths syllabus before June 30"'
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Subject (optional)</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500">
              <option value="">No subject</option>
              {subjects.map((s) => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Deadline *</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Total Chapters</label>
              <input type="number" value={totalChapters} min="0" onChange={(e) => setTotalChapters(e.target.value)} placeholder="e.g. 20"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Completed So Far</label>
              <input type="number" value={doneChapters} min="0" max={totalChapters || 9999} onChange={(e) => setDoneChapters(e.target.value)} placeholder="e.g. 8"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any specific plan or notes..." rows={2}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || !deadline}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-sm font-medium text-white">Save Goal</button>
        </div>
      </div>
    </div>
  );
}

// ── Goal Card ──────────────────────────────────────────────────────────────────
function GoalCard({ goal, subjects, onEdit, onDelete, onUpdateChapters }) {
  const subject = subjects.find((s) => s.id === goal.subjectId || s._id === goal.subjectId);
  const total = goal.totalChapters || 0;
  const done = Math.min(goal.doneChapters || 0, total);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const left = daysLeft(goal.deadline);
  const remaining = total - done;
  const isOverdue = left === 0 && pct < 100;
  const perDay = left > 0 && remaining > 0 ? Math.ceil(remaining / left) : 0;
  const color = subject?.color || "#f97316";

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
      <div className="h-0.5 w-full" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{goal.title}</p>
            {subject && <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: color + "22", color }}>{subject.name}</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(goal)} className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700"><i className="ti ti-pencil text-slate-400 text-xs" /></button>
            <button onClick={() => onDelete(goal.id)} className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-red-900/50"><i className="ti ti-trash text-slate-400 text-xs" /></button>
          </div>
        </div>
        {total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{done}/{total} chapters</span>
              <span className="font-medium" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => onUpdateChapters(goal.id, Math.max(0, done - 1))} className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-slate-400"><i className="ti ti-minus text-[10px]" /></button>
              <span className="text-xs text-slate-500 flex-1 text-center">{remaining} remaining</span>
              <button onClick={() => onUpdateChapters(goal.id, Math.min(total, done + 1))} className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: color }}><i className="ti ti-plus text-[10px]" /></button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <i className={`ti ti-calendar ${isOverdue ? "text-red-400" : "text-slate-600"}`} />
            <span className={isOverdue ? "text-red-400 font-medium" : "text-slate-400"}>{isOverdue ? "Overdue!" : `${left} day${left !== 1 ? "s" : ""} left`}</span>
          </div>
          {perDay > 0 && <span className="text-slate-600">{perDay} ch/day</span>}
          {pct === 100 && <span className="text-green-400 font-medium flex items-center gap-1"><i className="ti ti-check text-xs" /> Done!</span>}
        </div>
        {goal.notes && <p className="mt-2 text-xs text-slate-500 italic border-t border-slate-800/60 pt-2">{goal.notes}</p>}
      </div>
    </div>
  );
}

// ── Task Row ───────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete, onPlayVideo }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG["Medium"];
  const video = task.linkedWatchItem;

  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-3.5 group border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 transition-colors">
      <button onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${task.done ? "bg-orange-500 border-orange-500" : "border-slate-600 hover:border-orange-400"}`}>
        {task.done && <i className="ti ti-check text-white text-[9px]" />}
      </button>
      {video?.itemId && (
        <button onClick={() => onPlayVideo(video)} title="Video dekho"
          className="relative w-10 h-7 rounded-md overflow-hidden bg-slate-800 flex-shrink-0 group/vid">
          {video.thumbnail
            ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><i className="ti ti-video text-slate-600 text-xs" /></div>}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
            <i className="ti ti-player-play-filled text-white text-xs" />
          </div>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm transition-all ${task.done ? "line-through text-slate-500" : "text-slate-200"}`}>{task.text}</p>
        {task.subjectName && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
            style={{ backgroundColor: (task.subjectColor || "#f97316") + "22", color: task.subjectColor || "#fb923c" }}>
            {task.subjectName}
          </span>
        )}
      </div>
      {task.priority && (
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border items-center gap-1 flex-shrink-0 hidden sm:flex ${p.bgBadge} ${p.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          {task.priority}
        </span>
      )}
      {task.priority && (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 sm:hidden ${p.dot}`} />
      )}
      {task.estMins && (
        <span className="text-xs text-slate-500 flex-shrink-0 font-medium tabular-nums">{formatEstTime(task.estMins)}</span>
      )}
      <div className="relative flex-shrink-0">
        <button onClick={() => setMenuOpen((v) => !v)}
          className="w-6 h-6 rounded-md bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          <i className="ti ti-dots-vertical text-slate-400 text-xs" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[120px]">
            <button onClick={() => { setMenuOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 transition-colors">
              <i className="ti ti-trash text-xs" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Today Overview Sidebar ────────────────────────────────────────────────────
function TodayOverview({ todayTasks, streakDays }) {
  const done = todayTasks.filter((t) => t.done).length;
  const total = todayTasks.length;
  const timePlanned = todayTasks.reduce((sum, t) => sum + (t.estMins || 0), 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function fmtTime(mins) {
    if (!mins) return "0h 0m";
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h ${m}m`;
  }

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <h3 className="text-white font-semibold text-sm">Today Overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        <div className="bg-[#0f172a] rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
            <i className="ti ti-clipboard-check text-purple-400 text-sm" />
          </div>
          <p className="text-white font-bold text-xl leading-none">{done}/{total}</p>
          <p className="text-slate-500 text-[10px] mt-1">Tasks Completed</p>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center mb-2">
            <i className="ti ti-clock text-orange-400 text-sm" />
          </div>
          <p className="text-white font-bold text-xl leading-none">{fmtTime(timePlanned)}</p>
          <p className="text-slate-500 text-[10px] mt-1">Time Planned</p>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
            <i className="ti ti-chart-donut text-green-400 text-sm" />
          </div>
          <p className="text-white font-bold text-xl leading-none">{pct}%</p>
          <p className="text-slate-500 text-[10px] mt-1">Daily Progress</p>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center mb-2">
            <i className="ti ti-flame text-orange-400 text-sm" />
          </div>
          <p className="text-white font-bold text-xl leading-none">{streakDays}</p>
          <p className="text-slate-500 text-[10px] mt-1">Day Streak</p>
        </div>
      </div>
      {total > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? "linear-gradient(90deg,#22c55e,#16a34a)" : "linear-gradient(90deg,#f97316,#fb923c)" }} />
          </div>
          <p className="text-right text-[10px] text-slate-600 mt-1">{pct}% complete</p>
        </div>
      )}
      <div className="mx-4 mb-4 bg-[#0f172a] rounded-xl p-3 border border-slate-800/60">
        <div className="flex gap-2 items-start">
          <span className="text-orange-400 text-lg font-serif leading-none">"</span>
          <p className="text-slate-400 text-[11px] leading-relaxed italic flex-1">{todayQuote}</p>
          <span className="text-orange-400 text-lg font-serif leading-none self-end">"</span>
        </div>
      </div>
    </div>
  );
}

// ── History Section with Day Navigation ──────────────────────────────────────
function HistorySection({ tasks, onToggle, onAddToToday }) {
  const todayStr = getStudyDayString();
  const [viewDate, setViewDate] = useState(todayStr);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'done' | 'undone'
  const [addedIds, setAddedIds] = useState(() => new Set()); // tasks already copied to Today this session — shows a check instead of re-adding

  function handleAddToToday(task) {
    const id = task._id || task.id;
    if (addedIds.has(id)) return; // already copied — don't duplicate on a double-click
    setAddedIds((prev) => new Set(prev).add(id));
    onAddToToday?.(task);
  }

  const canGoNext = viewDate < todayStr;

  const dayTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Match by task date (use date field for all tasks, completedAt for done tasks on that day)
      const taskDate = t.date || "";
      const completedDate = t.completedAt || "";
      const matchDate = taskDate === viewDate || (t.done && completedDate === viewDate);
      if (!matchDate) return false;
      if (filterStatus === "done" && !t.done) return false;
      if (filterStatus === "undone" && t.done) return false;
      if (filterSubject !== "all" && t.subjectName !== filterSubject) return false;
      return true;
    });
  }, [tasks, viewDate, filterSubject, filterStatus]);

  const subjectNames = useMemo(() =>
    [...new Set(tasks.filter((t) => t.subjectName).map((t) => t.subjectName))],
    [tasks]
  );

  const doneCount = dayTasks.filter(t => t.done).length;
  const totalCount = dayTasks.length;

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">History</h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {doneCount}/{totalCount} done
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status filter */}
          <div className="flex gap-0.5 bg-[#0f172a] rounded-lg border border-slate-700/50 p-0.5">
            {[{v:'all',l:'All'},{v:'done',l:'✓ Done'},{v:'undone',l:'○ Pending'}].map(({v,l}) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all
                  ${filterStatus === v ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {l}
              </button>
            ))}
          </div>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-[#1e293b] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none">
            <option value="all">All Subjects</option>
            {subjectNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Day navigator */}
          <div className="flex items-center gap-1 bg-[#0f172a] rounded-lg border border-slate-700/50 px-1 py-0.5">
            <button onClick={() => setViewDate(d => addDays(d, -1))}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
              <i className="ti ti-chevron-left text-xs" />
            </button>
            <span className="text-xs font-semibold text-slate-300 min-w-[90px] text-center">{formatDayLabel(viewDate)}</span>
            <button onClick={() => setViewDate(d => addDays(d, 1))} disabled={!canGoNext}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <i className="ti ti-chevron-right text-xs" />
            </button>
          </div>
        </div>
      </div>

      {dayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-600">
          <i className="ti ti-history text-2xl mb-2" />
          <p className="text-sm">No tasks {viewDate === todayStr ? "today" : "this day"}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/30">
          {dayTasks.map((task) => {
            const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG["Medium"];
            return (
              <div key={task._id || task.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800/20 transition-colors
                  ${task.done ? '' : 'opacity-80'}`}>
                {/* Toggle button */}
                <button
                  onClick={() => onToggle && onToggle(task._id || task.id, task.done)}
                  className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all
                    ${task.done
                      ? 'bg-green-500 border-green-500'
                      : 'border-slate-600 hover:border-orange-400 bg-transparent'}`}>
                  {task.done && <i className="ti ti-check text-white text-[9px]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${task.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {task.text}
                  </p>
                  {task.subjectName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                      style={{ backgroundColor: (task.subjectColor || "#f97316") + "22", color: task.subjectColor || "#fb923c" }}>
                      {task.subjectName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {viewDate !== todayStr && onAddToToday && (
                    <button
                      onClick={() => handleAddToToday(task)}
                      disabled={addedIds.has(task._id || task.id)}
                      title={addedIds.has(task._id || task.id) ? "Aaj mein add ho gaya" : "Aaj ke liye add karo"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                        ${addedIds.has(task._id || task.id)
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-slate-800/60 text-slate-400 hover:bg-orange-500/20 hover:text-orange-400'}`}>
                      <i className={`ti ${addedIds.has(task._id || task.id) ? 'ti-check' : 'ti-calendar-plus'} text-xs`} />
                    </button>
                  )}
                  {task.priority && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1 ${p.bgBadge} ${p.badge}`}>
                      {task.priority}
                    </span>
                  )}
                  {task.estMins && <span className="text-xs text-slate-500">{formatEstTime(task.estMins)}</span>}
                  {task.done
                    ? <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Done</span>
                    : <span className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded-full">Pending</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Stats Section ─────────────────────────────────────────────────────────────
const STAT_COLORS = ["#f97316","#a855f7","#3b82f6","#22c55e","#f59e0b","#ec4899","#06b6d4","#84cc16"];

function TodoStats({ tasks }) {
  const [days, setDays] = useState(30);

  const todayStr = getStudyDayString();
  const cutoffDate = addDays(todayStr, -(days - 1));

  const periodTasks = useMemo(() =>
    tasks.filter((t) => {
      const d = t.completedAt || t.date || "";
      return t.done && d >= cutoffDate && d <= todayStr;
    }),
    [tasks, cutoffDate, todayStr]
  );

  // Per-subject stats
  const subjectStats = useMemo(() => {
    const map = {};
    periodTasks.forEach((t) => {
      const key = t.subjectName || "No Subject";
      const color = t.subjectColor || "#64748b";
      if (!map[key]) map[key] = { name: key, color, total: 0, done: 0 };
      map[key].total++;
      map[key].done++;
    });
    // Also count pending tasks in period
    tasks.filter((t) => !t.done && (t.date || "") >= cutoffDate && (t.date || "") <= todayStr).forEach((t) => {
      const key = t.subjectName || "No Subject";
      const color = t.subjectColor || "#64748b";
      if (!map[key]) map[key] = { name: key, color, total: 0, done: 0 };
      map[key].total++;
    });
    return Object.values(map).sort((a, b) => b.done - a.done);
  }, [periodTasks, tasks, cutoffDate, todayStr]);

  // Repeated tasks — tasks with same text that appear multiple days
  const repeatedTasks = useMemo(() => {
    const textMap = {};
    periodTasks.forEach((t) => {
      const key = t.text.trim().toLowerCase();
      if (!textMap[key]) textMap[key] = { text: t.text, subjectName: t.subjectName, subjectColor: t.subjectColor, count: 0, dates: new Set() };
      textMap[key].count++;
      textMap[key].dates.add(t.completedAt || t.date || "");
    });
    return Object.values(textMap)
      .filter((x) => x.dates.size > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [periodTasks]);

  // Daily completion over period (last 14 days for graph)
  const dailyData = useMemo(() => {
    const days14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(todayStr, -i);
      const doneCnt = periodTasks.filter((t) => (t.completedAt || t.date || "") === d).length;
      days14.push({ date: d, label: d.slice(5), done: doneCnt });
    }
    return days14;
  }, [periodTasks, todayStr]);

  const maxDaily = Math.max(...dailyData.map((d) => d.done), 1);
  const totalDone = periodTasks.length;
  const uniqueDays = new Set(periodTasks.map((t) => t.completedAt || t.date || "")).size;
  const avgPerDay = uniqueDays > 0 ? (totalDone / uniqueDays).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-white font-semibold">Todo Analytics</h3>
        <div className="flex gap-1 p-1 bg-[#0f172a] rounded-xl border border-slate-800">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? "bg-orange-500 text-white" : "text-slate-500 hover:text-slate-300"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Completed", value: totalDone, icon: "ti-check", color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Active Days", value: uniqueDays, icon: "ti-calendar", color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Avg/Day", value: avgPerDay, icon: "ti-trending-up", color: "text-orange-400", bg: "bg-orange-500/10" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-[#141d2e] rounded-2xl border border-slate-800 p-3">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <i className={`ti ${icon} ${color} text-sm`} />
            </div>
            <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily completion bar chart */}
      <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-4">
        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Daily Completions (last 14 days)</p>
        {totalDone === 0 ? (
          <div className="flex items-center justify-center h-20 text-slate-600 text-sm">No data yet</div>
        ) : (
          <div className="flex items-end gap-1 h-20">
            {dailyData.map((d) => {
              const pct = d.done / maxDaily;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.label}: ${d.done} tasks`}>
                  <div className="w-full rounded-t-sm transition-all duration-500"
                    style={{ height: `${Math.max(pct * 72, d.done > 0 ? 6 : 2)}px`, backgroundColor: d.done > 0 ? `rgba(249,115,22,${0.3 + pct * 0.7})` : "#1e293b" }} />
                  <span className="text-[7px] text-slate-700 font-medium">{d.label.slice(3)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subject breakdown */}
      {subjectStats.length > 0 && (
        <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">By Subject</p>
          <div className="space-y-2.5">
            {subjectStats.map((s, i) => {
              const color = s.color !== "#64748b" ? s.color : STAT_COLORS[i % STAT_COLORS.length];
              const pct = totalDone > 0 ? Math.round((s.done / totalDone) * 100) : 0;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-slate-300 truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs font-mono text-slate-400">{s.done} done</span>
                      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Repeated tasks */}
      {repeatedTasks.length > 0 && (
        <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            <i className="ti ti-repeat text-xs mr-1" />
            Recurring Tasks
          </p>
          <div className="space-y-2">
            {repeatedTasks.map((t, i) => {
              const color = t.subjectColor || STAT_COLORS[i % STAT_COLORS.length];
              const barPct = Math.round((t.count / repeatedTasks[0].count) * 100);
              return (
                <div key={t.text} className="bg-[#0f172a] rounded-xl p-3 border border-slate-800/60">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate font-medium">{t.text}</p>
                      {t.subjectName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                          style={{ backgroundColor: color + "22", color }}>
                          {t.subjectName}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-black font-mono" style={{ color }}>{t.count}×</p>
                      <p className="text-[10px] text-slate-600">{t.dates.size} days</p>
                    </div>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalDone === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-[#141d2e] rounded-2xl border border-slate-800">
          <i className="ti ti-chart-bar text-2xl mb-2 opacity-40" />
          <p className="text-sm">Complete some tasks to see analytics</p>
        </div>
      )}
    </div>
  );
}

// ── Main Todo Page ─────────────────────────────────────────────────────────────
export default function Todo() {
  const uid = useUserStore((s) => s.uid);
  const subjects = useSubjectStore((s) => s.subjects);
  const streakDays = useUserStore((s) => s.streakDays) || 0;

  const [tab, setTab] = useState("today");
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForDate, setAddForDate] = useState(null);
  const [goalModal, setGoalModal] = useState(null);
  const [playingLinkedVideo, setPlayingLinkedVideo] = useState(null); // linkedWatchItem currently playing

  const todayStr = getStudyDayString();

  useEffect(() => {
    // Allow both logged-in users and guests (uid may be null for anonymous/guest)
    // getTodos() is offline-first — works without uid for locally created todos
    setLoading(true);
    const since = addDays(todayStr, -90);
    const ahead = getUpcomingDateString(30);
    getTodos(since, ahead)
      .then((data) => { data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); setTasks(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { setGoals(loadGoals()); }, []);

  const handleAdd = async (taskData) => {
    // Works for both logged-in users and guests — offline-first addTodo handles both
    try { const saved = await addTodo(taskData); setTasks((prev) => [...prev, saved]); }
    catch (e) { console.error("Add todo error:", e); }
  };

  // Copies a task from some past day (History) into Today — fresh, unticked,
  // as its own new task. The original stays exactly where it was in
  // History, untouched, so nothing gets "moved away" from its day's record.
  const handleAddToToday = async (task) => {
    await handleAdd({
      text: task.text,
      subjectId: task.subjectId || null,
      subjectName: task.subjectName || null,
      subjectColor: task.subjectColor || null,
      priority: task.priority || "Medium",
      estMins: task.estMins || null,
      done: false,
      date: todayStr,
      linkedWatchItem: task.linkedWatchItem || null,
    });
  };

  const handleToggle = async (taskId, done) => {
    try {
      const newDone = !done;
      // Compute completedAt locally (study-day rule — see utils/time.js)
      let completedAt = null;
      if (newDone) {
        completedAt = getStudyDayString();
      }
      await updateTodo(taskId, { done: newDone, completedAt });
      setTasks((prev) => prev.map((t) =>
        (t._id === taskId || t.id === taskId) ? { ...t, done: newDone, completedAt } : t
      ));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (taskId) => {
    try { await deleteTodo(taskId); setTasks((prev) => prev.filter((t) => t._id !== taskId && t.id !== taskId)); }
    catch (e) { console.error(e); }
  };

  function handleSaveGoal(goal) {
    const updated = goals.find((g) => g.id === goal.id) ? goals.map((g) => g.id === goal.id ? goal : g) : [...goals, goal];
    setGoals(updated); saveGoals(updated); setGoalModal(null);
  }
  function handleDeleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    const updated = goals.filter((g) => g.id !== id); setGoals(updated); saveGoals(updated);
  }
  function handleUpdateChapters(id, doneChapters) {
    const updated = goals.map((g) => g.id === id ? { ...g, doneChapters } : g);
    setGoals(updated); saveGoals(updated);
  }

  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const upcomingTasks = tasks.filter((t) => t.date > todayStr);
  const upcomingGroups = groupByDate(upcomingTasks);
  const activeGoals = goals.filter((g) => (g.doneChapters || 0) < (g.totalChapters || 1) || !g.totalChapters);
  const completedGoals = goals.filter((g) => g.totalChapters > 0 && (g.doneChapters || 0) >= g.totalChapters);
  const todayDone = todayTasks.filter((t) => t.done).length;
  const todayCount = todayTasks.length;

  function openAdd(date) { setAddForDate(date); setShowAdd(true); }

  const TABS = [
    { id: "today",    label: "Today",    icon: "ti-calendar" },
    { id: "upcoming", label: "Upcoming", icon: "ti-calendar-event" },
    { id: "stats",    label: "Stats",    icon: "ti-chart-bar" },
    { id: "goals",    label: "Goals",    icon: "ti-target" },
    { id: "journal",  label: "Journal",  icon: "ti-polaroid" },
  ];

  return (
    <div className="min-h-full bg-[#0f172a] text-white">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-5 sm:pt-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Todo</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Plan your tasks and track your progress.</p>
          </div>
          <button onClick={() => openAdd(todayStr)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs sm:text-sm font-semibold transition-colors shadow-lg shadow-orange-900/30">
            <i className="ti ti-plus text-sm" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="flex gap-0 border-b border-slate-800 overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap
                ${tab === id ? "border-orange-500 text-orange-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
              <i className={`ti ${icon} text-sm`} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TODAY TAB */}
      {tab === "today" && (
        <div className="flex flex-col xl:flex-row gap-4 p-4 sm:p-5">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Quick add bar */}
            <div className="flex items-center gap-3 bg-[#141d2e] border border-slate-800 rounded-2xl px-4 py-3">
              <button onClick={() => openAdd(todayStr)} className="flex-1 text-left text-slate-500 text-sm flex items-center gap-2 hover:text-slate-300 transition-colors">
                <i className="ti ti-calendar text-slate-600 text-sm" />Add a task...
              </button>
              <button onClick={() => openAdd(todayStr)} className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors">Add</button>
            </div>

            {/* Tasks card */}
            <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold">Tasks</h3>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{todayCount}</span>
                </div>
                {todayCount > 0 && <span className="text-xs text-slate-500">{todayDone}/{todayCount} done</span>}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                </div>
              ) : todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                    <i className="ti ti-clipboard-list text-xl text-slate-700" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No tasks for today</p>
                  <p className="text-xs mt-1 mb-4 text-slate-600">Hit "Add" to get started</p>
                  <button onClick={() => openAdd(todayStr)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition-colors">
                    <i className="ti ti-plus" /> Add First Task
                  </button>
                </div>
              ) : (
                <div>
                  {todayTasks.map((task) => (
                    <TaskRow key={task._id || task.id} task={task}
                      onToggle={() => handleToggle(task._id || task.id, task.done)}
                      onDelete={() => handleDelete(task._id || task.id)}
                      onPlayVideo={setPlayingLinkedVideo} />
                  ))}
                  <div className="px-4 sm:px-5 py-2.5">
                    <button onClick={() => openAdd(todayStr)} className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      <i className="ti ti-plus text-xs" /> Add another task
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            <HistorySection tasks={tasks} onToggle={handleToggle} onAddToToday={handleAddToToday} />
          </div>

          {/* Sidebar */}
          <div className="xl:w-[280px] flex-shrink-0">
            <TodayOverview todayTasks={todayTasks} streakDays={streakDays} />
          </div>
        </div>
      )}

      {/* UPCOMING TAB */}
      {tab === "upcoming" && (
        <div className="p-4 sm:p-5 space-y-4">
          <button onClick={() => openAdd(getUpcomingDateString(1))}
            className="flex items-center gap-3 w-full bg-[#141d2e] border border-dashed border-slate-700 rounded-2xl px-4 py-3 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all text-sm">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-calendar-plus text-slate-500 text-sm" />
            </div>
            Schedule a task for an upcoming day...
          </button>

          {upcomingGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <div className="w-14 h-14 rounded-2xl bg-[#141d2e] border border-slate-800 flex items-center justify-center mb-4">
                <i className="ti ti-calendar-event text-2xl text-slate-700" />
              </div>
              <p className="text-sm font-medium text-slate-500">No upcoming tasks</p>
              <p className="text-xs mt-1 text-slate-600">Schedule tasks for future days</p>
            </div>
          ) : (
            upcomingGroups.map(([date, dateTasks]) => {
              const done = dateTasks.filter((t) => t.done).length;
              return (
                <div key={date}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <i className="ti ti-calendar text-slate-600 text-xs" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{formatUpcomingDate(date)}</span>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-600">{done}/{dateTasks.length}</span>
                  </div>
                  <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
                    {dateTasks.map((task) => (
                      <TaskRow key={task._id || task.id} task={task}
                        onToggle={() => handleToggle(task._id || task.id, task.done)}
                        onDelete={() => handleDelete(task._id || task.id)}
                        onPlayVideo={setPlayingLinkedVideo} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* STATS TAB */}
      {tab === "stats" && (
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <TodoStats tasks={tasks} />
          )}
        </div>
      )}

      {/* GOALS TAB */}
      {tab === "goals" && (
        <div className="p-4 sm:p-5">
          <div className="flex justify-end mb-4">
            <button onClick={() => setGoalModal("new")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 text-sm font-medium transition-colors">
              <i className="ti ti-plus text-sm" /> New Goal
            </button>
          </div>
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <div className="w-14 h-14 rounded-2xl bg-[#141d2e] border border-slate-800 flex items-center justify-center mb-4">
                <i className="ti ti-target text-2xl text-slate-700" />
              </div>
              <p className="text-sm font-medium text-slate-500">No long-term goals yet</p>
              <p className="text-xs mt-1 mb-5 text-slate-600">Set a deadline-based goal to stay on track</p>
              <button onClick={() => setGoalModal("new")} className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition-colors">Create First Goal</button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.length > 0 && (<>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Goals</p>
                {activeGoals.map((g) => <GoalCard key={g.id} goal={g} subjects={subjects} onEdit={setGoalModal} onDelete={handleDeleteGoal} onUpdateChapters={handleUpdateChapters} />)}
              </>)}
              {completedGoals.length > 0 && (<>
                <p className="text-xs text-green-500/80 uppercase tracking-wider font-semibold mt-4">Completed 🎉</p>
                {completedGoals.map((g) => <GoalCard key={g.id} goal={g} subjects={subjects} onEdit={setGoalModal} onDelete={handleDeleteGoal} onUpdateChapters={handleUpdateChapters} />)}
              </>)}
            </div>
          )}
        </div>
      )}

      {/* JOURNAL TAB */}
      {tab === "journal" && (
        <div className="p-4 sm:p-5">
          <PhotoJournal />
        </div>
      )}

      {/* Floating + (mobile) */}
      {!showAdd && (
        <button onClick={() => openAdd(todayStr)}
          className="fixed bottom-20 right-4 md:hidden w-[52px] h-[52px] rounded-full bg-orange-500 hover:bg-orange-400 shadow-xl shadow-orange-900/40 flex items-center justify-center transition-all active:scale-95 z-40">
          <i className="ti ti-plus text-white text-xl" />
        </button>
      )}

      {showAdd && <AddTaskModal subjects={subjects} onClose={() => setShowAdd(false)} onAdd={handleAdd} defaultDate={addForDate} />}
      {playingLinkedVideo?.itemId && (
        <VideoPlayerModal
          item={{ _id: playingLinkedVideo.itemId, youtubeId: playingLinkedVideo.youtubeId, title: playingLinkedVideo.title }}
          onClose={() => setPlayingLinkedVideo(null)}
        />
      )}
      {goalModal && <GoalModal goal={goalModal === "new" ? null : goalModal} subjects={subjects} onClose={() => setGoalModal(null)} onSave={handleSaveGoal} />}
    </div>
  );
}