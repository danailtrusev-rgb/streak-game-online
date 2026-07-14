import { useEffect, useState } from 'react';
import { Save, Check, Settings, Puzzle, BookOpen, Coins, AlertTriangle, Info } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export type SettingsSection = 'system' | 'economy' | 'reminders' | 'integrations' | 'puzzle' | 'onboarding' | 'all';

interface SettingRow {
  key: string;
  value_json: unknown;
}

interface OnboardingSlide {
  id: string;
  title: string;
  body: string;
  image_url: string;
}

// Keys rendered in dedicated sections
const PUZZLE_KEYS    = ['daily_puzzle_question', 'daily_puzzle_answer', 'daily_puzzle_hint'];
const JACKPOT_KEYS   = ['jackpot_contribution_rate'];
const ONBOARDING_KEY = 'onboarding_slides';

const REMINDER_KEYS = ['reminders_enabled', 'reminder_send_hour', 'reminder_channels', 'reminder_message'];
const REMINDER_CHANNELS = ['email', 'sms', 'whatsapp', 'telegram', 'discord'] as const;

const INTEGRATION_KEYS = [
  'ghl_api_key',
  'transactional_email_service', 'sendgrid_api_key', 'resend_api_key', 'reminder_from_email',
  'sms_service', 'twilio_account_sid', 'twilio_auth_token', 'twilio_from_number',
];

// Economy v1 — now-live allocation settings (affect pot, jackpot, and pool behavior per play)
const ECONOMY_LIVE_ALLOC_KEYS = [
  'daily_streak_value_rate',
  'jackpot_allocation_rate',
  'saturday_pool_allocation_rate',
  'sunday_pool_allocation_rate',
] as const;

// Cost & margin assumptions — planning only, no live effect
const ECONOMY_COST_KEYS = [
  'payment_processing_rate',
  'fraud_risk_buffer_rate',
  'affiliate_promo_budget_rate',
  'target_gross_margin_rate',
] as const;

// RTP safety check settings (editable thresholds)
const ECONOMY_RTP_KEYS = [
  'blended_rtp_target',
  'hard_rtp_cap',
] as const;

const ALL_ECONOMY_KEYS = [
  ...ECONOMY_LIVE_ALLOC_KEYS,
  ...ECONOMY_COST_KEYS,
  ...ECONOMY_RTP_KEYS,
];

interface EconomySettingMeta {
  label: string;
  description: string;
  unit: '%';
  defaultValue: number;
}

const ECONOMY_META: Record<string, EconomySettingMeta> = {
  hard_rtp_cap: {
    label: 'Hard RTP Cap',
    description: 'Safety threshold — show warning if modeled player value exceeds this.',
    unit: '%', defaultValue: 55,
  },
  daily_streak_value_rate: {
    label: 'Daily / Streak Player Value Rate',
    description: 'Fraction of stake added to pot on survive. Live — affects pot accrual per play.',
    unit: '%', defaultValue: 35,
  },
  jackpot_allocation_rate: {
    label: 'Jackpot Allocation Rate',
    description: 'Target share of all stakes flowing to the jackpot pool. Derived contribution rate = this ÷ fail rate.',
    unit: '%', defaultValue: 6,
  },
  saturday_pool_allocation_rate: {
    label: 'Saturday Pool Allocation Rate',
    description: 'Share of every stake allocated to the Saturday pool. Live — pool balances updated each play.',
    unit: '%', defaultValue: 3,
  },
  sunday_pool_allocation_rate: {
    label: 'Sunday Pool Allocation Rate',
    description: 'Share of every stake allocated to the Sunday pool. Live — pool balances updated each play.',
    unit: '%', defaultValue: 4,
  },
  blended_rtp_target: {
    label: 'Blended RTP Target',
    description: 'Target blended Return-to-Player for planning and margin calculations.',
    unit: '%', defaultValue: 48,
  },
  payment_processing_rate: {
    label: 'Payment Processing Rate',
    description: 'Worst-case cost assumption for payment processing.',
    unit: '%', defaultValue: 9,
  },
  fraud_risk_buffer_rate: {
    label: 'Fraud / Risk Buffer',
    description: 'Reserved buffer for fraud and risk management costs.',
    unit: '%', defaultValue: 4,
  },
  affiliate_promo_budget_rate: {
    label: 'Affiliate / Promo Budget',
    description: 'Budget allocation for affiliate and promotional activity.',
    unit: '%', defaultValue: 10,
  },
  target_gross_margin_rate: {
    label: 'Target Gross Margin',
    description: 'Target gross margin after all allocations and cost assumptions.',
    unit: '%', defaultValue: 29,
  },
};

// Human-readable metadata for known system config keys
const SETTING_META: Record<string, { label: string; description: string; type: 'number' | 'boolean' | 'json' | 'text'; min?: number; max?: number; step?: string }> = {
  ecosystem_active: {
    label: 'Ecosystem Active',
    description: 'Master switch for the qualification and weekend event ecosystem. Set to false to disable the full ecosystem.',
    type: 'boolean',
  },
  milestones: {
    label: 'Streak Milestones',
    description: 'JSON array of milestone days that trigger bonus recognition (e.g. [{"days":7},{"days":14},{"days":30}]).',
    type: 'json',
  },
  onboarding_enabled: {
    label: 'Onboarding Enabled',
    description: 'Show the onboarding modal to new players. Set to false to skip onboarding.',
    type: 'boolean',
  },
  qualification_week_start_day: {
    label: 'Qualification Week Start Day',
    description: 'Day of week when the qualification week resets. 1 = Monday, 7 = Sunday.',
    type: 'number',
    min: 1,
    max: 7,
  },
  saturday_qualification_cutoff: {
    label: 'Saturday Qualification Cutoff',
    description: 'Minimum points required to qualify for the Saturday Showdown event.',
    type: 'number',
    min: 0,
    step: '1',
  },
  stake_tiers: {
    label: 'Stake Tiers',
    description: 'JSON array defining stake tiers (tier, stake_cents, unlock_streak). Handle with care — changes take effect immediately.',
    type: 'json',
  },
  sunday_qualification_cutoff: {
    label: 'Sunday Qualification Cutoff',
    description: 'Minimum points required to qualify for the Sunday Crown event.',
    type: 'number',
    min: 0,
    step: '1',
  },
  survival_probability: {
    label: 'Survival Probability',
    description: 'Probability (0.0–0.6) that a player survives the daily gate. E.g. 0.5 = 50% survival rate.',
    type: 'number',
    min: 0,
    max: 0.6,
    step: '0.01',
  },
  daily_gate_survival_probability: {
    label: 'Survival Probability (legacy key)',
    description: 'Legacy alias for survival_probability. Keep in sync if both exist.',
    type: 'number',
    min: 0,
    max: 0.6,
    step: '0.01',
  },
};

const PUZZLE_LABELS: Record<string, string> = {
  daily_puzzle_question: 'Question',
  daily_puzzle_answer:   'Answer',
  daily_puzzle_hint:     'Hint',
};
const PUZZLE_PLACEHOLDERS: Record<string, string> = {
  daily_puzzle_question: "What is today's puzzle question?",
  daily_puzzle_answer:   'The correct answer',
  daily_puzzle_hint:     'A helpful clue...',
};

const SLIDE_LABELS: Record<string, string> = {
  skull_gate:  'Slide 1 — Face the Skull Gate',
  build_streak:'Slide 2 — Build Your Streak',
  earn_points: 'Slide 3 — Earn Qualification Points',
  saturday:    'Slide 4 — Saturday Showdown',
  sunday:      'Slide 5 — Sunday Crown',
};

function stripJsonQuotes(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function toJsonValue(raw: string, originalValue: unknown): unknown {
  if (typeof originalValue === 'string') return raw;
  if (typeof originalValue === 'boolean') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  }
  // If no original value exists (new key), and raw looks like a plain string
  // (not a JSON value), treat it as a string
  if (originalValue === undefined || originalValue === null) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  try { return JSON.parse(raw); } catch { return raw; }
}

// ── Save button (compact icon-only) ──────────────────────────────────────────
function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="jungle-button-secondary flex items-center justify-center flex-shrink-0"
      style={{ width: 41, height: 41, padding: 0 }}
      title="Save"
    >
      {saving ? (
        <LoadingSpinner size="sm" />
      ) : saved ? (
        <Check className="h-4 w-4 text-moss-light" strokeWidth={2.5} />
      ) : (
        <Save className="h-4 w-4 text-bone" strokeWidth={2} />
      )}
    </button>
  );
}

export default function AdminSettings({ section = 'all' }: { section?: SettingsSection }) {
  const { fetchSettings, updateSetting, loading, error } = useAdmin();

  const [settings, setSettings]     = useState<SettingRow[]>([]);
  const [editValues, setEditValues]  = useState<Record<string, string>>({});
  const [saving, setSaving]          = useState<string | null>(null);
  const [savedKey, setSavedKey]      = useState<string | null>(null);

  const [slides, setSlides]           = useState<OnboardingSlide[]>([]);
  const [savingSlide, setSavingSlide] = useState<string | null>(null);
  const [savedSlide, setSavedSlide]   = useState<string | null>(null);

  const load = async () => {
    const data = await fetchSettings();
    if (data) {
      setSettings(data);
      const vals: Record<string, string> = {};
      data.forEach((s) => {
        vals[s.key] = SECRET_KEYS.has(s.key) ? '' : stripJsonQuotes(s.value_json);
      });
      setEditValues(vals);
      const slideSetting = data.find((s) => s.key === ONBOARDING_KEY);
      if (slideSetting && Array.isArray(slideSetting.value_json)) {
        setSlides(slideSetting.value_json as OnboardingSlide[]);
      }
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (key: string, rawOverride?: string) => {
    const raw = rawOverride !== undefined ? rawOverride : (editValues[key] ?? '');
    if (SECRET_KEYS.has(key) && raw.trim() === '') return;
    setSaving(key);
    try {
      // Validate known constraints
      if (key === 'reminder_send_hour') {
        const v = parseInt(raw, 10);
        if (isNaN(v) || v < 0 || v > 23) {
          alert('Send hour must be between 0 and 23');
          return;
        }
      }
      if (key === 'survival_probability' || key === 'daily_gate_survival_probability') {
        const v = parseFloat(raw);
        if (isNaN(v) || v < 0 || v > 0.6) {
          alert('Survival probability must be between 0.0 and 0.6');
          return;
        }
      }
      if (key === 'jackpot_contribution_rate') {
        const v = parseFloat(raw);
        if (isNaN(v) || v < 0 || v > 1) {
          alert('Jackpot contribution rate must be between 0.0 and 1.0');
          return;
        }
      }
      const originalSetting = settings.find((s) => s.key === key);
      const value = toJsonValue(raw, originalSetting?.value_json);
      await updateSetting(key, value);
      setSavedKey(key);
      await load();
      setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSaving(null);
    }
  };

  const updateSlideField = (id: string, field: keyof OnboardingSlide, value: string) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleSaveSlide = async (id: string) => {
    setSavingSlide(id);
    try {
      await updateSetting(ONBOARDING_KEY, slides);
      setSavedSlide(id);
      await load();
      setTimeout(() => setSavedSlide(null), 2000);
    } finally {
      setSavingSlide(null);
    }
  };

  if (loading && settings.length === 0) {
    return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  }

  const puzzleSettings  = settings.filter((s) => PUZZLE_KEYS.includes(s.key));
  const jackpotSettings = settings.filter((s) => JACKPOT_KEYS.includes(s.key));
  const economySettings = settings.filter((s) => (ALL_ECONOMY_KEYS as readonly string[]).includes(s.key));
  const reminderSettings = settings.filter((s) => REMINDER_KEYS.includes(s.key));
  const otherSettings   = settings.filter(
    (s) => !PUZZLE_KEYS.includes(s.key) && !JACKPOT_KEYS.includes(s.key) && s.key !== ONBOARDING_KEY
      && !(ALL_ECONOMY_KEYS as readonly string[]).includes(s.key)
      && !REMINDER_KEYS.includes(s.key)
      && !INTEGRATION_KEYS.includes(s.key)
  );

  const show = (s: SettingsSection) => section === 'all' || section === s;

  return (
    <div className="space-y-8">
      {error && (
        <div className="border border-death-red/30 bg-death-dim/30 px-4 py-3 text-sm text-death-glow">{error}</div>
      )}

      {/* ── System Config ─────────────────────────────────────────────────── */}
      {show('system') && otherSettings.length > 0 && (
        <section>
          <SectionHeader icon={<Settings className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="System Config" />
          <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
            {otherSettings.map((setting) => {
              const meta = SETTING_META[setting.key];
              const isJson = meta?.type === 'json' || (!meta && typeof setting.value_json === 'object');
              const isBoolean = meta?.type === 'boolean';
              return (
                <div key={setting.key} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-bone">
                          {meta?.label ?? setting.key}
                        </span>
                        {meta?.label && (
                          <span className="text-[11px] font-mono text-bone-faint">{setting.key}</span>
                        )}
                      </div>
                      {meta?.description && (
                        <p className="text-[12px] text-bone-faint leading-relaxed mb-2">{meta.description}</p>
                      )}
                      {isBoolean ? (
                        <div className="flex gap-2">
                          {['true', 'false'].map((val) => (
                            <button
                              key={val}
                              onClick={() => setEditValues((p) => ({ ...p, [setting.key]: val }))}
                              className={`px-4 py-1.5 text-xs border transition-colors ${
                                editValues[setting.key] === val
                                  ? val === 'true'
                                    ? 'border-moss-light/50 bg-moss-dark/30 text-moss-light'
                                    : 'border-death-red/40 bg-death-dim/20 text-death-glow'
                                  : 'border-moss-dark/25 text-bone-dark hover:text-bone'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      ) : isJson ? (
                        <textarea
                          value={editValues[setting.key] ?? ''}
                          onChange={(e) => setEditValues((p) => ({ ...p, [setting.key]: e.target.value }))}
                          className="ritual-input w-full font-mono text-xs resize-y"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={meta?.type === 'number' ? 'number' : 'text'}
                          step={meta?.step}
                          min={meta?.min}
                          max={meta?.max}
                          value={editValues[setting.key] ?? ''}
                          onChange={(e) => setEditValues((p) => ({ ...p, [setting.key]: e.target.value }))}
                          className="ritual-input w-full max-w-xs font-mono text-xs"
                          onKeyDown={(e) => e.key === 'Enter' && handleSave(setting.key)}
                        />
                      )}
                    </div>
                    <div className="pt-6 flex-shrink-0">
                      <SaveBtn
                        saving={saving === setting.key}
                        saved={savedKey === setting.key}
                        onClick={() => handleSave(setting.key)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Reminders ────────────────────────────────────────────────────── */}
      {show('reminders') && (
        <RemindersSection
          settings={reminderSettings}
          editValues={editValues}
          setEditValues={setEditValues}
          saving={saving}
          savedKey={savedKey}
          onSave={handleSave}
        />
      )}

      {/* ── Jackpot ───────────────────────────────────────────────────────── */}
      {show('system') && jackpotSettings.length > 0 && (
        <section>
          <SectionHeader icon={<Coins className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="Jackpot" />
          <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
            {jackpotSettings.map((setting) => (
              <div key={setting.key} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-bone">Contribution Rate</span>
                      <span className="text-[11px] font-mono text-bone-faint">{setting.key}</span>
                    </div>
                    <p className="text-[12px] text-bone-faint leading-relaxed mb-2">
                      Percentage of losing stakes allocated to the public jackpot (e.g. 0.10 = 10%).
                      This is not an extra charge to the player — it comes from the lost stake only.
                      Players who survive are not charged a jackpot contribution.
                    </p>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={editValues[setting.key] ?? ''}
                      onChange={(e) => setEditValues((p) => ({ ...p, [setting.key]: e.target.value }))}
                      className="ritual-input w-full max-w-xs font-mono text-xs"
                      placeholder="e.g. 0.10"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(setting.key)}
                    />
                  </div>
                  <div className="pt-6 flex-shrink-0">
                    <SaveBtn
                      saving={saving === setting.key}
                      saved={savedKey === setting.key}
                      onClick={() => handleSave(setting.key)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Daily Puzzle ──────────────────────────────────────────────────── */}
      {show('puzzle') && puzzleSettings.length > 0 && (
        <section>
          <SectionHeader icon={<Puzzle className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="Daily Puzzle" />
          <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
            {PUZZLE_KEYS.filter((k) => settings.some((s) => s.key === k)).map((key) => (
              <div key={key} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">
                      {PUZZLE_LABELS[key]}
                    </label>
                    <input
                      type="text"
                      value={editValues[key] ?? ''}
                      onChange={(e) => setEditValues((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={PUZZLE_PLACEHOLDERS[key]}
                      className="ritual-input w-full text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(key)}
                    />
                  </div>
                  <div className="pt-5 flex-shrink-0">
                    <SaveBtn
                      saving={saving === key}
                      saved={savedKey === key}
                      onClick={() => handleSave(key)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Onboarding Slides ─────────────────────────────────────────────── */}
      {show('onboarding') && slides.length > 0 && (
        <section>
          <SectionHeader icon={<BookOpen className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="Onboarding Slides" />
          <div className="space-y-2">
            {slides.map((slide) => (
              <div key={slide.id} className="border border-moss-dark/25 bg-ritual-surface/20 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.15em] text-bone-faint mb-3">
                  {SLIDE_LABELS[slide.id] ?? slide.id}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-bone-faint mb-1">Title</label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => updateSlideField(slide.id, 'title', e.target.value)}
                      className="ritual-input w-full text-xs"
                      placeholder="Slide title..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-bone-faint mb-1">Body</label>
                    <textarea
                      value={slide.body}
                      onChange={(e) => updateSlideField(slide.id, 'body', e.target.value)}
                      className="ritual-input w-full text-xs resize-none"
                      rows={3}
                      placeholder="Slide description..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-bone-faint mb-1">Large Icon Image URL</label>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={slide.image_url}
                          onChange={(e) => updateSlideField(slide.id, 'image_url', e.target.value)}
                          className="ritual-input w-full text-xs font-mono"
                          placeholder="/assets/props/skull_main.png or https://..."
                        />
                        {slide.image_url ? (
                          <div className="mt-2 flex items-center gap-3">
                            <img
                              src={slide.image_url}
                              alt="Preview"
                              className="h-10 w-10 object-contain border border-moss-dark/30 bg-ritual-bg"
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                            />
                            <span className="text-[11px] text-bone-faint">Preview</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-bone-faint">Empty — uses default icon</p>
                        )}
                      </div>
                      <SaveBtn
                        saving={savingSlide === slide.id}
                        saved={savedSlide === slide.id}
                        onClick={() => handleSaveSlide(slide.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Economy & Financial Model ─────────────────────────────────────── */}
      {show('economy') && (
        <EconomySection
          settings={economySettings}
          editValues={editValues}
          setEditValues={setEditValues}
          saving={saving}
          savedKey={savedKey}
          onSave={handleSave}
        />
      )}

      {/* ── Integrations ─────────────────────────────────────────────────── */}
      {show('integrations') && (
        <IntegrationsSection
          editValues={editValues}
          setEditValues={setEditValues}
          saving={saving}
          savedKey={savedKey}
          onSave={handleSave}
          settings={settings}
        />
      )}
    </div>
  );
}

// ── Integrations Section ──────────────────────────────────────────────────────

interface IntegrationsSectionProps {
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  savedKey: string | null;
  onSave: (key: string, rawOverride?: string) => Promise<void>;
  settings: SettingRow[];
}

type EmailService = 'sendgrid' | 'resend' | 'php_mail' | 'none';
type SmsService   = 'twilio'   | 'none';

const EMAIL_SERVICES: { value: EmailService; label: string; description: string }[] = [
  { value: 'sendgrid',  label: 'SendGrid',    description: 'Transactional email via SendGrid API. Recommended for production.' },
  { value: 'resend',    label: 'Resend',       description: 'Transactional email via Resend API. Modern alternative to SendGrid.' },
  { value: 'php_mail',  label: 'PHP mail()',   description: 'Server-side PHP mail() function. No credentials needed — useful for testing.' },
  { value: 'none',      label: 'Disabled',     description: 'Email reminders disabled.' },
];

const SMS_SERVICES: { value: SmsService; label: string; description: string }[] = [
  { value: 'twilio', label: 'Twilio', description: 'SMS delivery via Twilio. Requires Account SID, Auth Token, and a from-number.' },
  { value: 'none',   label: 'Disabled', description: 'SMS reminders disabled.' },
];

interface CredentialFieldDef {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  secret: boolean;
}

const SECRET_KEYS = new Set([
  'ghl_api_key', 'sendgrid_api_key', 'resend_api_key',
  'twilio_account_sid', 'twilio_auth_token', 'twilio_from_number',
]);

const EMAIL_CREDENTIAL_FIELDS: Record<EmailService, CredentialFieldDef[]> = {
  sendgrid: [
    { key: 'sendgrid_api_key',   label: 'SendGrid API Key',    description: 'API key from SendGrid dashboard.',          placeholder: 'SG...',                 secret: true },
    { key: 'reminder_from_email',label: 'From Email Address',  description: 'Sender address shown to recipients.',        placeholder: 'noreply@example.com',   secret: false },
  ],
  resend: [
    { key: 'resend_api_key',     label: 'Resend API Key',      description: 'API key from Resend dashboard.',            placeholder: 're_...',                secret: true },
    { key: 'reminder_from_email',label: 'From Email Address',  description: 'Sender address shown to recipients.',        placeholder: 'noreply@example.com',   secret: false },
  ],
  php_mail: [
    { key: 'reminder_from_email',label: 'From Email Address',  description: 'Passed as the From: header in PHP mail().',  placeholder: 'noreply@example.com',   secret: false },
  ],
  none: [],
};

const SMS_CREDENTIAL_FIELDS: Record<SmsService, CredentialFieldDef[]> = {
  twilio: [
    { key: 'twilio_account_sid', label: 'Twilio Account SID', description: 'Account SID from Twilio console.',           placeholder: 'AC...',                 secret: false },
    { key: 'twilio_auth_token',  label: 'Twilio Auth Token',  description: 'Auth token — store as edge function secret in production.', placeholder: '••••••••', secret: true },
    { key: 'twilio_from_number', label: 'From Number',        description: 'E.164 number to send from.',                 placeholder: '+15551234567',           secret: false },
  ],
  none: [],
};

function ServicePicker<T extends string>({
  label, settingKey, options, value, onChange,
}: {
  label: string;
  settingKey: string;
  options: { value: T; label: string; description: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-bone">{label}</span>
        <span className="text-[11px] font-mono text-bone-faint">{settingKey}</span>
      </div>
      {selected && (
        <p className="text-[12px] text-bone-faint leading-relaxed mb-2">{selected.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-[12px] border transition-colors ${
              value === opt.value
                ? 'border-torch-ember/50 bg-torch-ember/10 text-torch-ember'
                : 'border-moss-dark/25 text-bone-dark hover:text-bone hover:border-moss-dark/40'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CredentialField({
  field, editValues, setEditValues, saving, savedKey, onSave, settings,
}: {
  field: CredentialFieldDef;
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  savedKey: string | null;
  onSave: (key: string) => Promise<void>;
  settings: SettingRow[];
}) {
  const { key, label, description, placeholder, secret } = field;
  const hasSaved = secret && settings.some((s) => s.key === key && stripJsonQuotes(s.value_json) !== '');
  return (
    <div className="px-4 py-3 border-t border-moss-dark/15 first:border-t-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-bone">{label}</span>
            <span className="text-[11px] font-mono text-bone-faint">{key}</span>
            {hasSaved && editValues[key] === '' && (
              <span className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 border border-moss-light/30 text-moss-light">saved</span>
            )}
          </div>
          <p className="text-[12px] text-bone-faint leading-relaxed mb-2">{description}</p>
          <input
            type={secret ? 'password' : 'text'}
            value={editValues[key] ?? ''}
            onChange={(e) => setEditValues((p) => ({ ...p, [key]: e.target.value }))}
            placeholder={hasSaved && editValues[key] === '' ? 'Enter new value to replace...' : placeholder}
            className="ritual-input w-full font-mono text-xs"
            onKeyDown={(e) => e.key === 'Enter' && onSave(key)}
            autoComplete="new-password"
          />
        </div>
        <div className="pt-6 flex-shrink-0">
          <SaveBtn saving={saving === key} saved={savedKey === key} onClick={() => onSave(key)} />
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({ editValues, setEditValues, saving, savedKey, onSave, settings }: IntegrationsSectionProps) {
  const emailService = (editValues['transactional_email_service'] as EmailService) || 'none';
  const smsService   = (editValues['sms_service'] as SmsService) || 'none';

  const setEmailService = (v: EmailService) => {
    setEditValues((p) => ({ ...p, transactional_email_service: v }));
    setTimeout(() => onSave('transactional_email_service', v), 0);
  };
  const setSmsService = (v: SmsService) => {
    setEditValues((p) => ({ ...p, sms_service: v }));
    setTimeout(() => onSave('sms_service', v), 0);
  };

  const emailFields = EMAIL_CREDENTIAL_FIELDS[emailService] ?? [];
  const smsFields   = SMS_CREDENTIAL_FIELDS[smsService] ?? [];

  return (
    <section>
      <p className="text-[12px] text-bone-faint mb-3 leading-relaxed">
        API keys entered here are stored in the database and read by edge functions at runtime via the <span className="font-mono">get_setting</span> RPC.
        Keys are never returned to the browser after saving.
      </p>

      {/* ── Marketing / CRM ─────────────────────────────────────────────── */}
      <div className="border border-moss-dark/25 bg-ritual-surface/20 mb-3">
        <div className="px-4 py-2.5 border-b border-moss-dark/20">
          <span className="text-[11px] uppercase tracking-[0.14em] text-bone-faint font-medium">Marketing / CRM</span>
          <p className="text-[11px] text-bone-faint/60 mt-0.5">Use GoHighLevel for campaigns, broadcast messages, and marketing automation.</p>
        </div>
        <CredentialField
          field={{ key: 'ghl_api_key', label: 'GoHighLevel API Key', description: 'GHL API key for marketing campaigns and broadcast messaging. Do not use for transactional reminders.', placeholder: 'ey...', secret: true }}
          editValues={editValues} setEditValues={setEditValues} saving={saving} savedKey={savedKey} onSave={onSave} settings={settings}
        />
      </div>

      {/* ── Transactional Email ─────────────────────────────────────────── */}
      <div className="border border-moss-dark/25 bg-ritual-surface/20 mb-3">
        <div className="px-4 py-2.5 border-b border-moss-dark/20">
          <span className="text-[11px] uppercase tracking-[0.14em] text-bone-faint font-medium">Transactional Email</span>
          <p className="text-[11px] text-bone-faint/60 mt-0.5">Used for daily reminder emails, receipts, and system notifications.</p>
        </div>
        <div className="px-4 py-3">
          <ServicePicker<EmailService>
            label="Email Service"
            settingKey="transactional_email_service"
            options={EMAIL_SERVICES}
            value={emailService}
            onChange={setEmailService}
          />
        </div>
        {emailFields.map((f) => (
          <CredentialField key={f.key} field={f} editValues={editValues} setEditValues={setEditValues} saving={saving} savedKey={savedKey} onSave={onSave} settings={settings} />
        ))}
        {emailService === 'php_mail' && (
          <div className="px-4 py-2.5 border-t border-moss-dark/15 bg-moss-dark/5">
            <p className="text-[11px] text-bone-faint/70 leading-relaxed">
              PHP <span className="font-mono">mail()</span> uses the server's configured sendmail/postfix. No API credentials required.
              Not recommended for production volume — use SendGrid or Resend instead.
            </p>
          </div>
        )}
      </div>

      {/* ── SMS ─────────────────────────────────────────────────────────── */}
      <div className="border border-moss-dark/25 bg-ritual-surface/20">
        <div className="px-4 py-2.5 border-b border-moss-dark/20">
          <span className="text-[11px] uppercase tracking-[0.14em] text-bone-faint font-medium">SMS</span>
          <p className="text-[11px] text-bone-faint/60 mt-0.5">Direct SMS reminders to players who have opted in.</p>
        </div>
        <div className="px-4 py-3">
          <ServicePicker<SmsService>
            label="SMS Service"
            settingKey="sms_service"
            options={SMS_SERVICES}
            value={smsService}
            onChange={setSmsService}
          />
        </div>
        {smsFields.map((f) => (
          <CredentialField key={f.key} field={f} editValues={editValues} setEditValues={setEditValues} saving={saving} savedKey={savedKey} onSave={onSave} settings={settings} />
        ))}
      </div>
    </section>
  );
}

// ── Reminders Section ─────────────────────────────────────────────────────────

interface RemindersSectionProps {
  settings: SettingRow[];
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  savedKey: string | null;
  onSave: (key: string) => Promise<void>;
}

function RemindersSection({ settings, editValues, setEditValues, saving, savedKey, onSave }: RemindersSectionProps) {
  if (settings.length === 0) return null;

  const enabled = editValues['reminders_enabled'] === 'true';

  const activeChannels: string[] = (() => {
    try { return JSON.parse(editValues['reminder_channels'] ?? '[]'); } catch { return []; }
  })();

  const toggleChannel = (ch: string) => {
    const next = activeChannels.includes(ch)
      ? activeChannels.filter((c) => c !== ch)
      : [...activeChannels, ch];
    setEditValues((p) => ({ ...p, reminder_channels: JSON.stringify(next) }));
  };

  return (
    <section>
      <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">

        {/* Master toggle */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-bone">Reminders Enabled</span>
                <span className="text-[11px] font-mono text-bone-faint">reminders_enabled</span>
              </div>
              <p className="text-[12px] text-bone-faint leading-relaxed mb-2">
                Master switch. When off, no reminders are dispatched regardless of other settings.
              </p>
              <div className="flex gap-2">
                {['true', 'false'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setEditValues((p) => ({ ...p, reminders_enabled: val }))}
                    className={`px-4 py-1.5 text-xs border transition-colors ${
                      editValues['reminders_enabled'] === val
                        ? val === 'true'
                          ? 'border-moss-light/50 bg-moss-dark/30 text-moss-light'
                          : 'border-death-red/40 bg-death-dim/20 text-death-glow'
                        : 'border-moss-dark/25 text-bone-dark hover:text-bone'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-6 flex-shrink-0">
              <SaveBtn
                saving={saving === 'reminders_enabled'}
                saved={savedKey === 'reminders_enabled'}
                onClick={() => onSave('reminders_enabled')}
              />
            </div>
          </div>
        </div>

        {/* Send hour */}
        <div className={`px-4 py-3 transition-opacity ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-bone">Send Hour (UTC)</span>
                <span className="text-[11px] font-mono text-bone-faint">reminder_send_hour</span>
              </div>
              <p className="text-[12px] text-bone-faint leading-relaxed mb-2">
                Hour of day (0–23 UTC) when the daily reminder job fires. E.g. 20 = 8pm UTC.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  step="1"
                  value={editValues['reminder_send_hour'] ?? '20'}
                  onChange={(e) => setEditValues((p) => ({ ...p, reminder_send_hour: e.target.value }))}
                  className="ritual-input w-24 font-mono text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && onSave('reminder_send_hour')}
                />
                <span className="text-[12px] text-bone-faint">
                  {(() => {
                    const h = parseInt(editValues['reminder_send_hour'] ?? '20');
                    if (isNaN(h)) return '';
                    return `${h.toString().padStart(2, '0')}:00 UTC`;
                  })()}
                </span>
              </div>
            </div>
            <div className="pt-6 flex-shrink-0">
              <SaveBtn
                saving={saving === 'reminder_send_hour'}
                saved={savedKey === 'reminder_send_hour'}
                onClick={() => onSave('reminder_send_hour')}
              />
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className={`px-4 py-3 transition-opacity ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-bone">Active Channels</span>
                <span className="text-[11px] font-mono text-bone-faint">reminder_channels</span>
              </div>
              <p className="text-[12px] text-bone-faint leading-relaxed mb-2">
                Channels used to dispatch reminders. Only verified player preferences on these channels will receive messages.
              </p>
              <div className="flex flex-wrap gap-2 mb-1">
                {REMINDER_CHANNELS.map((ch) => {
                  const active = activeChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] border transition-colors ${
                        active
                          ? 'border-moss-light/50 bg-moss-dark/30 text-moss-light'
                          : 'border-moss-dark/25 text-bone-dark hover:text-bone'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-6 flex-shrink-0">
              <SaveBtn
                saving={saving === 'reminder_channels'}
                saved={savedKey === 'reminder_channels'}
                onClick={() => onSave('reminder_channels')}
              />
            </div>
          </div>
        </div>

        {/* Message template */}
        <div className={`px-4 py-3 transition-opacity ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-bone">Message Template</span>
                <span className="text-[11px] font-mono text-bone-faint">reminder_message</span>
              </div>
              <p className="text-[12px] text-bone-faint leading-relaxed mb-2">
                Body text sent in the reminder. Supports <span className="font-mono">{'{username}'}</span> placeholder.
              </p>
              <textarea
                value={editValues['reminder_message'] ?? ''}
                onChange={(e) => setEditValues((p) => ({ ...p, reminder_message: e.target.value }))}
                className="ritual-input w-full text-xs resize-y"
                rows={3}
                placeholder="Don't forget — today's game is still open..."
              />
              <p className="mt-1 text-[11px] text-bone-faint/60">
                {(editValues['reminder_message'] ?? '').length} characters
              </p>
            </div>
            <div className="pt-6 flex-shrink-0">
              <SaveBtn
                saving={saving === 'reminder_message'}
                saved={savedKey === 'reminder_message'}
                onClick={() => onSave('reminder_message')}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Section header helper ──────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-bone">{title}</h2>
    </div>
  );
}

// ── Economy Section ────────────────────────────────────────────────────────────

interface EconomySectionProps {
  settings: SettingRow[];
  editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  savedKey: string | null;
  onSave: (key: string) => Promise<void>;
}

function formatStakeTiers(raw: string): string {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return raw;
    return arr.map((t: { stake_cents?: number }) => {
      const cents = t.stake_cents ?? 0;
      const euros = cents / 100;
      return `€${euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2)}`;
    }).join(' / ');
  } catch {
    return raw;
  }
}

function EconomySection({ settings, editValues, setEditValues, saving, savedKey, onSave }: EconomySectionProps) {
  const getValue = (key: string): number => {
    const raw = editValues[key];
    if (raw !== undefined) return parseFloat(raw) || 0;
    const setting = settings.find((s) => s.key === key);
    if (setting) return typeof setting.value_json === 'number' ? setting.value_json : parseFloat(String(setting.value_json)) || 0;
    return ECONOMY_META[key]?.defaultValue ?? 0;
  };

  // survival_probability stored as decimal (0.5 = 50%)
  const survivalRaw        = getValue('survival_probability');
  const survivalFrac       = survivalRaw > 1 ? survivalRaw / 100 : survivalRaw;
  const failRate           = Math.max(0.0001, 1 - survivalFrac);
  const stakeTiersRaw      = editValues['stake_tiers'] ?? '';

  // Economy v1 live rates (stored as integer %, e.g. 35)
  const streakValueRate    = getValue('daily_streak_value_rate');
  const jackpotAllocRate   = getValue('jackpot_allocation_rate');
  const satAllocRate       = getValue('saturday_pool_allocation_rate');
  const sunAllocRate       = getValue('sunday_pool_allocation_rate');

  // Derived jackpot contribution rate: jackpot_allocation_rate / fail_rate
  const effJackpotContribRate = Math.min(100, jackpotAllocRate / (failRate * 100) * 100);

  // Modeled player value = sum of all player-directed allocations
  const modeledPlayerValue = streakValueRate + jackpotAllocRate + satAllocRate + sunAllocRate;
  const hardRtpCap         = getValue('hard_rtp_cap');
  const rtpOk              = modeledPlayerValue <= hardRtpCap;

  const renderLiveAllocField = (key: string) => {
    const meta = ECONOMY_META[key];
    if (!meta) return null;
    const rawVal = editValues[key] ?? String(getValue(key));
    return (
      <div key={key} className="flex items-center gap-3 px-4 py-3 border-b border-torch-ember/10 last:border-0">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-bone">{meta.label}</span>
          <p className="text-[12px] text-bone-faint mt-0.5 leading-snug">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center">
            <input
              type="number" step="0.1" min="0" max="100"
              value={rawVal}
              onChange={(e) => setEditValues((p) => ({ ...p, [key]: e.target.value }))}
              className="ritual-input w-24 text-xs text-right pr-6"
              onKeyDown={(e) => e.key === 'Enter' && onSave(key)}
            />
            <span className="absolute right-2 text-[12px] text-bone-faint pointer-events-none">%</span>
          </div>
          <SaveBtn saving={saving === key} saved={savedKey === key} onClick={() => onSave(key)} />
        </div>
      </div>
    );
  };

  const renderCostField = (key: string) => {
    const meta = ECONOMY_META[key];
    if (!meta) return null;
    const rawVal = editValues[key] ?? String(getValue(key));
    return (
      <div key={key} className="flex items-center gap-3 px-4 py-3 border-b border-moss-dark/15 last:border-0">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-bone">{meta.label}</span>
          <p className="text-[12px] text-bone-faint mt-0.5 leading-snug">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center">
            <input
              type="number" step="0.1" min="0" max="100"
              value={rawVal}
              onChange={(e) => setEditValues((p) => ({ ...p, [key]: e.target.value }))}
              className="ritual-input w-24 text-xs text-right pr-6"
              onKeyDown={(e) => e.key === 'Enter' && onSave(key)}
            />
            <span className="absolute right-2 text-[12px] text-bone-faint pointer-events-none">%</span>
          </div>
          <SaveBtn saving={saving === key} saved={savedKey === key} onClick={() => onSave(key)} />
        </div>
      </div>
    );
  };

  return (
    <section>
      {/* ── Card 1: Live Economy Controls ──────────────────────────────────── */}
      <div className="mb-4 border border-torch-ember/25 bg-ritual-surface/15">
        <div className="flex items-center justify-between px-4 py-3 border-b border-torch-ember/15">
          <div>
            <span className="text-xs font-semibold text-bone">Live Economy Controls</span>
            <p className="text-[12px] text-bone-faint mt-0.5">
              These settings now affect live stake allocation, pot accrual, jackpot, and pool behavior.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-1 border border-torch-ember/40 text-torch-ember bg-torch-ember/5 flex-shrink-0">
            Live
          </span>
        </div>

        {/* Read-only system inputs */}
        <div className="divide-y divide-torch-ember/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="text-[11px] font-medium text-bone">Survival Probability</span>
              <p className="text-[12px] text-bone-faint mt-0.5">Governs RNG roll — edit in System Config above</p>
            </div>
            <span className="text-sm font-mono text-bone">{(survivalFrac * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="text-[11px] font-medium text-bone">Stake Tiers</span>
              <p className="text-[12px] text-bone-faint mt-0.5">Available wager amounts — edit in System Config above</p>
            </div>
            <span className="text-sm font-mono text-bone">{stakeTiersRaw ? formatStakeTiers(stakeTiersRaw) : '—'}</span>
          </div>
        </div>

        {/* Editable live allocation rates */}
        {(ECONOMY_LIVE_ALLOC_KEYS as readonly string[]).map(renderLiveAllocField)}

        {/* Derived jackpot contribution rate */}
        <div className="px-4 py-3 border-t border-torch-ember/10 bg-torch-ember/3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-bone-faint">Derived jackpot contribution rate (losing stakes)</span>
            <span className="text-[11px] font-mono font-semibold text-bone">
              {effJackpotContribRate.toFixed(2)}%
            </span>
          </div>
          <p className="text-[11px] text-bone-faint/60">
            = jackpot_allocation_rate ÷ fail_rate = {jackpotAllocRate}% ÷ {(failRate * 100).toFixed(1)}%
          </p>
        </div>

        {/* Modeled player value */}
        <div className="px-4 py-3 border-t border-torch-ember/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-bone">Modeled player value (all allocations)</span>
            <span className="text-[12px] font-mono font-semibold text-bone">
              {modeledPlayerValue.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-4 gap-x-3 gap-y-1">
            {[
              { label: 'Daily / Streak', key: 'daily_streak_value_rate' },
              { label: 'Jackpot',        key: 'jackpot_allocation_rate' },
              { label: 'Saturday',       key: 'saturday_pool_allocation_rate' },
              { label: 'Sunday',         key: 'sunday_pool_allocation_rate' },
            ].map(({ label, key }) => (
              <div key={key} className="flex flex-col">
                <span className="text-[11px] text-bone-faint truncate">{label}</span>
                <span className="text-[12px] font-mono text-bone">{getValue(key).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 2: Cost & Margin Assumptions ──────────────────────────────── */}
      <div className="mb-4 border border-moss-dark/25 bg-ritual-surface/15">
        <div className="flex items-center justify-between px-4 py-3 border-b border-moss-dark/20">
          <div>
            <span className="text-xs font-semibold text-bone">Cost & Margin Assumptions</span>
            <p className="text-[12px] text-bone-faint mt-0.5">These remain planning assumptions and do not affect gameplay.</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-1 border border-bone-faint/25 text-bone-faint flex-shrink-0">
            Planning only
          </span>
        </div>
        {(ECONOMY_COST_KEYS as readonly string[]).map(renderCostField)}
      </div>

      {/* ── Card 3: RTP Safety Check ────────────────────────────────────────── */}
      <div className={`border ${rtpOk ? 'border-moss-dark/25 bg-ritual-surface/15' : 'border-death-red/35 bg-death-dim/10'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-moss-dark/20">
          <div>
            <span className="text-xs font-semibold text-bone">RTP Safety Check</span>
            <p className="text-[12px] text-bone-faint mt-0.5">Compares modeled player-directed value against the hard RTP cap.</p>
          </div>
          <span className={`text-[11px] flex-shrink-0 ${rtpOk ? 'text-moss-light' : 'text-death-glow'}`}>
            {rtpOk ? 'Within cap' : 'Cap exceeded'}
          </span>
        </div>

        {/* RTP breakdown */}
        <div className="px-4 py-4">
          <div className="space-y-1.5 mb-3">
            {[
              { label: 'Daily / Streak player value', key: 'daily_streak_value_rate' },
              { label: 'Jackpot allocation',          key: 'jackpot_allocation_rate' },
              { label: 'Saturday pool',               key: 'saturday_pool_allocation_rate' },
              { label: 'Sunday pool',                 key: 'sunday_pool_allocation_rate' },
            ].map(({ label, key }) => (
              <div key={key} className="flex justify-between items-baseline gap-4">
                <span className="text-[12px] text-bone-faint">{label}</span>
                <span className="text-[12px] font-mono text-bone">{getValue(key).toFixed(1)}%</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1.5 border-t border-moss-dark/15">
              <span className="text-[12px] font-semibold text-bone">Modeled player value total</span>
              <span className={`text-[11px] font-mono font-semibold ${rtpOk ? 'text-moss-light' : 'text-death-glow'}`}>
                {modeledPlayerValue.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Blended RTP target + hard cap */}
          <div className="space-y-1 pt-2 border-t border-moss-dark/15">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] font-medium text-bone">Blended RTP Target</span>
                <p className="text-[11px] text-bone-faint">Planning reference — not enforced</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative flex items-center">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={editValues['blended_rtp_target'] ?? String(getValue('blended_rtp_target'))}
                    onChange={(e) => setEditValues((p) => ({ ...p, blended_rtp_target: e.target.value }))}
                    className="ritual-input w-20 text-xs text-right pr-6"
                    onKeyDown={(e) => e.key === 'Enter' && onSave('blended_rtp_target')}
                  />
                  <span className="absolute right-2 text-[12px] text-bone-faint pointer-events-none">%</span>
                </div>
                <SaveBtn saving={saving === 'blended_rtp_target'} saved={savedKey === 'blended_rtp_target'} onClick={() => onSave('blended_rtp_target')} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[12px] font-medium ${rtpOk ? 'text-bone' : 'text-death-glow'}`}>Hard RTP Cap</span>
                <p className="text-[11px] text-bone-faint">Admin warning threshold — not enforced by RPC</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative flex items-center">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={editValues['hard_rtp_cap'] ?? String(getValue('hard_rtp_cap'))}
                    onChange={(e) => setEditValues((p) => ({ ...p, hard_rtp_cap: e.target.value }))}
                    className="ritual-input w-20 text-xs text-right pr-6"
                    onKeyDown={(e) => e.key === 'Enter' && onSave('hard_rtp_cap')}
                  />
                  <span className="absolute right-2 text-[12px] text-bone-faint pointer-events-none">%</span>
                </div>
                <SaveBtn saving={saving === 'hard_rtp_cap'} saved={savedKey === 'hard_rtp_cap'} onClick={() => onSave('hard_rtp_cap')} />
              </div>
            </div>
          </div>

          {!rtpOk && (
            <div className="mt-3 px-3 py-2.5 border border-death-red/30 bg-death-dim/20 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-death-glow flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[12px] text-death-glow leading-snug">
                Modeled player value ({modeledPlayerValue.toFixed(1)}%) exceeds hard RTP cap ({hardRtpCap.toFixed(1)}%).
                Reduce allocation rates before going live.
              </p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 border-t border-moss-dark/15">
          <p className="text-[11px] text-bone-faint/60 leading-relaxed pt-3">
            Economy v1 is live for daily_streak_value_rate, jackpot_allocation_rate, and pool rates.
            Cost and margin assumptions do not affect player balances or outcomes.
            Cashout transfers the full pot to the player wallet and resets streak.
          </p>
        </div>
      </div>
    </section>
  );
}
