import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import useUserStore from "../store/userStore";
import api from "../api/client";
import Avatar from "../components/ui/Avatar";
import StreakBadge from "../components/ui/StreakBadge";
import LevelBadge from "../components/achievements/LevelBadge";
import BadgeCountPill from "../components/achievements/BadgeCountPill";

// Preset face avatars
const EMOJI_AVATARS = [
  { id: 'avatar_1',  emoji: '🧑‍💻', label: 'Coder' },
  { id: 'avatar_2',  emoji: '🧑‍🎓', label: 'Scholar' },
  { id: 'avatar_3',  emoji: '🦸',   label: 'Hero' },
  { id: 'avatar_4',  emoji: '🧙',   label: 'Wizard' },
  { id: 'avatar_5',  emoji: '🐉',   label: 'Dragon' },
  { id: 'avatar_6',  emoji: '🦊',   label: 'Fox' },
  { id: 'avatar_7',  emoji: '🐺',   label: 'Wolf' },
  { id: 'avatar_8',  emoji: '🦁',   label: 'Lion' },
  { id: 'avatar_9',  emoji: '🐻‍❄️', label: 'Polar' },
  { id: 'avatar_10', emoji: '🚀',   label: 'Rocket' },
  { id: 'avatar_11', emoji: '🌟',   label: 'Star' },
  { id: 'avatar_12', emoji: '⚡',   label: 'Thunder' },
];

function emojiToDataURL(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '72px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 68);
  return canvas.toDataURL('image/png');
}

function AvatarModal({ onClose, onSelect }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onSelect(e.target.result);
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="font-semibold text-white">Choose Avatar</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700">
            <i className="ti ti-x text-slate-400 text-sm" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Upload Photo</p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
                ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'}`}
            >
              <i className="ti ti-cloud-upload text-2xl text-slate-400 block mb-2" />
              <p className="text-slate-400 text-sm">Click or drag image here</p>
              <p className="text-slate-600 text-xs mt-1">PNG, JPG, WEBP supported</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Choose Avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => onSelect(emojiToDataURL(av.emoji))}
                  title={av.label}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-2xl transition-all hover:scale-110 border border-slate-700 hover:border-purple-500/50"
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onSelect(null)}
            className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm transition-colors"
          >
            Remove Photo (use initials)
          </button>
        </div>
      </div>
    </div>
  );
}

function NameModal({ currentName, onClose, onSave }) {
  const [name, setName] = useState(currentName || '');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="font-semibold text-white">Edit Display Name</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700">
            <i className="ti ti-x text-slate-400 text-sm" />
          </button>
        </div>
        <div className="p-5">
          <label className="text-xs text-slate-400 mb-1.5 block">Display Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim())}
            placeholder="Your name..."
            autoFocus
            maxLength={30}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-slate-600 mt-1.5">This name shows everywhere in the app.</p>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-700">Cancel</button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    displayName, photoURL, streakDays, totalHoursAllTime, dailyGoalSeconds,
    setDisplayName, setPhotoURL,
  } = useUserStore();

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showNameModal,   setShowNameModal]   = useState(false);
  const [saving,          setSaving]          = useState(false);

  const totalHours   = Math.floor(totalHoursAllTime);
  const totalMinutes = Math.floor((totalHoursAllTime % 1) * 60);

  const stats = [
    { label: "Total Hours",    value: `${totalHours}h ${totalMinutes}m`, icon: "ti-clock",  color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Daily Goal",     value: `${Math.floor(dailyGoalSeconds / 3600)}h`,            icon: "ti-target", color: "text-blue-400",   bg: "bg-blue-500/10" },
    { label: "Current Streak", value: `${streakDays} days`,              icon: "ti-flame",  color: "text-green-400",  bg: "bg-green-500/10" },
  ];

  const quickLinks = [
    { label: "Achievements", icon: "ti-trophy",  path: "/achievements", color: "text-yellow-400" },
    { label: "Study Group",  icon: "ti-users",   path: "/group",        color: "text-purple-400" },
    { label: "History",      icon: "ti-history", path: "/history",      color: "text-blue-400" },
    { label: "Settings",     icon: "ti-settings",path: "/settings",     color: "text-slate-400" },
  ];

  const currentName  = displayName || user?.displayName || 'Tapasya User';
  const currentPhoto = photoURL || user?.photoURL || null;

  // Save to both local store AND server (syncs groups too)
  async function handleAvatarSelect(url) {
    setSaving(true);
    setPhotoURL(url);          // instant local update
    setShowAvatarModal(false);
    try {
      await api.put('/auth/profile', { photoURL: url });
    } catch (e) {
      console.error('Photo sync failed:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleNameSave(name) {
    setSaving(true);
    setDisplayName(name);      // instant local update
    setShowNameModal(false);
    try {
      await api.put('/auth/profile', { displayName: name });
    } catch (e) {
      console.error('Name sync failed:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 md:pb-6">
      <div className="relative bg-gradient-to-b from-[#1e293b] to-[#0f172a] pt-10 pb-6 px-4">
        <button
          onClick={() => navigate("/settings")}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <i className="ti ti-settings text-slate-400 text-base" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Tappable avatar with edit overlay */}
          <div className="mb-3 relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
            <Avatar photoURL={currentPhoto} name={currentName} size="lg" />
            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#1e293b]" />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <i className="ti ti-camera text-white text-lg" />
            </div>
          </div>

          <button
            onClick={() => setShowAvatarModal(true)}
            className="mb-3 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full transition-colors"
          >
            <i className="ti ti-camera text-xs" /> Change Avatar
          </button>

          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-semibold text-white">{currentName}</h1>
            <button
              onClick={() => setShowNameModal(true)}
              className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
              title="Edit name"
            >
              <i className="ti ti-pencil text-slate-400 text-[10px]" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">{user?.email || "Guest User"}</p>

          <div className="flex items-center gap-3">
            <StreakBadge days={streakDays} />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">Level Progress</p>
          <LevelBadge totalHours={totalHoursAllTime} />
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">Your Stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="bg-[#1e293b] rounded-xl p-3 border border-slate-700/50 text-center">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                  <i className={`ti ${s.icon} ${s.color} text-sm`} />
                </div>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
            <BadgeCountPill variant="stat" />
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">Quick Access</p>
          <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
            {quickLinks.map((link, i) => (
              <button
                key={i}
                onClick={() => navigate(link.path)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-700/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <i className={`ti ${link.icon} ${link.color} text-sm`} />
                  </div>
                  <span className="text-sm text-slate-200 font-medium">{link.label}</span>
                  {link.path === '/achievements' && <BadgeCountPill />}
                </div>
                <i className="ti ti-chevron-right text-slate-600 group-hover:text-slate-400 transition-colors text-sm" />
              </button>
            ))}
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-lg font-bold text-orange-500 tracking-tight">तपस्या</p>
          <p className="text-xs text-slate-600 mt-1">v1.0.0 · Focus. Discipline. Growth.</p>
        </div>
      </div>

      {showAvatarModal && (
        <AvatarModal
          onClose={() => setShowAvatarModal(false)}
          onSelect={handleAvatarSelect}
        />
      )}
      {showNameModal && (
        <NameModal
          currentName={currentName}
          onClose={() => setShowNameModal(false)}
          onSave={handleNameSave}
        />
      )}
      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 flex items-center gap-2 z-50 shadow-xl">
          <div className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-300">Syncing across all devices...</span>
        </div>
      )}
    </div>
  );
}