import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, BarChart3, Users, Settings, LogOut, Lock,
  Gamepad2, CalendarDays, Crown, Clock,
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import AdminKPIs from './AdminKPIs';
import AdminUsers from './AdminUsers';
import AdminConfig from './AdminConfig';
import AdminGames from './AdminGames';
import AdminWeekendEvents from './AdminWeekendEvents';
import AdminWinners from './AdminWinners';
import AdminGameTimeSection from './AdminGameTimeSection';

interface TabDef {
  key: string;
  label: string;
  icon: typeof BarChart3;
  path: string;
}

const TABS: TabDef[] = [
  { key: 'dashboard',  label: 'KPIs',      icon: BarChart3,    path: '/sys/admin/dashboard' },
  { key: 'players',    label: 'Players',   icon: Users,        path: '/sys/admin/players' },
  { key: 'games',      label: 'Games',     icon: Gamepad2,     path: '/sys/admin/games' },
  { key: 'events',     label: 'Events',    icon: CalendarDays, path: '/sys/admin/events' },
  { key: 'winners',    label: 'Winners',   icon: Crown,        path: '/sys/admin/winners' },
  { key: 'game-time',  label: 'Game Time', icon: Clock,        path: '/sys/admin/game-time' },
  { key: 'config',     label: 'Config',    icon: Settings,     path: '/sys/admin/config' },
];

const VALID_SECTIONS = TABS.map((t) => t.key);

export default function AdminPage({ section, subsection }: { section?: string; subsection?: string }) {
  const { authenticated, mustChangePassword, login, logout, changePassword, loading, error } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  const activeSection = section && VALID_SECTIONS.includes(section) ? section : 'dashboard';

  useEffect(() => {
    document.getElementById('root')?.classList.add('admin-wide');
    return () => { document.getElementById('root')?.classList.remove('admin-wide'); };
  }, []);

  // If at bare /sys/admin with no section, redirect to dashboard
  useEffect(() => {
    if (!section && location.pathname === '/sys/admin') {
      navigate('/sys/admin/dashboard', { replace: true });
    }
  }, [section, location.pathname, navigate]);

  const handleLogin = () => {
    if (username && password) login(username, password);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwError(null);
    await changePassword(newPassword);
  };

  if (authenticated && mustChangePassword) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center border border-torch-ember/40 bg-torch-ember/10">
          <Lock className="h-8 w-8 text-torch-ember" strokeWidth={1} />
        </div>
        <h2 className="ritual-text text-lg font-bold tracking-[0.15em]">Change Password</h2>
        <p className="text-[12px] tracking-[0.15em] text-bone-faint text-center max-w-xs">
          You must set a new password before continuing.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            className="ritual-input w-full"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="ritual-input w-full"
            onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
          />
          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="jungle-button w-full disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
          {(pwError || error) && (
            <p className="text-center text-xs text-death-glow">{pwError || error}</p>
          )}
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center border border-moss-dark/40 bg-moss-dark/20">
          <Lock className="h-8 w-8 text-torch-ember" strokeWidth={1} />
        </div>
        <h2 className="ritual-text text-lg font-bold tracking-[0.15em]">Admin Access</h2>
        <p className="text-[12px] tracking-[0.15em] text-bone-faint text-center max-w-xs">
          Enter your credentials to access the dashboard.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="ritual-input w-full"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="ritual-input w-full"
            autoComplete="current-password"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            disabled={loading || !username || !password}
            className="jungle-button w-full disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enter Dashboard'}
          </button>
          {error && (
            <p className="text-center text-xs text-death-glow">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pg-transition pg-transition--fade-in flex flex-col gap-4" style={{ padding: 16 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-torch-ember" strokeWidth={1.2} />
          <h1 className="ritual-text text-lg font-bold tracking-[0.15em]">Admin</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 border border-transparent px-3 py-1.5 text-[12px] tracking-[0.1em] uppercase text-bone-dark transition-all duration-300 hover:border-moss-dark/30 hover:text-bone-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(({ key, label, icon: Icon, path }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            className={`flex items-center gap-1.5 whitespace-nowrap border px-3 py-2 text-[12px] font-medium tracking-[0.1em] uppercase transition-all duration-300 ${
              activeSection === key
                ? 'border-torch-orange/30 bg-torch-orange/5 text-torch-ember'
                : 'border-transparent text-bone-dark hover:text-bone-muted'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'dashboard' && <AdminKPIs />}
      {activeSection === 'players' && <AdminUsers />}
      {activeSection === 'games' && <AdminGames />}
      {activeSection === 'events' && <AdminWeekendEvents />}
      {activeSection === 'winners' && <AdminWinners />}
      {activeSection === 'game-time' && <AdminGameTimeSection />}
      {activeSection === 'config' && (
        <AdminConfig
          subsection={subsection}
          onSubsectionChange={(sub) => {
            navigate(sub ? `/sys/admin/config/${sub}` : '/sys/admin/config');
          }}
        />
      )}
    </div>
  );
}
