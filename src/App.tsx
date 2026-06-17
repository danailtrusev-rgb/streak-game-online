import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import AppLayout from './components/layout/AppLayout';
import GameLayout from './components/layout/GameLayout';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import WalletPage from './pages/WalletPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SettingsPage from './pages/SettingsPage';
import FAQPage from './pages/FAQPage';
import AdminPage from './pages/admin/AdminPage';
import TestLevelPage from './pages/TestLevelPage';
import TestModeBadge from './components/ui/TestModeBadge';
import { parseTestMode } from './lib/testMode';
import OnboardingModal from './components/onboarding/OnboardingModal';
import MergeGuestProgressModal from './components/onboarding/MergeGuestProgressModal';
import { useOnboarding } from './hooks/useOnboarding';
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
      // Strip the error hash left by Supabase email-change links so the app isn't stuck
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);
  return null;
}

function AppWithOnboarding() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isGuest, pendingGuestMergeId, clearPendingGuestMergeId, loading } = useAuth();

  // Show merge modal when: not loading, not guest (just logged in), and we have a pending guest ID
  const showMergeModal = !loading && !isGuest && !!pendingGuestMergeId;

  return (
    <>
      <UrlErrorCleaner />
      <Routes>
        {/* Standard app pages — GameHUD header + BottomNav always visible */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/faq" element={<FAQPage />} />
        </Route>

        {/* Pot and Streak — full-screen pages, no player header/footer */}
        <Route element={<GameLayout />}>
          <Route path="/pot" element={<PotPage />} />
          <Route path="/streak" element={<StreakPage />} />
        </Route>

        {/* Game screens and admin — no player header/footer */}
        <Route element={<GameLayout />}>
          <Route path="/games/pick" element={<PickPage />} />
          <Route path="/games/safebox" element={<SafeBoxPage />} />
          <Route path="/games/dice" element={<DicePage />} />
          <Route path="/games/path" element={<PathPage />} />
          <Route path="/games/puzzle" element={<PuzzlePage />} />
          <Route path="/weekend/saturday" element={<SaturdayPage />} />
          <Route path="/weekend/sunday" element={<SundayPage />} />
          <Route path="/sys/admin" element={<AdminPage />} />
        </Route>
      </Routes>
      {showOnboarding && <OnboardingModal onClose={completeOnboarding} />}
      {showMergeModal && (
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
