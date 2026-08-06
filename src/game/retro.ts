export interface RetroSettings {
  crt: 'off' | 'barrel_strong' | 'barrel_light' | 'curve_strong' | 'curve_light' | 'glow_strong' | 'glow_light';
  scanlines: 'off' | 'crt_thick' | 'crt_thin' | 'rgb_strong' | 'rgb_light' | 'h_strong' | 'h_light';
  noise: 'off' | 'grain_strong' | 'grain_light' | 'vhs_strong' | 'vhs_light' | 'static_strong' | 'static_light';
  color: 'off' | 'warm' | 'cool' | 'vivid' | 'retro' | 'gb' | 'amber';
  vignette: 'off' | 'dark_strong' | 'dark_light' | 'corner_strong' | 'corner_light' | 'tunnel_strong' | 'tunnel_light';
}

export const RETRO_DEFAULTS: RetroSettings = {
  crt: 'off',
  scanlines: 'off',
  noise: 'off',
  color: 'off',
  vignette: 'off',
};

const STORAGE_KEY = 'secretgang_retro';

export function loadRetroSettings(): RetroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...RETRO_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...RETRO_DEFAULTS };
}

export function saveRetroSettings(s: RetroSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// CRT
export function getCrtIntensity(s: RetroSettings): number {
  if (s.crt.includes('strong')) return 0.6;
  if (s.crt.includes('light')) return 0.25;
  return 0;
}
export function getCrtType(s: RetroSettings): 'barrel' | 'curve' | 'glow' | 'none' {
  if (s.crt.startsWith('barrel')) return 'barrel';
  if (s.crt.startsWith('curve')) return 'curve';
  if (s.crt.startsWith('glow')) return 'glow';
  return 'none';
}

// Noise
export function getNoiseOpacity(s: RetroSettings): number {
  if (s.noise === 'grain_strong') return 0.06;
  if (s.noise === 'grain_light') return 0.025;
  if (s.noise === 'static_strong') return 0.08;
  if (s.noise === 'static_light') return 0.035;
  return 0;
}
export function getNoiseType(s: RetroSettings): 'grain' | 'vhs' | 'static' | 'none' {
  if (s.noise.startsWith('grain')) return 'grain';
  if (s.noise.startsWith('vhs')) return 'vhs';
  if (s.noise.startsWith('static')) return 'static';
  return 'none';
}
export function isVhsNoise(s: RetroSettings): boolean {
  return s.noise.startsWith('vhs');
}

// Scanlines
export function getScanlineOpacity(s: RetroSettings): number {
  if (s.scanlines.includes('strong')) return 0.3;
  if (s.scanlines.includes('light')) return 0.12;
  return 0;
}
export function getScanlineType(s: RetroSettings): 'crt' | 'rgb' | 'h' | 'none' {
  if (s.scanlines.startsWith('crt')) return 'crt';
  if (s.scanlines.startsWith('rgb')) return 'rgb';
  if (s.scanlines.startsWith('h_')) return 'h';
  return 'none';
}

// Vignette
export function getVignetteOpacity(s: RetroSettings): number {
  if (s.vignette.includes('strong')) return 0.6;
  if (s.vignette.includes('light')) return 0.25;
  return 0;
}
export function getVignetteType(s: RetroSettings): 'dark' | 'corner' | 'tunnel' | 'none' {
  if (s.vignette.startsWith('dark')) return 'dark';
  if (s.vignette.startsWith('corner')) return 'corner';
  if (s.vignette.startsWith('tunnel')) return 'tunnel';
  return 'none';
}

// Color
export function getColorFilter(s: RetroSettings): string {
  switch (s.color) {
    case 'warm': return 'contrast(1.05) brightness(1.02) sepia(0.12) saturate(1.15)';
    case 'cool': return 'contrast(1.05) brightness(1.02) hue-rotate(10deg) saturate(1.1)';
    case 'vivid': return 'contrast(1.15) brightness(1.05) saturate(1.4)';
    case 'retro': return 'contrast(1.08) brightness(0.92) sepia(0.25) saturate(1.05)';
    case 'gb': return 'contrast(1.2) brightness(1.05) saturate(0.5) hue-rotate(50deg)';
    case 'amber': return 'contrast(1.1) brightness(1.0) sepia(0.4) saturate(1.3) hue-rotate(-10deg)';
    default: return 'none';
  }
}

export function isRetroActive(s: RetroSettings): boolean {
  return s.crt !== 'off' || s.scanlines !== 'off' || s.noise !== 'off' ||
         s.color !== 'off' || s.vignette !== 'off';
}
