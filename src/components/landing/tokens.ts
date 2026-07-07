// Shared design tokens for the public landing pages and the operator site.
// Kept close to the in-game palette (see tailwind.config.js) so both sites
// feel like the same product, just tuned differently.

export const playerTokens = {
  bg: 'linear-gradient(180deg, #070A08 0%, #0B0F0C 25%, #0E1410 60%, #080C09 100%)',
  panel: 'rgba(24,32,25,0.6)',
  panelBorder: '1px solid rgba(255,122,0,0.10)',
  gold: '#F5D060',
  ember: '#FFB347',
  torch: '#FF7A00',
  bone: '#E8E2DA',
  boneMuted: '#C8C0B5',
  ctaGradient: 'linear-gradient(180deg, #FFB347 0%, #FF7A00 100%)',
  ctaShadow: '0 0 30px rgba(255,122,0,0.4), 0 0 80px rgba(255,122,0,0.15)',
} as const;

// Operator palette: same jungle-temple family, restrained — more charcoal
// and stone, less ember glow, more whitespace between sections.
export const operatorTokens = {
  bg: 'linear-gradient(180deg, #0C0E0D 0%, #141614 45%, #101210 100%)',
  panel: 'rgba(255,255,255,0.03)',
  panelBorder: '1px solid rgba(212,160,32,0.14)',
  gold: '#D4A020',
  ember: '#B08018',
  bone: '#EDEAE3',
  boneMuted: '#9C9992',
  ctaGradient: 'linear-gradient(180deg, #D4A020 0%, #B08018 100%)',
  ctaShadow: '0 0 24px rgba(212,160,32,0.28)',
} as const;
