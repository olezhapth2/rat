export interface RetroSettings {
  crt: 'off' | 'low' | 'medium' | 'high';
  scanlines: 'off' | 'thin' | 'thick';
  noise: 'off' | 'light' | 'heavy';
  color: 'off' | 'warm' | 'cool' | 'vivid';
  vignette: 'off' | 'light' | 'strong';
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

export function getCrtIntensity(s: RetroSettings): number {
  switch (s.crt) {
    case 'low': return 0.3;
    case 'medium': return 0.6;
    case 'high': return 1.0;
    default: return 0;
  }
}

export function getNoiseOpacity(s: RetroSettings): number {
  switch (s.noise) {
    case 'light': return 0.03;
    case 'heavy': return 0.07;
    default: return 0;
  }
}

export function getScanlineOpacity(s: RetroSettings): number {
  switch (s.scanlines) {
    case 'thin': return 0.12;
    case 'thick': return 0.2;
    default: return 0;
  }
}

export function getScanlineGap(s: RetroSettings): number {
  return s.scanlines === 'thick' ? 3 : 2;
}

export function getVignetteOpacity(s: RetroSettings): number {
  switch (s.vignette) {
    case 'light': return 0.3;
    case 'strong': return 0.6;
    default: return 0;
  }
}

export function getColorFilter(s: RetroSettings): string {
  switch (s.color) {
    case 'warm': return 'contrast(1.08) brightness(1.03) sepia(0.12) saturate(1.2)';
    case 'cool': return 'contrast(1.08) brightness(1.03) hue-rotate(8deg) saturate(1.1)';
    case 'vivid': return 'contrast(1.15) brightness(1.05) saturate(1.4)';
    default: return 'none';
  }
}

export function isRetroActive(s: RetroSettings): boolean {
  return s.crt !== 'off' || s.scanlines !== 'off' || s.noise !== 'off' ||
         s.color !== 'off' || s.vignette !== 'off';
}
