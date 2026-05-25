// Scene Editor — Scene Settings panel
// Editable form for SkullGateSceneConfig metadata fields.

import type { SkullGateSceneConfig, SkullGateTemplateType } from '../../../lib/types';

const UF = "'Inter', system-ui, sans-serif";

const TEMPLATE_TYPES: SkullGateTemplateType[] = [
  'choice_2', 'choice_3', 'tap_reveal', 'hold_reveal', 'drag_to_target',
  'timed_tap', 'reveal_tiles', 'ritual_roll', 'spin_reveal', 'swipe_reveal',
];

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '5px 8px', fontSize: 11,
  fontFamily: UF,
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(50,70,50,0.45)',
  color: 'rgba(255,255,255,0.75)',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='rgba(255,255,255,0.35)' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  paddingRight: 24,
};

const numInputStyle: React.CSSProperties = { ...inputStyle, textAlign: 'right' as const };
const checkStyle: React.CSSProperties = { width: 14, height: 14, cursor: 'pointer', accentColor: '#F5D060' };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: UF, letterSpacing: '0.16em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 3,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: UF, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: 'rgba(245,208,96,0.55)', marginTop: 10, marginBottom: 5,
      paddingBottom: 4, borderBottom: '1px solid rgba(40,55,42,0.4)',
    }}>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 }}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, min, max, nullable = false }: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void;
  step?: number; min?: number; max?: number; nullable?: boolean;
}) {
  return (
    <div>
      <Label>{label}{nullable && ' (blank = ∞)'}</Label>
      <input
        type="number"
        value={value ?? ''}
        step={step}
        min={min} max={max}
        onChange={(e) => {
          const v = e.target.value;
          onChange(nullable && v === '' ? null : parseFloat(v) || 0);
        }}
        style={numInputStyle}
      />
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>{children}</div>;
}

interface Props {
  scene:    SkullGateSceneConfig;
  onChange: (updated: SkullGateSceneConfig) => void;
}

export default function SceneEditorSceneSettings({ scene, onChange }: Props) {
  const set = <K extends keyof SkullGateSceneConfig>(key: K, value: SkullGateSceneConfig[K]) =>
    onChange({ ...scene, [key]: value });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 7,
      padding: '10px', overflowY: 'auto',
    }}>

      <SectionTitle>Identity</SectionTitle>
      <TextField label="Title"       value={scene.title}       onChange={(v) => set('title', v)} />
      <TextField label="Slug"        value={scene.slug}        onChange={(v) => set('slug', v)} />
      <TextField label="Description" value={scene.description ?? ''} onChange={(v) => set('description', v || undefined)} multiline />
      <Grid2>
        <div>
          <Label>Template Type</Label>
          <select value={scene.templateType} onChange={(e) => set('templateType', e.target.value as SkullGateTemplateType)} style={selectStyle}>
            {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label>Status</Label>
          <select value={scene.status} onChange={(e) => set('status', e.target.value as SkullGateSceneConfig['status'])} style={selectStyle}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </Grid2>
      <Grid2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 14 }}>
          <input type="checkbox" checked={scene.enabled} onChange={(e) => set('enabled', e.target.checked)} style={checkStyle} />
          <Label>Enabled</Label>
        </div>
        <NumField label="Weight"       value={scene.weight}        onChange={(v) => set('weight', v ?? undefined)} />
      </Grid2>
      <Grid2>
        <NumField label="Cooldown Days" value={scene.cooldownDays}  onChange={(v) => set('cooldownDays', v ?? undefined)} min={0} />
        <NumField label="Min Streak"    value={scene.minStreak}     onChange={(v) => set('minStreak', v ?? undefined)} min={0} />
      </Grid2>
      <NumField label="Max Streak" value={scene.maxStreak ?? null} onChange={(v) => set('maxStreak', v)} nullable min={0} />

      <SectionTitle>Text Copy</SectionTitle>
      <TextField label="Intro Text"       value={scene.introText ?? ''}        onChange={(v) => set('introText', v || undefined)} multiline />
      <TextField label="Instruction Text" value={scene.instructionText}        onChange={(v) => set('instructionText', v)} multiline />
      <TextField label="CTA Text"         value={scene.ctaText}               onChange={(v) => set('ctaText', v)} />
      <TextField label="Survive Text"     value={scene.surviveText}           onChange={(v) => set('surviveText', v)} multiline />
      <TextField label="Fail Text"        value={scene.failText}              onChange={(v) => set('failText', v)} multiline />
      <TextField label="Cashout Text"     value={scene.cashoutText ?? ''}     onChange={(v) => set('cashoutText', v || undefined)} />
    </div>
  );
}
