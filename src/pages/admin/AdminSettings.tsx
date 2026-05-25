import { useEffect, useState } from 'react';
import { Save, Check, Settings, Puzzle, BookOpen, Coins } from 'lucide-react';
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
      className="jungle-button-secondary flex items-center justify-center w-8 h-8 flex-shrink-0"
      title="Save"
    >
      {saving ? (
        <LoadingSpinner size="sm" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5 text-moss-light" strokeWidth={2.5} />
      ) : (
        <Save className="h-3.5 w-3.5" />
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
  const otherSettings   = settings.filter(
    (s) => !PUZZLE_KEYS.includes(s.key) && !JACKPOT_KEYS.includes(s.key) && s.key !== ONBOARDING_KEY
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
