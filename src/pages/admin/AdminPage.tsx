import { useState } from 'react';
import {
  Shield, BarChart3, Users, Settings, FileText, LogOut, Lock,
  Gamepad2, Trophy, CalendarDays, Image, Crown, Layers, PenLine,
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import AdminKPIs from './AdminKPIs';
import AdminUsers from './AdminUsers';
import AdminSettings from './AdminSettings';
import AdminAuditLog from './AdminAuditLog';
import AdminGames from './AdminGames';
import AdminQualificationRules from './AdminQualificationRules';
import AdminWeekendEvents from './AdminWeekendEvents';
import AdminFlyers from './AdminFlyers';
import AdminWinners from './AdminWinners';
import AdminSkullGatePreview from './AdminSkullGatePreview';
import AdminSceneEditor from './scene-editor/AdminSceneEditor';

const tabs = [
  { key: 'kpis', label: 'KPIs', icon: BarChart3 },
  { key: 'users', label: 'Players', icon: Users },
  { key: 'games', label: 'Games', icon: Gamepad2 },
  { key: 'qualification', label: 'Qual Rules', icon: Trophy },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'flyers', label: 'Flyers', icon: Image },
  { key: 'winners', label: 'Winners', icon: Crown },
  { key: 'settings', label: 'Config', icon: Settings },
  { key: 'audit', label: 'Audit', icon: FileText },
  { key: 'gate_preview', label: 'Gate Preview', icon: Layers },
  { key: 'scene_editor', label: 'Scene Editor', icon: PenLine },
];

export default function AdminPage() {
  const { authenticated, mustChangePassword, login, logout, changePassword, loading, error } = useAdmin();
  const [activeTab, setActiveTab] = useState('kpis');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

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
        <p className="text-[10px] tracking-[0.15em] text-bone-faint text-center max-w-xs">
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
        <p className="text-[10px] tracking-[0.15em] text-bone-faint text-center max-w-xs">
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
    <div className="pg-transition pg-transition--fade-in flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-torch-ember" strokeWidth={1.2} />
          <h1 className="ritual-text text-lg font-bold tracking-[0.15em]">Admin</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 border border-transparent px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-bone-dark transition-all duration-300 hover:border-moss-dark/30 hover:text-bone-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap border px-3 py-2 text-[10px] font-medium tracking-[0.1em] uppercase transition-all duration-300 ${
              activeTab === key
                ? 'border-torch-orange/30 bg-torch-orange/5 text-torch-ember'
                : 'border-transparent text-bone-dark hover:text-bone-muted'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'kpis' && <AdminKPIs />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'games' && <AdminGames />}
      {activeTab === 'qualification' && <AdminQualificationRules />}
      {activeTab === 'events' && <AdminWeekendEvents />}
      {activeTab === 'flyers' && <AdminFlyers />}
      {activeTab === 'winners' && <AdminWinners />}
      {activeTab === 'settings' && <AdminSettings />}
      {activeTab === 'audit' && <AdminAuditLog />}
      {activeTab === 'gate_preview' && <AdminSkullGatePreview />}
      {activeTab === 'scene_editor' && <AdminSceneEditor />}
    </div>
  );
}
