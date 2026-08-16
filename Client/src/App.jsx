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
import WhatsNewModal from './components/whatsnew/WhatsNewModal';

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

// ── Money (income/expense tracker — fully separate from study Stats) ───────
const Money        = lazy(() => import('./pages/Money'));
const MoneyStats   = lazy(() => import('./pages/MoneyStats'));

// ── Games (Practice Arena) ───────────────────────────────────────────────────
const Games         = lazy(() => import('./pages/Games'));
const GameStats     = lazy(() => import('./pages/GameStats'));
const CalcClimb     = lazy(() => import('./pages/games/CalculationClimb'));
const SeriesRush    = lazy(() => import('./pages/games/NumberSeriesRush'));
const VocabBlitz    = lazy(() => import('./pages/games/VocabBlitz'));

// ── Speed Math (Tables/Squares/Cubes/%-Fraction) — separate from Practice Arena ─
const SpeedMath          = lazy(() => import('./pages/SpeedMath'));
const SpeedMathReference = lazy(() => import('./pages/SpeedMathReference'));
const SpeedMathConfig    = lazy(() => import('./pages/SpeedMathConfig'));
const SpeedMathPlay      = lazy(() => import('./pages/SpeedMathPlay'));
const SpeedMathResult    = lazy(() => import('./pages/SpeedMathResult'));
const SpeedMathStats     = lazy(() => import('./pages/SpeedMathStats'));

// ── YT Study Hub (personal YouTube watchlist) ───────────────────────────────
const YTHub = lazy(() => import('./pages/YTHub'));

// ── Vocab Master (personal dictionary + quiz) ────────────────────────────────
const VocabMaster = lazy(() => import('./pages/VocabMaster'));
const VocabQuiz    = lazy(() => import('./pages/VocabQuiz'));
const QuestionBank     = lazy(() => import('./pages/QuestionBank'));
const QuestionPractice = lazy(() => import('./pages/QuestionPractice'));
const Syllabus     = lazy(() => import('./pages/Syllabus'));
const SyllogismStr     = lazy(() => import('./pages/games/SyllogismStrike'));
const SurvivalArena    = lazy(() => import('./pages/games/SurvivalArena'));
const GrammarGladiator = lazy(() => import('./pages/games/GrammarGladiator'));

// ── Admin panel (static import — admin-only, small pages) ──────────────────
const ADMIN_EMAIL = 'alokabhiii9@gmail.com';
import { AdminShell } from './pages/admin/AdminDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminGroups from './pages/admin/AdminGroups';

// ── Private Route Guard ──────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Admin Route Guard — only alokabhiii9@gmail.com can pass ─────────────────
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return <Navigate to="/" replace />;
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
      <WhatsNewModal />
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
            ['/money',              <Money />],
            ['/money/stats',        <MoneyStats />],
            ['/vocab',              <VocabMaster />],
            ['/vocab/quiz',         <VocabQuiz />],
            ['/vocab/questions',          <QuestionBank />],
            ['/vocab/questions/practice', <QuestionPractice />],
            ['/syllabus',           <Syllabus />],
            ['/yt-hub',             <YTHub />],
            // ── Practice Arena routes ─────────────────────────────────────
            ['/games',              <Games />],
            ['/games/stats',        <GameStats />],
            ['/games/calculation',  <CalcClimb />],
            ['/games/series',       <SeriesRush />],
            ['/games/vocab',        <VocabBlitz />],
            ['/games/syllogism',    <SyllogismStr />],
            ['/games/survival',     <SurvivalArena />],
            ['/games/grammar',      <GrammarGladiator />],
            // ── Speed Math routes (separate from Practice Arena) ───────────
            ['/speedmath',                 <SpeedMath />],
            ['/speedmath/learn/:module',   <SpeedMathReference />],
            ['/speedmath/config/:module',  <SpeedMathConfig />],
            ['/speedmath/play',            <SpeedMathPlay />],
            ['/speedmath/result',          <SpeedMathResult />],
            ['/speedmath/stats',           <SpeedMathStats />],
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

          {/* Admin panel — own layout, no AppShell/Sidebar wrapper */}
          <Route
            path="/admin/users/:id"
            element={<AdminRoute><AdminUserDetail /></AdminRoute>}
          />
          <Route
            path="/admin"
            element={<AdminRoute><AdminShell /></AdminRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="groups" element={<AdminGroups />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* MiniPlayer globally — persists across ALL routes including /timer */}
        <MiniPlayer />
      </Suspense>
    </div>
  );
}