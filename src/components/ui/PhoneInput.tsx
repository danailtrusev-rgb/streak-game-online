// PhoneInput — polished country code selector + phone number field
// Used in UpgradeModal (PhoneFlow) and SettingsPage (SMS channel setup).

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

// ── Shared font constants (kept local to avoid coupling) ───────────────────────
const UF = "'Inter', system-ui, sans-serif";

// ── Country data ───────────────────────────────────────────────────────────────

export interface CountryEntry {
  code:  string;
  flag:  string;
  name:  string;
  short: string;
}

export const COUNTRIES: CountryEntry[] = [
  { code: '+34',  flag: '🇪🇸', name: 'Spain',           short: 'ES' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands',     short: 'NL' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgium',         short: 'BE' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom',  short: 'GB' },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada',    short: 'US' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany',         short: 'DE' },
  { code: '+33',  flag: '🇫🇷', name: 'France',          short: 'FR' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy',           short: 'IT' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal',        short: 'PT' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico',          short: 'MX' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina',       short: 'AR' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil',          short: 'BR' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia',       short: 'AU' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand',     short: 'NZ' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa',    short: 'ZA' },
  { code: '+91',  flag: '🇮🇳', name: 'India',           short: 'IN' },
  { code: '+971', flag: '🇦🇪', name: 'UAE',             short: 'AE' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt',           short: 'EG' },
];

// ── Validation ────────────────────────────────────────────────────────────────

export function validatePhone(local: string): 'empty' | 'short' | 'valid' {
  const digits = local.replace(/\D/g, '');
  if (!digits) return 'empty';
  if (digits.length < 6) return 'short';
  return 'valid';
}

export function buildE164(countryCode: string, local: string): string {
  const stripped = local.replace(/^0+/, '').replace(/\D/g, '');
  return `${countryCode}${stripped}`;
}

// ── Country dropdown ──────────────────────────────────────────────────────────

function CountryDropdown({
  selected,
  onSelect,
}: {
  selected: CountryEntry;
  onSelect: (c: CountryEntry) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const wrapRef             = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);

  const filtered = query
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.includes(query) ||
          c.short.toLowerCase().includes(query.toLowerCase()),
      )
    : COUNTRIES;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const pick = useCallback((c: CountryEntry) => {
    onSelect(c);
    setOpen(false);
    setQuery('');
  }, [onSelect]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:             6,
          padding:        '11px 10px 11px 12px',
          background:      open ? 'rgba(255,122,0,0.06)' : 'rgba(255,255,255,0.04)',
          border:         `1px solid ${open ? 'rgba(255,122,0,0.45)' : 'rgba(255,255,255,0.10)'}`,
          cursor:         'pointer',
          transition:     'border-color 0.15s ease, background 0.15s ease',
          whiteSpace:     'nowrap',
          userSelect:     'none',
          minWidth:        0,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{selected.flag}</span>
        <span style={{ fontFamily: UF, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.03em' }}>
          {selected.code}
        </span>
        <ChevronDown
          size={12}
          style={{
            color:      'rgba(255,255,255,0.35)',
            transform:   open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink:  0,
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position:   'absolute',
            top:        'calc(100% + 4px)',
            left:        0,
            zIndex:      500,
            width:       280,
            maxHeight:   300,
            background: 'rgba(10,16,12,0.98)',
            border:     '1px solid rgba(255,122,0,0.25)',
            boxShadow:  '0 8px 32px rgba(0,0,0,0.8)',
            display:    'flex',
            flexDirection: 'column',
            overflow:   'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              style={{
                flex:       1,
                background: 'none',
                border:     'none',
                outline:    'none',
                fontFamily: UF,
                fontSize:    13,
                color:      'rgba(255,255,255,0.8)',
              }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '12px 14px', fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                No results
              </div>
            )}
            {filtered.map((c) => {
              const isSelected = c.code === selected.code && c.short === selected.short;
              return (
                <button
                  key={c.short}
                  type="button"
                  onClick={() => pick(c)}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:             10,
                    width:          '100%',
                    padding:        '9px 12px',
                    background:      isSelected ? 'rgba(255,122,0,0.08)' : 'transparent',
                    border:         'none',
                    cursor:         'pointer',
                    textAlign:      'left',
                    transition:     'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span style={{ fontFamily: UF, fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em', flexShrink: 0 }}>
                    {c.code}
                  </span>
                  {isSelected && <Check size={12} style={{ color: '#FF9A30', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PhoneInput ────────────────────────────────────────────────────────────────

export interface PhoneInputProps {
  countryCode:    string;
  localNumber:    string;
  onCountryChange: (code: string) => void;
  onLocalChange:   (local: string) => void;
  disabled?:       boolean;
  autoFocus?:      boolean;
  onEnter?:        () => void;
}

export default function PhoneInput({
  countryCode,
  localNumber,
  onCountryChange,
  onLocalChange,
  disabled,
  autoFocus,
  onEnter,
}: PhoneInputProps) {
  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const validation = validatePhone(localNumber);
  const hasInput = localNumber.trim().length > 0;

  const borderColor =
    disabled           ? 'rgba(255,255,255,0.06)' :
    hasInput && validation === 'valid'  ? 'rgba(120,176,96,0.5)' :
    hasInput && validation === 'short'  ? 'rgba(200,50,50,0.5)'  :
                                          'rgba(255,255,255,0.10)';

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <CountryDropdown
          selected={selectedCountry}
          onSelect={(c) => onCountryChange(c.code)}
        />
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="tel"
            inputMode="numeric"
            value={localNumber}
            onChange={(e) => onLocalChange(e.target.value.replace(/[^\d\s\-()+]/g, ''))}
            placeholder="612 345 678"
            disabled={disabled}
            autoFocus={autoFocus}
            onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
            style={{
              width:       '100%',
              padding:     '12px 14px',
              background:   disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              border:      `1px solid ${borderColor}`,
              color:       '#E8E0D4',
              fontFamily:   UF,
              fontSize:     14,
              outline:     'none',
              boxSizing:   'border-box',
              transition:  'border-color 0.15s ease',
              cursor:       disabled ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => {
              if (!disabled) e.currentTarget.style.borderColor = 'rgba(255,122,0,0.45)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = borderColor;
            }}
          />
          {hasInput && validation === 'valid' && (
            <Check
              size={14}
              style={{
                position:  'absolute',
                right:      12,
                top:       '50%',
                transform: 'translateY(-50%)',
                color:     '#78B060',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Helper / validation message */}
      <div style={{ marginTop: 6, minHeight: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        {hasInput && validation === 'short' ? (
          <span style={{ fontFamily: UF, fontSize: 11, color: '#CC5555' }}>
            Number is too short
          </span>
        ) : (
          <span style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
            Leading zero is automatically removed where required.
          </span>
        )}
      </div>
    </div>
  );
}
