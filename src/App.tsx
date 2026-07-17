import {
  BrowserRouter, Routes, Route, Navigate, useParams,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import AppLayout from './components/layout/AppLayout';
import GameLayout from './components/layout/GameLayout';
import HomePage from './pages/HomePage';
import PlayerLandingPage from './pages/PlayerLandingPage';
import AboutPage from './pages/AboutPage';
import GamesPage from './pages/GamesPage';
import WalletPage from './pages/WalletPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import AdminPage from './pages/admin/AdminPage';
import TestLevelPage from './pages/TestLevelPage';
import TestModeBadge from './components/ui/TestModeBadge';
import { parseTestMode } from './lib/testMode';
import { recordNotificationClickFromUrl } from './lib/notificationClick';
import OnboardingModal from './components/onboarding/OnboardingModal';
import MergeGuestProgressModal from './components/onboarding/MergeGuestProgressModal';
import { useOnboarding } from './hooks/useOnboarding';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DicePage from './pages/games/DicePage';
import PickPage from './pages/games/PickPage';
import SafeBoxPage from './pages/games/SafeBoxPage';
import PathPage from './pages/games/PathPage';
import PuzzlePage from './pages/games/PuzzlePage';
import SaturdayPage from './pages/weekend/SaturdayPage';
import SundayPage from './pages/weekend/SundayPage';
import PotPage from './pages/PotPage';
import StreakPage from './pages/StreakPage';

const testMode = parseTestMode();

function TestModeGate() {
  if (testMode.invalid || !testMode.level) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0B0F0C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <TestModeBadge levelId={null} />
        <div
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 20,
            color: '#cc2222',
            textAlign: 'center',
          }}
        >
          Invalid Test Level
        </div>
      </div>
    );
  }

  return <TestLevelPage level={testMode.level} levelId={testMode.levelId!} />;
}

function UrlErrorCleaner() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('error=') || hash.includes('error_code='))) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);
  return null;
}

function NotificationClickHandler() {
  useEffect(() => {
    recordNotificationClickFromUrl();
  }, []);
  return null;
}

const LEGACY_REDIRECT_PATHS = ['/operators', '/operator'];
const PUBLIC_LANDING_ROUTES = ['/', '/about', ...LEGACY_REDIRECT_PATHS];

function AdminConfigRoute() {
  const { subsection } = useParams();
  return <AdminPage section="config" subsection={subsection} />;
}

function AppWithOnboarding() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isGuest, pendingGuestMergeId, clearPendingGuestMergeId, loading } = useAuth();
  const location = useLocation();
  const onPublicLandingRoute = PUBLIC_LANDING_ROUTES.includes(location.pathname);

  const showMergeModal = !loading && !isGuest && !!pendingGuestMergeId;

  return (
    <>
      <UrlErrorCleaner />
      <NotificationClickHandler />
      <Routes>
        <Route path="/" element={<PlayerLandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        {LEGACY_REDIRECT_PATHS.map((path) => (
          <Route key={path} path={path} element={<Navigate to="/" replace />} />
        ))}

        <Route element={<AppLayout />}>
          <Route path="/play" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/faq" element={<FAQPage />} />
        </Route>

        <Route element={<GameLayout />}>
          <Route path="/pot" element={<PotPage />} />
          <Route path="/streak" element={<StreakPage />} />
        </Route>

        <Route element={<GameLayout />}>
          <Route path="/games/pick" element={<PickPage />} />
          <Route path="/games/safebox" element={<SafeBoxPage />} />
          <Route path="/games/dice" element={<DicePage />} />
          <Route path="/games/path" element={<PathPage />} />
          <Route path="/games/puzzle" element={<PuzzlePage />} />
          <Route path="/weekend/saturday" element={<SaturdayPage />} />
          <Route path="/weekend/sunday" element={<SundayPage />} />

          {/* Admin deep-link routes */}
          <Route path="/sys/admin" element={<AdminPage />} />
          <Route path="/sys/admin/dashboard" element={<AdminPage section="dashboard" />} />
          <Route path="/sys/admin/players" element={<AdminPage section="players" />} />
          <Route path="/sys/admin/games" element={<AdminPage section="games" />} />
          <Route path="/sys/admin/events" element={<AdminPage section="events" />} />
          <Route path="/sys/admin/winners" element={<AdminPage section="winners" />} />
          <Route path="/sys/admin/game-time" element={<AdminPage section="game-time" />} />
          <Route path="/sys/admin/config" element={<AdminPage section="config" />} />
          <Route path="/sys/admin/config/:subsection" element={<AdminConfigRoute />} />
          <Route path="/sys/admin/*" element={<AdminPage />} />
        </Route>
      </Routes>
      {!onPublicLandingRoute && showOnboarding && <OnboardingModal onClose={completeOnboarding} />}
      {!onPublicLandingRoute && showMergeModal && (
        <MergeGuestProgressModal
          guestUserId={pendingGuestMergeId!}
          onDismiss={clearPendingGuestMergeId}
          onMergeComplete={clearPendingGuestMergeId}
        />
      )}
    </>
  );
}

export default function App() {
  if (testMode.active) {
    return <TestModeGate />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <AppWithOnboarding />
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
