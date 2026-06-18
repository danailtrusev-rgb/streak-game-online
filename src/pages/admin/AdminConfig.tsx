import { useState } from 'react';
import {
  Settings, Bell, TrendingUp, Puzzle, BookOpen, Globe, HelpCircle,
  ChevronRight, ArrowLeft, Key, Trophy, Image, FileText,
} from 'lucide-react';
import AdminSettings, { type SettingsSection } from './AdminSettings';
import AdminTranslations from './AdminTranslations';
import AdminFAQ from './AdminFAQ';
import AdminQualificationRules from './AdminQualificationRules';
import AdminFlyers from './AdminFlyers';
import AdminAuditLog from './AdminAuditLog';

type SubPage =
  | null
  | 'system'
  | 'economy'
  | 'reminders'
  | 'integrations'
  | 'puzzle'
  | 'onboarding'
  | 'translations'
  | 'faq'
  | 'qualification'
  | 'flyers'
  | 'audit';

interface ConfigCard {
  key: SubPage;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const CARDS: ConfigCard[] = [
  {
    key: 'system',
    icon: <Settings className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'System Config',
    description: 'Ecosystem toggle, qualification settings, stake tiers, survival probability.',
  },
  {
    key: 'economy',
    icon: <TrendingUp className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Economy & Financial Model',
    description: 'Live allocation rates, jackpot, pool rates, RTP safety check.',
  },
  {
    key: 'reminders',
    icon: <Bell className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Reminders',
    description: 'Master toggle, send hour, active channels, message template.',
  },
  {
    key: 'integrations',
    icon: <Key className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Integrations & Credentials',
    description: 'API keys for GoHighLevel, SMS, email, and other notification providers.',
  },
  {
    key: 'puzzle',
    icon: <Puzzle className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Daily Puzzle',
    description: 'Set today\'s puzzle question, answer, and hint.',
  },
  {
    key: 'onboarding',
    icon: <BookOpen className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Onboarding Slides',
    description: 'Edit titles, body text, and images for the onboarding modal.',
  },
  {
    key: 'qualification',
    icon: <Trophy className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Qualification Rules',
    description: 'Define and manage weekly qualification criteria and tiers.',
  },
  {
    key: 'flyers',
    icon: <Image className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Flyers',
    description: 'Upload and manage promotional flyers shown to players.',
  },
  {
    key: 'translations',
    icon: <Globe className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Translations',
    description: 'Manage app strings across all supported languages.',
  },
  {
    key: 'faq',
    icon: <HelpCircle className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'FAQ',
    description: 'Add, edit, and reorder FAQ items shown to players.',
  },
  {
    key: 'audit',
    icon: <FileText className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />,
    title: 'Audit Log',
    description: 'Review admin actions and configuration change history.',
  },
];

// Subset of sections passed to AdminSettings to show only one section at a time

export default function AdminConfig() {
  const [subPage, setSubPage] = useState<SubPage>(null);

  const back = () => setSubPage(null);

  if (subPage === 'translations') {
    return (
      <SubPageWrapper title="Translations" onBack={back}>
        <AdminTranslations />
      </SubPageWrapper>
    );
  }

  if (subPage === 'faq') {
    return (
      <SubPageWrapper title="FAQ" onBack={back}>
        <AdminFAQ />
      </SubPageWrapper>
    );
  }

  if (subPage === 'qualification') {
    return (
      <SubPageWrapper title="Qualification Rules" onBack={back}>
        <AdminQualificationRules />
      </SubPageWrapper>
    );
  }

  if (subPage === 'flyers') {
    return (
      <SubPageWrapper title="Flyers" onBack={back}>
        <AdminFlyers />
      </SubPageWrapper>
    );
  }

  if (subPage === 'audit') {
    return (
      <SubPageWrapper title="Audit Log" onBack={back}>
        <AdminAuditLog />
      </SubPageWrapper>
    );
  }

  if (subPage !== null) {
    return (
      <SubPageWrapper title={CARDS.find((c) => c.key === subPage)?.title ?? ''} onBack={back}>
        <AdminSettings section={subPage as SettingsSection} />
      </SubPageWrapper>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">Config</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((card) => (
          <button
            key={card.key}
            onClick={() => setSubPage(card.key)}
            className="flex items-center gap-3 border border-moss-dark/20 bg-ritual-surface/20 px-4 py-3.5 text-left transition-colors hover:border-moss-dark/40 hover:bg-ritual-surface/40 group"
          >
            <div className="flex-shrink-0">{card.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-bone group-hover:text-bone-bright">{card.title}</div>
              <div className="text-[10px] text-bone-faint mt-0.5 leading-snug">{card.description}</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-bone-faint flex-shrink-0 group-hover:text-bone-dark" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SubPageWrapper({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-bone-dark hover:text-bone-muted transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Config
      </button>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">{title}</h2>
      </div>
      {children}
    </div>
  );
}
