// Scene Editor — Layer Settings panel
// Editable form for all SceneLayer fields, door animation, and effects.

import type {
  SceneLayer, LayerType, LayerRole, AnimationPreset, EffectPreset,
  DoorAnimationPreset, DoorAnimationTrigger,
} from '../../../lib/types';

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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  layer:    SceneLayer;
  onChange: (updated: SceneLayer) => void;
}

export default function SceneEditorLayerSettings({ layer, onChange }: Props) {
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

  return (
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
      <TextField label="Asset Path" value={layer.assetPath ?? ''} onChange={(v) => set('assetPath', v || undefined)} />
      {(layer.type === 'text' || layer.type === 'button') && (
        <>
          <TextField label="Text / Label" value={layer.text ?? layer.content ?? ''} onChange={(v) => set('text', v || undefined)} />
        </>
      )}

      {/* ── Position & Size ── */}
      <SectionTitle>Position & Size</SectionTitle>
      <Grid2>
        <NumField label="X (%)" value={layer.x} onChange={(v) => set('x', v)} step={0.5} />
        <NumField label="Y (%)" value={layer.y} onChange={(v) => set('y', v)} step={0.5} />
        <NumField label="W (%)" value={layer.width} onChange={(v) => set('width', v)} step={0.5} min={0} />
        <NumField label="H (%)" value={layer.height} onChange={(v) => set('height', v)} step={0.5} min={0} />
      </Grid2>
      <Grid2>
        <NumField label="Rotation (°)" value={layer.rotation} onChange={(v) => set('rotation', v)} step={0.5} />
        <NumField label="Opacity" value={layer.opacity} onChange={(v) => set('opacity', Math.min(1, Math.max(0, v)))} step={0.05} min={0} max={1} />
      </Grid2>
      <NumField label="Z-Index" value={layer.zIndex} onChange={(v) => set('zIndex', Math.round(v))} step={1} />

      {/* ── Visibility ── */}
      <SectionTitle>Visibility & Lock</SectionTitle>
      <Grid2>
        <CheckField label="Visible"      value={layer.visible}  onChange={(v) => set('visible', v)} />
        <CheckField label="Locked"       value={layer.locked}   onChange={(v) => set('locked', v)} />
        <CheckField label="Mobile Safe"  value={layer.mobileSafeArea} onChange={(v) => set('mobileSafeArea', v)} />
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
  );
}
