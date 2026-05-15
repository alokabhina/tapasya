// src/pages/Todo.jsx
// ✅ Redesigned UI matching reference image
// ✅ Today / Upcoming / Goals tabs
// ✅ Priority (High/Medium/Low) + estimated time per task
// ✅ Today Overview sidebar (tasks completed, time planned, progress%, streak)
// ✅ History section at bottom with filters
// ✅ 4am-to-4am day logic

import { useState, useEffect, useRef } from "react";
import { getTodos, addTodo, updateTodo, deleteTodo } from "../api/todos";
import { useUserStore } from "../store/userStore";
import { useSubjectStore } from "../store/subjectStore";
import { getDateString } from "../utils/time";
import PhotoUpload from "../components/todo/PhotoUpload";
import PhotoJournal from "../components/todo/PhotoJournal";

// ── 4am-to-4am day logic ──────────────────────────────────────────────────────
function get4amDateString() {
  const now = new Date();
  if (now.getHours() < 4) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return getDateString(prev);
  }
  return getDateString(now);
}

function getUpcomingDateString(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return getDateString(d);
}

function format4amGroupDate(dateStr) {
  const today  = get4amDateString();
  const todayD = new Date(today);
  const taskD  = new Date(dateStr);
  const diff   = Math.round((todayD - taskD) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return taskD.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function formatUpcomingDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

// ── Goals localStorage ─────────────────────────────────────────────────────────
const GOALS_KEY = "tapasya_long_goals";
function loadGoals()       { try { return JSON.parse(localStorage.getItem(GOALS_KEY) || "[]"); } catch { return []; } }
function saveGoals(goals)  { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }
function daysLeft(deadline){ return Math.max(0, Math.ceil((new Date(deadline) - new Date()) / 86400000)); }

function groupByDate(tasks) {
  const groups = {};
  tasks.forEach((t) => { const d = t.date || get4amDateString(); if (!groups[d]) groups[d] = []; groups[d].push(t); });
  return Object.entries(groups).sort(([a], [b]) => (a > b ? 1 : -1));
}

// ── Priority config ───────────────────────────────────────────────────────────
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

// ── Motivational quotes ───────────────────────────────────────────────────────
const QUOTES = [
  "Discipline is the bridge between goals and accomplishment.",
  "Small steps every day lead to big results.",
  "The expert was once a beginner who never quit.",
  "Focus on progress, not perfection.",
  "Every task completed is a step toward your dream.",
];
const todayQuote = QUOTES[new Date().getDate() % QUOTES.length];

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ subjects, onClose, onAdd, defaultDate }) {
  const [text,           setText]          = useState("");
  const [subjectId,      setSubjectId]     = useState("");
  const [priority,       setPriority]      = useState("Medium");
  const [estMins,        setEstMins]       = useState("");
  const [taskDate,       setTaskDate]      = useState(defaultDate || get4amDateString());
  const [adding,         setAdding]        = useState(false);
  const [photoUrl,       setPhotoUrl]      = useState("");
  const [photoUploadedAt, setPhotoUploadedAt] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  async function handleAdd() {
    if (!text.trim() || adding) return;
    setAdding(true);
    const sub = subjects.find((s) => (s.id || s._id) === subjectId);
    await onAdd({
      text: text.trim(),
      subjectId:      subjectId || null,
      subjectName:    sub?.name  || null,
      subjectColor:   sub?.color || null,
      priority,
      estMins:        parseInt(estMins) || null,
      done:           false,
      date:           taskDate,
      photoUrl:       photoUrl || null,
      photoUploadedAt: photoUploadedAt || null,
    });
    setAdding(false);
    setText(""); setEstMins("");
    inputRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 mb-4 md:mb-0 bg-[#151f2e] rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden">
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
              <input type="date" value={taskDate} min={get4amDateString()} onChange={(e) => setTaskDate(e.target.value)}
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

// ── Goal Modal ────────────────────────────────────────────────────────────────
function GoalModal({ goal, subjects, onClose, onSave }) {
  const [title,         setTitle]         = useState(goal?.title || "");
  const [subjectId,     setSubjectId]     = useState(goal?.subjectId || "");
  const [deadline,      setDeadline]      = useState(goal?.deadline || "");
  const [totalChapters, setTotalChapters] = useState(goal?.totalChapters || "");
  const [doneChapters,  setDoneChapters]  = useState(goal?.doneChapters || 0);
  const [notes,         setNotes]         = useState(goal?.notes || "");

  function handleSave() {
    if (!title.trim() || !deadline) return;
    onSave({ id: goal?.id || Date.now().toString(), title: title.trim(), subjectId, deadline,
      totalChapters: parseInt(totalChapters) || 0, doneChapters: parseInt(doneChapters) || 0,
      notes: notes.trim(), createdAt: goal?.createdAt || new Date().toISOString() });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-[#151f2e] rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl overflow-hidden">
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
            <input type="date" value={deadline} min={get4amDateString()} onChange={(e) => setDeadline(e.target.value)}
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

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, subjects, onEdit, onDelete, onUpdateChapters }) {
  const subject   = subjects.find((s) => s.id === goal.subjectId || s._id === goal.subjectId);
  const total     = goal.totalChapters || 0;
  const done      = Math.min(goal.doneChapters || 0, total);
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const left      = daysLeft(goal.deadline);
  const remaining = total - done;
  const isOverdue = left === 0 && pct < 100;
  const perDay    = left > 0 && remaining > 0 ? Math.ceil(remaining / left) : 0;
  const color     = subject?.color || "#f97316";

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

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG["Medium"];

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 group border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 transition-colors`}>
      <button onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${task.done ? "bg-orange-500 border-orange-500" : "border-slate-600 hover:border-orange-400"}`}>
        {task.done && <i className="ti ti-check text-white text-[9px]" />}
      </button>
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
        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0 ${p.bgBadge} ${p.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          {task.priority}
        </span>
      )}
      {task.estMins && (
        <span className="text-xs text-slate-500 flex-shrink-0 font-medium tabular-nums">{formatEstTime(task.estMins)}</span>
      )}
      {/* Photo thumbnail */}
      {task.photoUrl && (
        <img
          src={task.photoUrl}
          alt="Task photo"
          title={task.photoUploadedAt ? `Uploaded: ${new Date(task.photoUploadedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}` : 'Task photo'}
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-700 cursor-pointer hover:border-orange-400 transition-colors"
          onClick={(e) => { e.stopPropagation(); window.open(task.photoUrl, '_blank'); }}
        />
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
  const done        = todayTasks.filter((t) => t.done).length;
  const total       = todayTasks.length;
  const timePlanned = todayTasks.reduce((sum, t) => sum + (t.estMins || 0), 0);
  const pct         = total > 0 ? Math.round((done / total) * 100) : 0;

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

// ── History Section ───────────────────────────────────────────────────────────
function HistorySection({ tasks }) {
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDays,    setFilterDays]    = useState(7);
  const [expanded,      setExpanded]      = useState(false);

  const todayStr  = get4amDateString();
  const cutoff    = new Date(todayStr);
  cutoff.setDate(cutoff.getDate() - filterDays + 1);
  const cutoffStr = getDateString(cutoff);

  const doneTasks = tasks
    .filter((t) => t.done && (t.date || "") <= todayStr && (t.date || "") >= cutoffStr)
    .filter((t) => filterSubject === "all" || t.subjectName === filterSubject)
    .sort((a, b) => ((b.updatedAt || b.createdAt) > (a.updatedAt || a.createdAt) ? 1 : -1));

  const subjectNames = [...new Set(tasks.filter((t) => t.done && t.subjectName).map((t) => t.subjectName))];
  const visible      = expanded ? doneTasks : doneTasks.slice(0, 5);

  function formatCompletedDate(t) {
    const d = new Date(t.updatedAt || t.createdAt || new Date());
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + " " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
  }

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">History</h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{doneTasks.length} tasks completed</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-[#1e293b] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none">
            <option value="all">All Tasks</option>
            {subjectNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterDays} onChange={(e) => setFilterDays(Number(e.target.value))}
            className="bg-[#1e293b] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none">
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 3 Months</option>
          </select>
        </div>
      </div>

      {doneTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-600">
          <i className="ti ti-history text-2xl mb-2" />
          <p className="text-sm">No completed tasks in this period</p>
        </div>
      ) : (
        <>
          <div className="hidden md:grid grid-cols-12 px-5 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800/60">
            <div className="col-span-5">Task</div>
            <div className="col-span-2">Subject</div>
            <div className="col-span-2">Time Spent</div>
            <div className="col-span-2">Completed On</div>
            <div className="col-span-1">Status</div>
          </div>
          <div className="divide-y divide-slate-800/30">
            {visible.map((task) => (
              <div key={task._id || task.id} className="grid grid-cols-1 md:grid-cols-12 px-5 py-3 items-center hover:bg-slate-800/20 transition-colors gap-1 md:gap-0">
                <div className="col-span-5 flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <i className="ti ti-check text-white text-[9px]" />
                  </div>
                  <span className="text-sm text-slate-200 truncate">{task.text}</span>
                </div>
                <div className="col-span-2 pl-7 md:pl-0">
                  {task.subjectName ? (
                    <span className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.subjectColor || "#f97316" }} />
                      <span className="text-slate-400 truncate">{task.subjectName}</span>
                    </span>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </div>
                <div className="col-span-2 pl-7 md:pl-0 text-xs text-slate-400">{task.estMins ? formatEstTime(task.estMins) : "—"}</div>
                <div className="col-span-2 pl-7 md:pl-0 text-xs text-slate-500">{formatCompletedDate(task)}</div>
                <div className="col-span-1 pl-7 md:pl-0">
                  <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Completed</span>
                </div>
              </div>
            ))}
          </div>
          {doneTasks.length > 5 && (
            <div className="flex justify-center py-3 border-t border-slate-800/60">
              <button onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-slate-800">
                {expanded ? "Show Less" : `View All History (${doneTasks.length})`}
                <i className={`ti ti-chevron-${expanded ? "up" : "down"} text-xs`} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Todo Page ─────────────────────────────────────────────────────────────
export default function Todo() {
  const uid        = useUserStore((s) => s.uid);
  const subjects   = useSubjectStore((s) => s.subjects);
  const streakDays = useUserStore((s) => s.streakDays) || 0;

  const [tab,        setTab]        = useState("today");
  const [tasks,      setTasks]      = useState([]);
  const [goals,      setGoals]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForDate, setAddForDate] = useState(null);
  const [goalModal,  setGoalModal]  = useState(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const since = getDateString(new Date(Date.now() - 90 * 86400000));
    const ahead = getUpcomingDateString(30);
    getTodos(since, ahead)
      .then((data) => { data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); setTasks(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { setGoals(loadGoals()); }, []);

  const handleAdd = async (taskData) => {
    if (!uid) return;
    try { const saved = await addTodo(taskData); setTasks((prev) => [...prev, saved]); }
    catch (e) { console.error("Add todo error:", e); }
  };

  const handleToggle = async (taskId, done) => {
    try {
      await updateTodo(taskId, { done: !done });
      setTasks((prev) => prev.map((t) => (t._id === taskId || t.id === taskId) ? { ...t, done: !done } : t));
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

  const todayStr       = get4amDateString();
  const todayTasks     = tasks.filter((t) => t.date === todayStr);
  const upcomingTasks  = tasks.filter((t) => t.date > todayStr);
  const upcomingGroups = groupByDate(upcomingTasks);
  const activeGoals    = goals.filter((g) => (g.doneChapters || 0) < (g.totalChapters || 1) || !g.totalChapters);
  const completedGoals = goals.filter((g) => g.totalChapters > 0 && (g.doneChapters || 0) >= g.totalChapters);
  const todayDone      = todayTasks.filter((t) => t.done).length;
  const todayCount     = todayTasks.length;

  function openAdd(date) { setAddForDate(date); setShowAdd(true); }

  return (
    <div className="min-h-full bg-[#0f172a] text-white">
      {/* Header */}
      <div className="px-5 pt-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Todo</h1>
            <p className="text-slate-500 text-sm mt-0.5">Plan your tasks and track your progress.</p>
          </div>
          <button onClick={() => openAdd(todayStr)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors shadow-lg shadow-orange-900/30">
            <i className="ti ti-plus text-sm" /> Add Task
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-800">
          {[
            { id: "today",    label: "Today",    icon: "ti-calendar" },
            { id: "upcoming", label: "Upcoming", icon: "ti-calendar-event" },
            { id: "goals",    label: "Goals",    icon: "ti-target" },
            { id: "journal",  label: "Journal",  icon: "ti-polaroid" },
          ].map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px
                ${tab === id ? "border-orange-500 text-orange-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
              <i className={`ti ${icon} text-sm`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TODAY TAB */}
      {tab === "today" && (
        <div className="flex flex-col xl:flex-row gap-4 p-5">
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
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold">Tasks</h3>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{todayCount} tasks</span>
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
                  <p className="text-xs mt-1 mb-4 text-slate-600">Hit "Add Task" to get started</p>
                  <button onClick={() => openAdd(todayStr)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition-colors">
                    <i className="ti ti-plus" /> Add First Task
                  </button>
                </div>
              ) : (
                <div>
                  {todayTasks.map((task) => (
                    <TaskRow key={task._id || task.id} task={task}
                      onToggle={() => handleToggle(task._id || task.id, task.done)}
                      onDelete={() => handleDelete(task._id || task.id)} />
                  ))}
                  <div className="px-5 py-2.5">
                    <button onClick={() => openAdd(todayStr)} className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      <i className="ti ti-plus text-xs" /> Add Subtask
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            <HistorySection tasks={tasks} />
          </div>

          {/* Sidebar */}
          <div className="xl:w-[280px] flex-shrink-0">
            <TodayOverview todayTasks={todayTasks} streakDays={streakDays} />
          </div>
        </div>
      )}

      {/* UPCOMING TAB */}
      {tab === "upcoming" && (
        <div className="p-5 space-y-4">
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
                        onDelete={() => handleDelete(task._id || task.id)} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* GOALS TAB */}
      {tab === "goals" && (
        <div className="p-5">
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
        <div className="p-5">
          <PhotoJournal />
        </div>
      )}

      {/* Floating + (mobile) */}
      {!showAdd && (
        <button onClick={() => openAdd(todayStr)}
          className="fixed bottom-20 right-5 md:hidden w-[52px] h-[52px] rounded-full bg-orange-500 hover:bg-orange-400 shadow-xl shadow-orange-900/40 flex items-center justify-center transition-all active:scale-95 z-40">
          <i className="ti ti-plus text-white text-xl" />
        </button>
      )}

      {showAdd && <AddTaskModal subjects={subjects} onClose={() => setShowAdd(false)} onAdd={handleAdd} defaultDate={addForDate} />}
      {goalModal && <GoalModal goal={goalModal === "new" ? null : goalModal} subjects={subjects} onClose={() => setGoalModal(null)} onSave={handleSaveGoal} />}
    </div>
  );
}