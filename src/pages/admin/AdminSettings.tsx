import { useEffect, useState } from 'react';
import { Save, Check, Settings, Puzzle, BookOpen, Coins, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

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

// Economy & Financial Model key groups
const ECONOMY_LIVE_KEYS: string[] = [];  // survival_probability and stake_tiers are in System Config — shown here as read-only refs
const ECONOMY_ALLOCATION_KEYS = [
  'daily_streak_value_rate',
  'jackpot_allocation_rate',
  'saturday_pool_allocation_rate',
  'sunday_pool_allocation_rate',
  'hard_rtp_cap',
] as const;
const ECONOMY_PLANNING_KEYS = [
  'blended_rtp_target',
  'payment_processing_rate',
  'fraud_risk_buffer_rate',
  'affiliate_promo_budget_rate',
  'target_gross_margin_rate',
] as const;
const ALL_ECONOMY_KEYS = [...ECONOMY_ALLOCATION_KEYS, ...ECONOMY_PLANNING_KEYS];

// Allocation model fields that sum to the 100% budget
const ALLOCATION_SUM_KEYS = [
  'daily_streak_value_rate',
  'jackpot_allocation_rate',
  'saturday_pool_allocation_rate',
  'sunday_pool_allocation_rate',
  'payment_processing_rate',
  'fraud_risk_buffer_rate',
  'affiliate_promo_budget_rate',
  'target_gross_margin_rate',
];

interface EconomySettingMeta {
  label: string;
  description: string;
  unit: '%';
  defaultValue: number;
  isLive: boolean;
  group: 'allocation' | 'planning';
}

const ECONOMY_META: Record<string, EconomySettingMeta> = {
  hard_rtp_cap: {
    label: 'Hard RTP Cap',
    description: 'Maximum allowed Return-to-Player percentage. Not yet enforced by the RPC — currently a planning cap only.',
    unit: '%', defaultValue: 55, isLive: false, group: 'allocation',
  },
  daily_streak_value_rate: {
    label: 'Daily / Streak Player Value Rate',
    description: 'Portion of revenue allocated to daily streak player value. Planning model — not yet wired to live allocation logic.',
    unit: '%', defaultValue: 35, isLive: false, group: 'allocation',
  },
  jackpot_allocation_rate: {
    label: 'Jackpot Allocation Rate',
    description: 'Target portion of revenue routed to the public jackpot pool. Separate from jackpot_contribution_rate (the live per-losing-stake rate). Planning model only.',
    unit: '%', defaultValue: 6, isLive: false, group: 'allocation',
  },
  saturday_pool_allocation_rate: {
    label: 'Saturday Pool Allocation Rate',
    description: 'Target allocation for the Saturday Showdown prize pool. Saturday pools are not yet implemented — this is a planning assumption.',
    unit: '%', defaultValue: 3, isLive: false, group: 'allocation',
  },
  sunday_pool_allocation_rate: {
    label: 'Sunday Pool Allocation Rate',
    description: 'Target allocation for the Sunday Crown prize pool. Sunday pools are not yet implemented — this is a planning assumption.',
    unit: '%', defaultValue: 4, isLive: false, group: 'allocation',
  },
  blended_rtp_target: {
    label: 'Blended RTP Target',
    description: 'Target blended Return-to-Player across all game modes. Used for planning and margin calculations only.',
    unit: '%', defaultValue: 48, isLive: false, group: 'planning',
  },
  payment_processing_rate: {
    label: 'Payment Processing Rate',
    description: 'Worst-case assumption for payment processing costs. Used for margin model only.',
    unit: '%', defaultValue: 9, isLive: false, group: 'planning',
  },
  fraud_risk_buffer_rate: {
    label: 'Fraud / Risk Buffer Rate',
    description: 'Reserved buffer for fraud and risk management costs. Planning assumption only.',
    unit: '%', defaultValue: 4, isLive: false, group: 'planning',
  },
  affiliate_promo_budget_rate: {
    label: 'Affiliate / Promo Budget Rate',
    description: 'Budget allocation for affiliate and promotional activity. Planning assumption only.',
    unit: '%', defaultValue: 10, isLive: false, group: 'planning',
  },
  target_gross_margin_rate: {
    label: 'Target Gross Margin Rate',
    description: 'Target gross margin after all allocations and cost assumptions. Planning model only.',
    unit: '%', defaultValue: 29, isLive: false, group: 'planning',
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

export default function AdminSettings() {
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
      data.forEach((s) => { vals[s.key] = stripJsonQuotes(s.value_json); });
      setEditValues(vals);
      const slideSetting = data.find((s) => s.key === ONBOARDING_KEY);
      if (slideSetting && Array.isArray(slideSetting.value_json)) {
        setSlides(slideSetting.value_json as OnboardingSlide[]);
      }
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const raw = editValues[key] ?? '';
      // Validate known constraints
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
  const economySettings = settings.filter((s) => ALL_ECONOMY_KEYS.includes(s.key as typeof ALL_ECONOMY_KEYS[number]));
  const otherSettings   = settings.filter(
    (s) => !PUZZLE_KEYS.includes(s.key) && !JACKPOT_KEYS.includes(s.key) && s.key !== ONBOARDING_KEY
      && !ALL_ECONOMY_KEYS.includes(s.key as typeof ALL_ECONOMY_KEYS[number])
  );

  return (
    <div className="space-y-8">
      {error && (
        <div className="border border-death-red/30 bg-death-dim/30 px-4 py-3 text-sm text-death-glow">{error}</div>
      )}

      {/* ── System Config ─────────────────────────────────────────────────── */}
      {otherSettings.length > 0 && (
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
                          <span className="text-[9px] font-mono text-bone-faint">{setting.key}</span>
                        )}
                      </div>
                      {meta?.description && (
                        <p className="text-[10px] text-bone-faint leading-relaxed mb-2">{meta.description}</p>
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

      {/* ── Jackpot ───────────────────────────────────────────────────────── */}
      {jackpotSettings.length > 0 && (
        <section>
          <SectionHeader icon={<Coins className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="Jackpot" />
          <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
            {jackpotSettings.map((setting) => (
              <div key={setting.key} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-bone">Contribution Rate</span>
                      <span className="text-[9px] font-mono text-bone-faint">{setting.key}</span>
                    </div>
                    <p className="text-[10px] text-bone-faint leading-relaxed mb-2">
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
      {puzzleSettings.length > 0 && (
        <section>
          <SectionHeader icon={<Puzzle className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="Daily Puzzle" />
          <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
            {PUZZLE_KEYS.filter((k) => settings.some((s) => s.key === k)).map((key) => (
              <div key={key} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-1.5">
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
      {slides.length > 0 && (
        <section>
          <SectionHeader icon={<BookOpen className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />} title="Onboarding Slides" />
          <div className="space-y-2">
            {slides.map((slide) => (
              <div key={slide.id} className="border border-moss-dark/25 bg-ritual-surface/20 px-4 py-4">
                <div className="text-[9px] uppercase tracking-[0.15em] text-bone-faint mb-3">
                  {SLIDE_LABELS[slide.id] ?? slide.id}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.12em] text-bone-faint mb-1">Title</label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => updateSlideField(slide.id, 'title', e.target.value)}
                      className="ritual-input w-full text-xs"
                      placeholder="Slide title..."
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.12em] text-bone-faint mb-1">Body</label>
                    <textarea
                      value={slide.body}
                      onChange={(e) => updateSlideField(slide.id, 'body', e.target.value)}
                      className="ritual-input w-full text-xs resize-none"
                      rows={3}
                      placeholder="Slide description..."
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-[0.12em] text-bone-faint mb-1">Large Icon Image URL</label>
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
                            <span className="text-[9px] text-bone-faint">Preview</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-[9px] text-bone-faint">Empty — uses default icon</p>
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
      <EconomySection
        settings={economySettings}
        editValues={editValues}
        setEditValues={setEditValues}
        saving={saving}
        savedKey={savedKey}
        onSave={handleSave}
      />
    </div>
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

function EconomySection({ settings, editValues, setEditValues, saving, savedKey, onSave }: EconomySectionProps) {
  const getValue = (key: string): number => {
    const raw = editValues[key];
    if (raw !== undefined) return parseFloat(raw) || 0;
    const setting = settings.find((s) => s.key === key);
    if (setting) return typeof setting.value_json === 'number' ? setting.value_json : parseFloat(String(setting.value_json)) || 0;
    return ECONOMY_META[key]?.defaultValue ?? 0;
  };

  // Compute allocation budget total (the 8 fields that should sum to 100)
  const allocationTotal = ALLOCATION_SUM_KEYS.reduce((sum, k) => sum + getValue(k), 0);
  const allocationOk = Math.abs(allocationTotal - 100) < 0.01;

  // Separate groups
  const allocationKeys = ECONOMY_ALLOCATION_KEYS.filter((k) => k !== 'hard_rtp_cap');
  const planningKeys   = ECONOMY_PLANNING_KEYS;

  const renderRow = (key: string) => {
    const meta = ECONOMY_META[key];
    if (!meta) return null;
    const rawVal = editValues[key] ?? String(getValue(key));
    return (
      <div key={key} className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-medium text-bone">{meta.label}</span>
              <span className="text-[9px] font-mono text-bone-faint">{key}</span>
              {meta.isLive ? (
                <span className="text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 border border-torch-ember/40 text-torch-ember bg-torch-ember/5">
                  Live
                </span>
              ) : (
                <span className="text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 border border-bone-faint/20 text-bone-faint">
                  Planning only
                </span>
              )}
            </div>
            <p className="text-[10px] text-bone-faint leading-relaxed mb-2">{meta.description}</p>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={rawVal}
                  onChange={(e) => setEditValues((p) => ({ ...p, [key]: e.target.value }))}
                  className="ritual-input w-28 text-xs text-right pr-6"
                  onKeyDown={(e) => e.key === 'Enter' && onSave(key)}
                />
                <span className="absolute right-2 text-[10px] text-bone-faint pointer-events-none">%</span>
              </div>
            </div>
          </div>
          <div className="pt-6 flex-shrink-0">
            <SaveBtn saving={saving === key} saved={savedKey === key} onClick={() => onSave(key)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <section>
      <SectionHeader
        icon={<TrendingUp className="h-4 w-4 text-torch-ember" strokeWidth={1.5} />}
        title="Economy & Financial Model"
      />

      {/* Live gameplay references (read-only pointers) */}
      <div className="mb-3 border border-moss-dark/20 bg-ritual-surface/10 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="h-3 w-3 text-torch-ember/60" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-bone-faint">Live Gameplay Controls (edit in System Config / Jackpot above)</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            { label: 'Survival Probability', key: 'survival_probability' },
            { label: 'Jackpot Contribution Rate', key: 'jackpot_contribution_rate' },
            { label: 'Stake Tiers', key: 'stake_tiers' },
          ].map(({ label, key }) => {
            const raw = editValues[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 border border-torch-ember/40 text-torch-ember bg-torch-ember/5 flex-shrink-0 text-[8px]">Live</span>
                <span className="text-[10px] text-bone-muted">{label}</span>
                {raw && (
                  <span className="text-[10px] font-mono text-bone-faint ml-auto">
                    {typeof raw === 'string' && raw.startsWith('[') ? 'array' : raw}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Group 2 — Allocation model */}
      <div className="mb-1">
        <div className="px-4 py-1.5 text-[9px] uppercase tracking-[0.15em] text-bone-faint border-b border-moss-dark/15">
          Group 2 — Allocation Model
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
          {renderRow('hard_rtp_cap')}
          {allocationKeys.map(renderRow)}
        </div>
      </div>

      {/* Group 3 — Planning assumptions */}
      <div className="mb-4">
        <div className="px-4 py-1.5 text-[9px] uppercase tracking-[0.15em] text-bone-faint border-b border-moss-dark/15">
          Group 3 — Planning Assumptions
        </div>
        <div className="border border-moss-dark/25 bg-ritual-surface/20 divide-y divide-moss-dark/15">
          {planningKeys.map(renderRow)}
        </div>
      </div>

      {/* Allocation model summary panel */}
      <div className={`border px-4 py-4 ${allocationOk ? 'border-moss-dark/30 bg-moss-dark/10' : 'border-torch-ember/25 bg-torch-ember/5'}`}>
        <div className="flex items-center gap-2 mb-3">
          {allocationOk
            ? <Check className="h-3.5 w-3.5 text-moss-light" strokeWidth={2.5} />
            : <AlertTriangle className="h-3.5 w-3.5 text-torch-ember" strokeWidth={2} />
          }
          <span className={`text-xs font-semibold tracking-[0.08em] uppercase ${allocationOk ? 'text-moss-light' : 'text-torch-ember'}`}>
            {allocationOk ? 'Allocation model totals 100%' : `Allocation model totals ${allocationTotal.toFixed(1)}% — expected 100%`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
          {[
            { key: 'daily_streak_value_rate',       label: 'Daily / Streak' },
            { key: 'jackpot_allocation_rate',        label: 'Jackpot' },
            { key: 'saturday_pool_allocation_rate',  label: 'Saturday Pool' },
            { key: 'sunday_pool_allocation_rate',    label: 'Sunday Pool' },
            { key: 'payment_processing_rate',        label: 'Processing' },
            { key: 'fraud_risk_buffer_rate',         label: 'Fraud / Risk' },
            { key: 'affiliate_promo_budget_rate',    label: 'Affiliate / Promo' },
            { key: 'target_gross_margin_rate',       label: 'Target Margin' },
          ].map(({ key, label }) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-[10px] text-bone-faint">{label}</span>
              <span className="text-[10px] font-mono text-bone">{getValue(key).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-moss-dark/15 mb-3">
          <span className="text-[10px] font-semibold text-bone">Total</span>
          <span className={`text-[10px] font-mono font-semibold ${allocationOk ? 'text-moss-light' : 'text-torch-ember'}`}>
            {allocationTotal.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-moss-dark/15">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-bone-faint">Blended RTP Target</span>
            <span className="text-[10px] font-mono text-bone">{getValue('blended_rtp_target').toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-bone-faint">Hard RTP Cap</span>
            <span className="text-[10px] font-mono text-bone">{getValue('hard_rtp_cap').toFixed(1)}%</span>
          </div>
        </div>

        <p className="text-[9px] text-bone-faint/60 mt-3 leading-relaxed">
          This is the Economy v1 planning model. These allocation rates describe the target distribution of total player
          stakes across gameplay value, jackpot funding, weekend pools, operating costs, promo budget, and gross margin.
          Most allocation rates are planning-only and do not affect live gameplay yet. Current live gameplay is controlled
          separately by <span className="font-mono">survival_probability</span>, <span className="font-mono">stake_tiers</span>,
          and <span className="font-mono">jackpot_contribution_rate</span>. Note: <span className="font-mono">jackpot_allocation_rate</span> is
          the target jackpot share of total stakes. <span className="font-mono">jackpot_contribution_rate</span> is the live
          percentage taken from losing stakes only. These are related, but not the same formula.
        </p>
      </div>

      {/* Live Jackpot Estimate panel */}
      <LiveJackpotEstimate getValue={getValue} />
    </section>
  );
}

// ── Live Jackpot Estimate ──────────────────────────────────────────────────────

function LiveJackpotEstimate({ getValue }: { getValue: (key: string) => number }) {
  // survival_probability is stored as a decimal (0.0–1.0), e.g. 0.5 = 50%
  const survivalRaw        = getValue('survival_probability');
  const survivalFrac       = survivalRaw > 1 ? survivalRaw / 100 : survivalRaw;
  const failRate           = 1 - survivalFrac;

  // jackpot_contribution_rate is stored as a decimal (0.0–1.0), e.g. 0.10 = 10%
  const jackpotContribRaw  = getValue('jackpot_contribution_rate');
  const jackpotContribFrac = jackpotContribRaw > 1 ? jackpotContribRaw / 100 : jackpotContribRaw;

  const estLiveJackpotShare = failRate * jackpotContribFrac * 100;  // expressed as %
  const targetJackpotShare  = getValue('jackpot_allocation_rate');   // stored as %, e.g. 6
  const difference          = estLiveJackpotShare - targetJackpotShare;
  const inRange             = Math.abs(difference) <= 0.25;

  return (
    <div className={`mt-3 border px-4 py-4 ${inRange ? 'border-moss-dark/30 bg-moss-dark/10' : 'border-torch-ember/30 bg-torch-ember/5'}`}>
      <div className="flex items-center gap-2 mb-3">
        {inRange
          ? <Check className="h-3.5 w-3.5 text-moss-light" strokeWidth={2.5} />
          : <AlertTriangle className="h-3.5 w-3.5 text-torch-ember" strokeWidth={2} />
        }
        <span className={`text-xs font-semibold tracking-[0.08em] uppercase ${inRange ? 'text-moss-light' : 'text-torch-ember'}`}>
          {inRange ? 'Live Jackpot Estimate — On Target' : 'Live Jackpot Estimate — Planning Mismatch'}
        </span>
        <span className="text-[9px] text-bone-faint ml-auto">Read-only</span>
      </div>

      <div className="space-y-1.5 mb-3">
        {([
          { label: 'Fail rate (1 − survival_probability)',                           val: `${(failRate * 100).toFixed(1)}%`,           highlight: false },
          { label: 'Live jackpot rate from losing stakes (jackpot_contribution_rate)', val: `${(jackpotContribFrac * 100).toFixed(1)}%`, highlight: false },
          { label: 'Estimated live jackpot share of total stakes',                   val: `${estLiveJackpotShare.toFixed(2)}%`,         highlight: true  },
          { label: 'Target jackpot allocation (jackpot_allocation_rate)',             val: `${targetJackpotShare.toFixed(1)}%`,          highlight: true  },
        ] as const).map(({ label, val, highlight }) => (
          <div key={label} className="flex justify-between items-baseline gap-4">
            <span className="text-[10px] text-bone-faint">{label}</span>
            <span className={`text-[10px] font-mono flex-shrink-0 ${highlight ? 'text-bone' : 'text-bone-faint'}`}>{val}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-1.5 border-t border-moss-dark/15">
          <span className="text-[10px] font-semibold text-bone">Difference</span>
          <span className={`text-[10px] font-mono font-semibold ${inRange ? 'text-moss-light' : 'text-torch-ember'}`}>
            {difference >= 0 ? '+' : ''}{difference.toFixed(2)}%
          </span>
        </div>
      </div>

      <p className="text-[9px] text-bone-faint/55 leading-relaxed">
        Estimated live jackpot share = fail rate × jackpot_contribution_rate. This is an approximation based on current
        settings assuming a uniform stake mix. Actual share varies by tier distribution.
      </p>
    </div>
  );
}
