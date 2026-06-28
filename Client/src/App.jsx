// App.jsx
// Routes setup, PrivateRoute wrapper (useAuth), Sidebar+BottomNav conditional on screen size
// MiniPlayer always rendered when timer is active, all 12 routes

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useUserStore } from './store/userStore';
import { useBootstrap } from './hooks/useBootstrap';

// Layout
import PageLoader from './components/layout/PageLoader';
import Sidebar    from './components/layout/Sidebar';
import BottomNav  from './components/layout/BottomNav';
import MiniPlayer from './components/layout/MiniPlayer';

// Pages (lazy imports for code-splitting)
import { lazy, Suspense } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const Login        = lazy(() => import('./pages/Login'));
const Home         = lazy(() => import('./pages/Home'));
const Timer        = lazy(() => import('./pages/Timer'));
const Stats        = lazy(() => import('./pages/Stats'));
const Calendar     = lazy(() => import('./pages/Calendar'));
const History      = lazy(() => import('./pages/History'));
const Todo         = lazy(() => import('./pages/Todo'));
const Achievements = lazy(() => import('./pages/Achievements'));
const StudyGroup   = lazy(() => import('./pages/StudyGroup'));
const Wellbeing    = lazy(() => import('./pages/Wellbeing'));
const Profile      = lazy(() => import('./pages/Profile'));
const Settings     = lazy(() => import('./pages/Settings'));

// ── Games (Practice Arena) ───────────────────────────────────────────────────
const Games         = lazy(() => import('./pages/Games'));
const GameStats     = lazy(() => import('./pages/GameStats'));
const CalcClimb     = lazy(() => import('./pages/games/CalculationClimb'));
const SeriesRush    = lazy(() => import('./pages/games/NumberSeriesRush'));
const VocabBlitz    = lazy(() => import('./pages/games/VocabBlitz'));

// ── Vocab Master (personal dictionary + quiz) ────────────────────────────────
const VocabMaster = lazy(() => import('./pages/VocabMaster'));
const VocabQuiz    = lazy(() => import('./pages/VocabQuiz'));
const Syllabus     = lazy(() => import('./pages/Syllabus'));
const SyllogismStr     = lazy(() => import('./pages/games/SyllogismStrike'));
const SurvivalArena    = lazy(() => import('./pages/games/SurvivalArena'));
const GrammarGladiator = lazy(() => import('./pages/games/GrammarGladiator'));

// ── Private Route Guard ──────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Full-screen loader — imported from PageLoader.jsx ───────────────────────

// ── Shell: Sidebar + BottomNav wrap ─────────────────────────────────────────
function AppShell({ children }) {
  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-[56px] md:pb-0 overflow-y-auto h-full">
        <Suspense fallback={<PageLoader mini />}>
          {children}
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Global online status — auto-flushes sync queue when back online
  useOnlineStatus();
  const theme = useUserStore((s) => s.theme);
  useBootstrap(); // FIX: login ke baad subjects fetch + todaySeconds calculate

  return (
    <div className={theme === 'light' ? 'light' : ''}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all wrapped in AppShell */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppShell><Home /></AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/timer"
            element={
              <PrivateRoute>
                {/* Timer page is full-screen — no shell padding needed */}
                <div className="min-h-screen bg-[#0f172a]">
                  <Timer />
                </div>
              </PrivateRoute>
            }
          />
          {[
            ['/stats',              <Stats />],
            ['/calendar',           <Calendar />],
            ['/history',            <History />],
            ['/todo',               <Todo />],
            ['/achievements',       <Achievements />],
            ['/group',              <StudyGroup />],
            ['/wellbeing',          <Wellbeing />],
            ['/profile',            <Profile />],
            ['/settings',           <Settings />],
            ['/vocab',              <VocabMaster />],
            ['/vocab/quiz',         <VocabQuiz />],
            ['/syllabus',           <Syllabus />],
            // ── Practice Arena routes ─────────────────────────────────────
            ['/games',              <Games />],
            ['/games/stats',        <GameStats />],
            ['/games/calculation',  <CalcClimb />],
            ['/games/series',       <SeriesRush />],
            ['/games/vocab',        <VocabBlitz />],
            ['/games/syllogism',    <SyllogismStr />],
            ['/games/survival',     <SurvivalArena />],
            ['/games/grammar',      <GrammarGladiator />],
          ].map(([path, page]) => (
            <Route
              key={path}
              path={path}
              element={
                <PrivateRoute>
                  <AppShell>{page}</AppShell>
                </PrivateRoute>
              }
            />
          ))}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* MiniPlayer globally — persists across ALL routes including /timer */}
        <MiniPlayer />
      </Suspense>
    </div>
  );
}