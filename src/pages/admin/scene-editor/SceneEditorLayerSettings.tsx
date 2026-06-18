// Scene Editor — Layer Settings panel
// Editable form for all SceneLayer fields, door animation, and effects.

import { useState } from 'react';
import { Image } from 'lucide-react';
import type {
  SceneLayer, LayerType, LayerRole, AnimationPreset, EffectPreset,
  DoorAnimationPreset, DoorAnimationTrigger,
} from '../../../lib/types';
import type { SkullGateAsset } from '../../../hooks/useSkullGateAssets';
import { ASSET_TYPE_ROLE } from '../../../hooks/useSkullGateAssets';

const UF = "'Inter', system-ui, sans-serif";

// ── Options ──────────────────────────────────────────────────────────────────

const LAYER_TYPES: LayerType[] = ['image', 'text', 'button', 'effect', 'particle', 'overlay'];

const LAYER_ROLES: LayerRole[] = [
  'none', 'background', 'backplate', 'gate_frame', 'gate_door_left', 'gate_door_right',
  'gate_inner_light', 'gate_glow', 'gate_seal', 'choice_object', 'torch_flame',
  'foreground_decoration', 'atmosphere_effect', 'particle_effect', 'result_effect',
  'text', 'button', 'overlay',
];

const ANIM_PRESETS: AnimationPreset[] = [
  'none', 'slow_float', 'slow_sway', 'fog_drift', 'rain_fall', 'flicker_opacity',
  'pulse_glow', 'branch_sway', 'ember_float', 'firefly_random', 'light_ray_pulse',
  'gate_rumble', 'torch_flicker', 'inner_light_pulse',
];

const EFFECT_PRESETS: EffectPreset[] = [
  'none', 'fog', 'rain', 'light_rays', 'fireflies', 'embers', 'dust',
  'vignette', 'glow_overlay', 'foreground_branches', 'torch_fire', 'gate_glow', 'inner_light',
];

const DOOR_PRESETS: DoorAnimationPreset[] = ['none', 'slide_open', 'swing_open', 'crack_open', 'rumble_only'];
const DOOR_TRIGGERS: DoorAnimationTrigger[] = ['on_select', 'on_cta', 'on_result_reveal', 'on_survive', 'on_fail'];

// ── Tiny form components ──────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontFamily: UF, letterSpacing: '0.16em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)',
      marginBottom: 3,
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

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '5px 8px', fontSize: 11, fontFamily: UF,
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

const numInputStyle: React.CSSProperties = {
  ...inputStyle, textAlign: 'right' as const, width: '100%',
};

const checkStyle: React.CSSProperties = {
  width: 14, height: 14, cursor: 'pointer', accentColor: '#F5D060',
};

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, min, max }: {
  label: string; value: number | undefined; onChange: (v: number) => void;
  step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        value={value ?? ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={numInputStyle}
      />
    </div>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: T[]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} style={selectStyle}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CheckField({ label, value, onChange }: {
  label: string; value: boolean | undefined; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={checkStyle} />
      <Label>{label}</Label>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {children}
    </div>
  );
}

// ── Alignment button group ────────────────────────────────────────────────────

type BtnGroupOption<T extends string> = { value: T; label: string };

function BtnGroup<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: BtnGroupOption<T>[]; onChange: (v: T) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ display: 'flex', gap: 3 }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1, padding: '4px 0', fontSize: 9, fontFamily: UF,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', border: '1px solid',
              borderColor: value === o.value ? 'rgba(245,208,96,0.55)' : 'rgba(50,70,50,0.45)',
              background: value === o.value ? 'rgba(245,208,96,0.12)' : 'rgba(0,0,0,0.25)',
              color: value === o.value ? 'rgba(245,208,96,0.85)' : 'rgba(255,255,255,0.38)',
              transition: 'all 0.15s ease',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Asset Picker ──────────────────────────────────────────────────────────────

function AssetPicker({
  assets,
  onSelect,
  onClose,
}: {
  assets: SkullGateAsset[];
  onSelect: (a: SkullGateAsset) => void;
  onClose:  () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = assets.filter((a) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return a.name.toLowerCase().includes(s) || a.asset_path.toLowerCase().includes(s) || a.tags.some((t) => t.toLowerCase().includes(s));
  });

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 20, background: 'rgba(6,12,8,0.97)',
      border: '1px solid rgba(245,208,96,0.2)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search assets…"
          style={{ ...inputStyle, flex: 1, fontSize: 11 }}
        />
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 16, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: UF, textAlign: 'center' }}>
            {assets.length === 0 ? 'No assets in library yet.' : 'No matches.'}
          </div>
        )}
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '7px 10px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {/* mini thumb */}
            <div style={{ width: 32, height: 32, flexShrink: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={a.asset_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: UF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name || a.asset_path.split('/').pop()}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: UF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.asset_type} · {a.asset_path}
              </div>
            </div>
            {ASSET_TYPE_ROLE[a.asset_type] && (
              <div style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(245,208,96,0.08)', border: '1px solid rgba(245,208,96,0.2)', color: 'rgba(245,208,96,0.5)', fontFamily: UF, flexShrink: 0 }}>
                {ASSET_TYPE_ROLE[a.asset_type]}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  layer:    SceneLayer;
  onChange: (updated: SceneLayer) => void;
  assets?:  SkullGateAsset[];
}

export default function SceneEditorLayerSettings({ layer, onChange, assets = [] }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const set = <K extends keyof SceneLayer>(key: K, value: SceneLayer[K]) =>
    onChange({ ...layer, [key]: value });

  const setDoor = <K extends keyof NonNullable<SceneLayer['doorAnimation']>>(
    key: K,
    value: NonNullable<SceneLayer['doorAnimation']>[K],
  ) => {
    const base = layer.doorAnimation ?? {
      preset: 'slide_open', trigger: 'on_survive',
      durationMs: 900, delayMs: 250,
    };
    onChange({ ...layer, doorAnimation: { ...base, [key]: value } });
  };

  const setEffect = <K extends keyof NonNullable<SceneLayer['effects']>>(
    key: K,
    value: NonNullable<SceneLayer['effects']>[K],
  ) => onChange({ ...layer, effects: { ...layer.effects, [key]: value } });

  const isDoor = layer.role === 'gate_door_left' || layer.role === 'gate_door_right';

  const handleAssetSelect = (a: SkullGateAsset) => {
    const suggestedRole = ASSET_TYPE_ROLE[a.asset_type] as SceneLayer['role'] | undefined;
    const updated: SceneLayer = { ...layer, assetPath: a.asset_path };
    if (suggestedRole && layer.role === 'none') updated.role = suggestedRole as SceneLayer['role'];
    onChange(updated);
    setShowPicker(false);
  };

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
      {showPicker && (
        <AssetPicker
          assets={assets}
          onSelect={handleAssetSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 7,
      padding: '10px', overflowY: 'auto', height: '100%', minHeight: 0,
    }}>
      <div style={{
        fontSize: 9, fontFamily: UF, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.28)', marginBottom: 4,
      }}>
        Layer: <span style={{ color: 'rgba(245,208,96,0.65)' }}>{layer.name}</span>
      </div>

      {/* ── Identity ── */}
      <SectionTitle>Identity</SectionTitle>
      <TextField label="Name" value={layer.name} onChange={(v) => set('name', v)} />
      <Grid2>
        <SelectField label="Type" value={layer.type} options={LAYER_TYPES} onChange={(v) => set('type', v)} />
        <SelectField label="Role" value={layer.role} options={LAYER_ROLES} onChange={(v) => set('role', v)} />
      </Grid2>

      {/* ── Asset ── */}
      <SectionTitle>Asset</SectionTitle>
      <div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextField label="Asset Path" value={layer.assetPath ?? ''} onChange={(v) => set('assetPath', v || undefined)} />
          </div>
          <button
            onClick={() => setShowPicker(true)}
            title="Pick from Asset Library"
            style={{
              flexShrink: 0, padding: '5px 8px', marginBottom: 0,
              background: assets.length > 0 ? 'rgba(50,80,50,0.4)' : 'rgba(30,40,30,0.3)',
              border: '1px solid rgba(80,140,50,0.3)',
              cursor: assets.length > 0 ? 'pointer' : 'not-allowed',
              color: assets.length > 0 ? '#A8D090' : 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center',
            }}
            disabled={assets.length === 0}
          >
            <Image size={12} />
          </button>
        </div>
        {layer.assetPath && (
          <div style={{ marginTop: 4, width: 40, height: 40, background: 'rgba(0,0,0,0.4)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <img src={layer.assetPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
          </div>
        )}
      </div>
      {(layer.type === 'text' || layer.type === 'button') && (
        <>
          <TextField label="Text / Label" value={layer.text ?? layer.content ?? ''} onChange={(v) => set('text', v || undefined)} />
        </>
      )}

      {/* ── Position & Size ── */}
      <SectionTitle>Position & Size</SectionTitle>
      <Grid2>
        <NumField
          label={`X (${layer.xUnit === 'px' ? 'px' : '%'}) — ${layer.xAnchor ?? 'left'}`}
          value={layer.x}
          onChange={(v) => set('x', v)}
          step={layer.xUnit === 'px' ? 1 : 0.5}
        />
        <NumField
          label={`Y (${layer.yUnit === 'px' ? 'px' : '%'}) — ${layer.yAnchor ?? 'top'}`}
          value={layer.y}
          onChange={(v) => set('y', v)}
          step={layer.yUnit === 'px' ? 1 : 0.5}
        />
        <NumField label="W (%)" value={layer.width}  onChange={(v) => set('width', v)}  step={0.5} min={0} />
        <NumField label="H (%)" value={layer.height} onChange={(v) => set('height', v)} step={0.5} min={0} />
      </Grid2>
      <Grid2>
        <NumField label="Rotation (°)" value={layer.rotation} onChange={(v) => set('rotation', v)} step={0.5} />
        <NumField label="Opacity" value={layer.opacity} onChange={(v) => set('opacity', Math.min(1, Math.max(0, v)))} step={0.05} min={0} max={1} />
      </Grid2>
      <NumField label="Z-Index" value={layer.zIndex} onChange={(v) => set('zIndex', Math.round(v))} step={1} />

      {/* ── Alignment ── */}
      <SectionTitle>Alignment</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <BtnGroup
          label="Horizontal anchor"
          value={layer.xAnchor ?? 'left'}
          options={[
            { value: 'left',   label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right',  label: 'Right' },
          ]}
          onChange={(v) => set('xAnchor', v)}
        />
        <BtnGroup
          label="Vertical anchor"
          value={layer.yAnchor ?? 'top'}
          options={[
            { value: 'top',    label: 'Top' },
            { value: 'middle', label: 'Middle' },
            { value: 'bottom', label: 'Bottom' },
          ]}
          onChange={(v) => set('yAnchor', v)}
        />
        <Grid2>
          <BtnGroup
            label="X unit"
            value={layer.xUnit ?? 'pct'}
            options={[
              { value: 'pct', label: '%' },
              { value: 'px',  label: 'px' },
            ]}
            onChange={(v) => set('xUnit', v)}
          />
          <BtnGroup
            label="Y unit"
            value={layer.yUnit ?? 'pct'}
            options={[
              { value: 'pct', label: '%' },
              { value: 'px',  label: 'px' },
            ]}
            onChange={(v) => set('yUnit', v)}
          />
        </Grid2>
      </div>

      {/* ── Visibility ── */}
      <SectionTitle>Visibility & Lock</SectionTitle>
      <Grid2>
        <CheckField label="Visible"          value={layer.visible}         onChange={(v) => set('visible', v)} />
        <CheckField label="Locked"           value={layer.locked}          onChange={(v) => set('locked', v)} />
        <CheckField label="Mobile Safe"      value={layer.mobileSafeArea}  onChange={(v) => set('mobileSafeArea', v)} />
        <CheckField label="Parallax / Sway"  value={layer.parallaxEnabled} onChange={(v) => set('parallaxEnabled', v)} />
      </Grid2>

      {/* ── Animation ── */}
      <SectionTitle>Animation</SectionTitle>
      <SelectField
        label="Animation Preset"
        value={layer.animationPreset ?? 'none'}
        options={ANIM_PRESETS}
        onChange={(v) => set('animationPreset', v)}
      />
      <SelectField
        label="Effect Preset"
        value={layer.effectPreset ?? 'none'}
        options={EFFECT_PRESETS}
        onChange={(v) => set('effectPreset', v)}
      />

      {/* ── Interaction ── */}
      <SectionTitle>Interaction</SectionTitle>
      <Grid2>
        <CheckField label="Clickable" value={layer.clickable} onChange={(v) => set('clickable', v)} />
      </Grid2>
      {layer.clickable && (
        <>
          <TextField label="Choice ID" value={layer.choiceId ?? ''} onChange={(v) => set('choiceId', v || undefined)} />
          <TextField label="Click Action" value={layer.clickAction ?? ''} onChange={(v) => set('clickAction', v || undefined)} />
        </>
      )}

      {/* ── Door Animation ── */}
      {isDoor && (
        <>
          <SectionTitle>Door Animation</SectionTitle>
          <Grid2>
            <SelectField
              label="Preset"
              value={layer.doorAnimation?.preset ?? 'none'}
              options={DOOR_PRESETS}
              onChange={(v) => setDoor('preset', v)}
            />
            <SelectField
              label="Trigger"
              value={layer.doorAnimation?.trigger ?? 'on_survive'}
              options={DOOR_TRIGGERS}
              onChange={(v) => setDoor('trigger', v)}
            />
          </Grid2>
          <Grid2>
            <NumField label="Duration (ms)" value={layer.doorAnimation?.durationMs} onChange={(v) => setDoor('durationMs', v)} step={50} min={0} />
            <NumField label="Delay (ms)"    value={layer.doorAnimation?.delayMs}    onChange={(v) => setDoor('delayMs', v)} step={50} min={0} />
          </Grid2>
          <Grid2>
            <NumField label="Translate X (%)" value={layer.doorAnimation?.openTranslateX} onChange={(v) => setDoor('openTranslateX', v)} step={1} />
            <NumField label="Translate Y (%)" value={layer.doorAnimation?.openTranslateY} onChange={(v) => setDoor('openTranslateY', v)} step={1} />
            <NumField label="Rotation (°)"    value={layer.doorAnimation?.openRotation}   onChange={(v) => setDoor('openRotation', v)} step={0.5} />
            <NumField label="Scale"           value={layer.doorAnimation?.openScale}      onChange={(v) => setDoor('openScale', v)} step={0.01} min={0} />
            <NumField label="Open Opacity"    value={layer.doorAnimation?.openOpacity}    onChange={(v) => setDoor('openOpacity', v)} step={0.05} min={0} max={1} />
          </Grid2>
          <TextField label="Easing"      value={layer.doorAnimation?.easing ?? ''} onChange={(v) => setDoor('easing', v || undefined)} />
        </>
      )}

      {/* ── Layer Effects ── */}
      <SectionTitle>Layer Effects</SectionTitle>
      <Grid2>
        <CheckField label="Glow"         value={layer.effects?.glow}         onChange={(v) => setEffect('glow', v)} />
        <CheckField label="Shadow"       value={layer.effects?.shadow}       onChange={(v) => setEffect('shadow', v)} />
        <CheckField label="Flicker"      value={layer.effects?.flicker}      onChange={(v) => setEffect('flicker', v)} />
        <CheckField label="Pulse"        value={layer.effects?.pulse}        onChange={(v) => setEffect('pulse', v)} />
        <CheckField label="Sel. Glow"    value={layer.effects?.selectedGlow} onChange={(v) => setEffect('selectedGlow', v)} />
        <CheckField label="Opacity Pulse" value={layer.effects?.opacityPulse} onChange={(v) => setEffect('opacityPulse', v)} />
      </Grid2>
      <Grid2>
        <NumField label="Sel. Scale"  value={layer.effects?.selectedScale}  onChange={(v) => setEffect('selectedScale', v)} step={0.01} min={0.5} max={2} />
        <NumField label="Brightness"  value={layer.effects?.brightness}     onChange={(v) => setEffect('brightness', v)} step={0.05} min={0} max={2} />
        <NumField label="Blur (px)"   value={layer.effects?.blur}           onChange={(v) => setEffect('blur', v)} step={1} min={0} />
      </Grid2>
      <TextField label="Color Mood (css color)" value={layer.effects?.colorMood ?? ''} onChange={(v) => setEffect('colorMood', v || undefined)} />
    </div>
    </div>
  );
}
