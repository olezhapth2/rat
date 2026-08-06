export interface RetroSettings {
  crt: 'off' | 'low' | 'medium' | 'high' | 'ultra' | 'max' | 'extreme';
  scanlines: 'off' | 'subtle' | 'thin' | 'normal' | 'thick' | 'heavy' | 'crt';
  noise: 'off' | 'subtle' | 'light' | 'medium' | 'heavy' | 'static' | 'snow';
  color: 'off' | 'warm' | 'cool' | 'vivid' | 'retro' | 'gb' | 'amber';
  vignette: 'off' | 'subtle' | 'light' | 'medium' | 'strong' | 'deep' | 'tunnel';
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
    case 'low': return 0.15;
    case 'medium': return 0.3;
    case 'high': return 0.5;
    case 'ultra': return 0.7;
    case 'max': return 0.85;
    case 'extreme': return 1.0;
    default: return 0;
  }
}

export function getNoiseOpacity(s: RetroSettings): number {
  switch (s.noise) {
    case 'subtle': return 0.008;
    case 'light': return 0.015;
    case 'medium': return 0.025;
    case 'heavy': return 0.04;
    case 'static': return 0.06;
    case 'snow': return 0.08;
    default: return 0;
  }
}

export function getScanlineOpacity(s: RetroSettings): number {
  switch (s.scanlines) {
    case 'subtle': return 0.06;
    case 'thin': return 0.1;
    case 'normal': return 0.15;
    case 'thick': return 0.2;
    case 'heavy': return 0.28;
    case 'crt': return 0.35;
    default: return 0;
  }
}

export function getScanlineGap(s: RetroSettings): number {
  switch (s.scanlines) {
    case 'crt': return 4;
    case 'heavy': return 3;
    case 'thick': return 3;
    default: return 2;
  }
}

export function getVignetteOpacity(s: RetroSettings): number {
  switch (s.vignette) {
    case 'subtle': return 0.15;
    case 'light': return 0.25;
    case 'medium': return 0.35;
    case 'strong': return 0.5;
    case 'deep': return 0.65;
    case 'tunnel': return 0.8;
    default: return 0;
  }
}

export function getColorFilter(s: RetroSettings): string {
  switch (s.color) {
    case 'warm': return 'contrast(1.05) brightness(1.02) sepia(0.1) saturate(1.15)';
    case 'cool': return 'contrast(1.05) brightness(1.02) hue-rotate(8deg) saturate(1.1)';
    case 'vivid': return 'contrast(1.12) brightness(1.04) saturate(1.35)';
    case 'retro': return 'contrast(1.08) brightness(0.95) sepia(0.25) saturate(1.1)';
    case 'gb': return 'contrast(1.2) brightness(1.05) saturate(0.6) hue-rotate(50deg)';
    case 'amber': return 'contrast(1.1) brightness(1.0) sepia(0.4) saturate(1.3) hue-rotate(-10deg)';
    default: return 'none';
  }
}

export function isRetroActive(s: RetroSettings): boolean {
  return s.crt !== 'off' || s.scanlines !== 'off' || s.noise !== 'off' ||
         s.color !== 'off' || s.vignette !== 'off';
}
