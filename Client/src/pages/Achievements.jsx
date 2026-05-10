import { useState } from "react";
import { useBadges } from "../hooks/useBadges";
import BadgeGrid from "../components/achievements/BadgeGrid";
import BadgeCard from "../components/achievements/BadgeCard";
import LevelBadge from "../components/achievements/LevelBadge";
import { useUserStore } from "../store/userStore";

export default function Achievements() {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const { badges } = useBadges();
  const totalHoursAllTime = useUserStore((s) => s.totalHoursAllTime);

  const unlockedCount = badges.filter((b) => b.unlockedAt).length;
  const totalCount = badges.length;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          Achievements
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {unlockedCount} of {totalCount} badges earned
        </p>
      </div>

      {/* Level badge */}
      <div className="px-4 mb-6">
        <LevelBadge totalHours={totalHoursAllTime || 0} />
      </div>

      {/* Progress bar for badges */}
      <div className="px-4 mb-6">
        <div className="bg-[#1e293b] rounded-xl p-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Badge collection</span>
            <span className="text-orange-400 font-medium">
              {Math.round((unlockedCount / Math.max(totalCount, 1)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-700"
              style={{
                width: `${(unlockedCount / Math.max(totalCount, 1)) * 100}%`,
              }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalCount - unlockedCount} more to unlock
          </div>
        </div>
      </div>

      {/* Badge grid */}
      <div className="px-4">
        <BadgeGrid onBadgeClick={setSelectedBadge} />
      </div>

      {/* Badge detail modal */}
      {selectedBadge && (
        <BadgeCard
          badge={selectedBadge}
          isUnlocked={!!selectedBadge.unlockedAt}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}