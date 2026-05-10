import { useState, useEffect, useCallback } from "react";
import { getSessions, deleteSession } from "../api/sessions";
import { useUserStore } from "../store/userStore";
import HistoryFilters from "../components/history/HistoryFilters";
import SessionCard from "../components/history/SessionCard";
import SessionEditModal from "../components/history/SessionEditModal";

const PAGE_SIZE = 20;

export default function History() {
  const uid = useUserStore((s) => s.uid);
  const [allSessions, setAllSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState(null);
  const [filters, setFilters] = useState({ subjects: [], dateRange: { start: "", end: "" } });

  const fetchSessions = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await getSessions();
      // Sort newest first
      data.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      setAllSessions(data);
      setFiltered(data);
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    let result = [...allSessions];

    if (filters.subjects.length > 0) {
      result = result.filter((s) => filters.subjects.includes(s.subjectId));
    }

    if (filters.dateRange.start) {
      const start = new Date(filters.dateRange.start);
      result = result.filter((s) => new Date(s.startTime) >= start);
    }

    if (filters.dateRange.end) {
      const end = new Date(filters.dateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.startTime) <= end);
    }

    setFiltered(result);
    setPage(1);
  }, [filters, allSessions]);

  const handleDelete = async (sessionId) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await deleteSession(sessionId);
      setAllSessions((prev) => prev.filter((s) => s.id !== sessionId && s._id !== sessionId));
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleEditSave = () => {
    setEditSession(null);
    fetchSessions();
  };

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  const totalSeconds = filtered.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-semibold text-white tracking-tight">Session History</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {loading ? "Loading..." : `${filtered.length} sessions · ${totalHours}h total`}
        </p>
      </div>

      <div className="px-4 mb-4">
        <HistoryFilters onFilter={setFilters} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-sm">No sessions found</div>
          <div className="text-xs mt-1">Try changing your filters</div>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {paginated.map((session) => (
            <SessionCard
              key={session._id || session.id}
              session={session}
              onEdit={() => setEditSession(session)}
              onDelete={() => handleDelete(session._id || session.id)}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 text-sm text-orange-400 bg-[#1e293b] rounded-xl hover:bg-[#263244] transition-colors"
            >
              Load more ({filtered.length - paginated.length} remaining)
            </button>
          )}
        </div>
      )}

      <div className="h-24" />

      {editSession && (
        <SessionEditModal
          session={editSession}
          onSave={handleEditSave}
          onClose={() => setEditSession(null)}
        />
      )}
    </div>
  );
}