import { useNavigate } from "react-router-dom";
// BUG 3 FIX: named import (useAuth is a named export, not default)
import { useAuth } from "../hooks/useAuth";
import useUserStore from "../store/userStore";
import Avatar from "../components/ui/Avatar";
import StreakBadge from "../components/ui/StreakBadge";
import LevelBadge from "../components/achievements/LevelBadge";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    displayName,
    photoURL,
    streakDays,
    totalHoursAllTime,
    dailyGoalSeconds,
  } = useUserStore();

  // BUG 9 FIX: totalHoursAllTime is already stored in HOURS (setTotalHours saves hours).
  // Was incorrectly dividing by 3600 again — that gave 0 for e.g. 100 hours.
  const totalHours = Math.floor(totalHoursAllTime);
  const totalMinutes = Math.floor((totalHoursAllTime % 1) * 60);

  const stats = [
    {
      label: "Total Hours",
      value: `${totalHours}h ${totalMinutes}m`,
      icon: "ti-clock",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Daily Goal",
      value: `${Math.floor(dailyGoalSeconds / 3600)}h`,
      icon: "ti-target",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Current Streak",
      value: `${streakDays} days`,
      icon: "ti-flame",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  const quickLinks = [
    { label: "Achievements", icon: "ti-trophy", path: "/achievements", color: "text-yellow-400" },
    { label: "Study Group", icon: "ti-users", path: "/group", color: "text-purple-400" },
    { label: "History", icon: "ti-history", path: "/history", color: "text-blue-400" },
    { label: "Settings", icon: "ti-settings", path: "/settings", color: "text-slate-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 md:pb-6">
      {/* Header / Hero */}
      <div className="relative bg-gradient-to-b from-[#1e293b] to-[#0f172a] pt-10 pb-6 px-4">
        {/* Settings shortcut */}
        <button
          onClick={() => navigate("/settings")}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <i className="ti ti-settings text-slate-400 text-base"></i>
        </button>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 relative">
            <Avatar
              photoURL={photoURL || user?.photoURL}
              name={displayName || user?.displayName || "User"}
              size="lg"
            />
            {/* Online dot */}
            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#1e293b]"></div>
          </div>

          <h1 className="text-xl font-semibold text-white mb-0.5">
            {displayName || user?.displayName || "Tapasya User"}
          </h1>
          <p className="text-xs text-slate-500 mb-4">
            {user?.email || "Guest User"}
          </p>

          {/* Streak + Level inline */}
          <div className="flex items-center gap-3">
            <StreakBadge days={streakDays} />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Level Badge */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">
            Level Progress
          </p>
          <LevelBadge totalHours={totalHoursAllTime} />
        </div>

        {/* Stats Row */}
        <div>
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">
            Your Stats
          </p>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="bg-[#1e293b] rounded-xl p-3 border border-slate-700/50 text-center"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}
                >
                  <i className={`ti ${s.icon} ${s.color} text-sm`}></i>
                </div>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">
            Quick Access
          </p>
          <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
            {quickLinks.map((link, i) => (
              <button
                key={i}
                onClick={() => navigate(link.path)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-700/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <i className={`ti ${link.icon} ${link.color} text-sm`}></i>
                  </div>
                  <span className="text-sm text-slate-200 font-medium">
                    {link.label}
                  </span>
                </div>
                <i className="ti ti-chevron-right text-slate-600 group-hover:text-slate-400 transition-colors text-sm"></i>
              </button>
            ))}
          </div>
        </div>

        {/* App version / branding */}
        <div className="text-center py-4">
          <p className="text-lg font-bold text-orange-500 tracking-tight">
            तपस्या
          </p>
          <p className="text-xs text-slate-600 mt-1">v1.0.0 · Focus. Discipline. Growth.</p>
        </div>
      </div>
    </div>
  );
}