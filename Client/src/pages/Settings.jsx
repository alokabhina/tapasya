import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useUserStore from "../store/userStore";
import useSubjectStore from "../store/subjectStore";
import { getSubjects, addSubject, updateSubject, deleteSubject } from "../api/subjects";
import ColorPicker from "../components/ui/ColorPicker";
import BackgroundImage from "../components/ui/BackgroundImage";

function SubjectModal({ subject, onClose, onSave }) {
  const [name, setName] = useState(subject?.name || "");
  const [color, setColor] = useState(subject?.color || "#f97316");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (subject?.id) {
        await updateSubject(subject.id, { name: name.trim(), color });
      } else {
        await addSubject({ name: name.trim(), color, todaySeconds: 0 });
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="font-semibold text-white">
            {subject?.id ? "Edit Subject" : "New Subject"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <i className="ti ti-x text-slate-400 text-sm"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Subject Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Reasoning, Quant..."
              autoFocus
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-sm font-medium text-white transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme, dailyGoalSeconds, setGoal, notificationsEnabled } = useUserStore();
  const { subjects, setSubjects } = useSubjectStore();

  const [subjectModal, setSubjectModal] = useState(null);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(notificationsEnabled ?? false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getSubjects().then((data) => setSubjects(data)).catch(console.error);
  }, []);

  const reloadSubjects = async () => {
    const data = await getSubjects();
    setSubjects(data);
  };

  const goalHours = Math.round(dailyGoalSeconds / 3600);

  const handleDeleteSubject = async (sub) => {
    if (!confirm(`"${sub.name}" delete karna chahte ho?`)) return;
    try {
      await deleteSubject(sub.id);
      await reloadSubjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleNotif = async () => {
    if (!notifEnabled) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") setNotifEnabled(true);
    } else {
      setNotifEnabled(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 md:pb-6">
      <div className="sticky top-0 z-10 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors md:hidden"
        >
          <i className="ti ti-arrow-left text-slate-300 text-base"></i>
        </button>
        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-xl mx-auto">
        {/* Subjects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Subjects</p>
            <button
              onClick={() => setSubjectModal("new")}
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              <i className="ti ti-plus text-sm"></i> Add
            </button>
          </div>
          <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
            {subjects.length === 0 && (
              <div className="p-6 text-center">
                <i className="ti ti-books text-slate-600 text-2xl mb-2 block"></i>
                <p className="text-sm text-slate-500">Koi subject nahi — Add karo</p>
              </div>
            )}
            {subjects.map((sub) => (
              <div key={sub.id || sub._id} className="flex items-center justify-between px-4 py-3.5 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: sub.color || "#f97316" }}></div>
                  <span className="text-sm text-slate-200 font-medium">{sub.name}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSubjectModal(sub)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                  >
                    <i className="ti ti-pencil text-slate-400 text-xs"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <i className="ti ti-trash text-red-400 text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Goal */}
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Daily Study Goal</p>
          <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <i className="ti ti-target text-orange-400"></i>
                <span className="text-sm text-white font-medium">{goalHours} hours / day</span>
              </div>
              <span className="text-xs text-slate-500">{goalHours * 60} min</span>
            </div>
            <input
              type="range" min={1} max={16} step={1} value={goalHours}
              onChange={(e) => setGoal(parseInt(e.target.value) * 3600)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #f97316 ${((goalHours - 1) / 15) * 100}%, #1e293b ${((goalHours - 1) / 15) * 100}%)` }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-slate-600">1h</span>
              <span className="text-xs text-slate-600">16h</span>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Appearance</p>
          <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <i className="ti ti-moon text-slate-400 text-base"></i>
                <div>
                  <p className="text-sm text-white font-medium">Dark Mode</p>
                  <p className="text-xs text-slate-500 mt-0.5">{theme === "dark" ? "Dark theme on" : "Light theme on"}</p>
                </div>
              </div>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`relative w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-orange-500" : "bg-slate-600"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="border-t border-slate-700/50">
              <button
                onClick={() => setShowBgPicker(!showBgPicker)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-700/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <i className="ti ti-photo text-slate-400 text-base"></i>
                  <div className="text-left">
                    <p className="text-sm text-white font-medium">Background Image</p>
                    <p className="text-xs text-slate-500 mt-0.5">Timer screen background</p>
                  </div>
                </div>
                <i className={`ti ${showBgPicker ? "ti-chevron-up" : "ti-chevron-down"} text-slate-500 text-sm`}></i>
              </button>
              {showBgPicker && <div className="px-4 pb-4"><BackgroundImage /></div>}
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Notifications</p>
          <div className="bg-[#1e293b] rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <i className="ti ti-bell text-slate-400 text-base"></i>
                <div>
                  <p className="text-sm text-white font-medium">Push Notifications</p>
                  <p className="text-xs text-slate-500 mt-0.5">Break reminders aur session alerts</p>
                </div>
              </div>
              <button
                onClick={handleToggleNotif}
                className={`relative w-12 h-6 rounded-full transition-colors ${notifEnabled ? "bg-orange-500" : "bg-slate-600"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Account</p>
          <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-4 py-3.5 flex items-center gap-3 border-b border-slate-700/50">
              <i className="ti ti-user text-slate-400 text-base"></i>
              <div>
                <p className="text-sm text-white font-medium">{user?.displayName || "Guest"}</p>
                <p className="text-xs text-slate-500">{user?.email || "Anonymous"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/10 transition-colors"
            >
              <i className="ti ti-logout text-red-400 text-base"></i>
              <span className="text-sm text-red-400 font-medium">
                {loggingOut ? "Logging out..." : "Log Out"}
              </span>
            </button>
          </div>
        </section>

        <div className="text-center pb-4">
          <p className="text-xs text-slate-600">तपस्या · v1.0.0</p>
          <p className="text-xs text-slate-700 mt-1">Focus. Discipline. Growth.</p>
        </div>
      </div>

      {subjectModal && (
        <SubjectModal
          subject={subjectModal === "new" ? null : subjectModal}
          onClose={() => setSubjectModal(null)}
          onSave={async () => { await reloadSubjects(); setSubjectModal(null); }}
        />
      )}
    </div>
  );
}