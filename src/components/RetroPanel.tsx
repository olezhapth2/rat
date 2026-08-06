'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { RetroSettings } from '../game/retro';
import { saveRetroSettings } from '../game/retro';

interface RetroPanelProps {
  settings: RetroSettings;
  onChange: (s: RetroSettings) => void;
  isAdmin: boolean;
}

type OptionDef = { value: string; label: string };

const CRT_OPTIONS: OptionDef[] = [
  { value: 'off', label: 'OFF' },
  { value: 'barrel_strong', label: 'BARREL 1' },
  { value: 'barrel_light', label: 'BARREL 2' },
  { value: 'curve_strong', label: 'CURVE 1' },
  { value: 'curve_light', label: 'CURVE 2' },
  { value: 'glow_strong', label: 'GLOW 1' },
  { value: 'glow_light', label: 'GLOW 2' },
];
const SCANLINE_OPTIONS: OptionDef[] = [
  { value: 'off', label: 'OFF' },
  { value: 'crt_thick', label: 'CRT 1' },
  { value: 'crt_thin', label: 'CRT 2' },
  { value: 'rgb_strong', label: 'RGB 1' },
  { value: 'rgb_light', label: 'RGB 2' },
  { value: 'h_strong', label: 'LINE 1' },
  { value: 'h_light', label: 'LINE 2' },
];
const NOISE_OPTIONS: OptionDef[] = [
  { value: 'off', label: 'OFF' },
  { value: 'grain_strong', label: 'GRAIN 1' },
  { value: 'grain_light', label: 'GRAIN 2' },
  { value: 'vhs_strong', label: 'VHS 1' },
  { value: 'vhs_light', label: 'VHS 2' },
  { value: 'static_strong', label: 'TV 1' },
  { value: 'static_light', label: 'TV 2' },
];
const COLOR_OPTIONS: OptionDef[] = [
  { value: 'off', label: 'OFF' },
  { value: 'warm', label: 'WARM' },
  { value: 'cool', label: 'COOL' },
  { value: 'vivid', label: 'VIVID' },
  { value: 'retro', label: 'RETRO' },
  { value: 'gb', label: 'GB' },
  { value: 'amber', label: 'AMBER' },
];
const VIGNETTE_OPTIONS: OptionDef[] = [
  { value: 'off', label: 'OFF' },
  { value: 'dark_strong', label: 'DARK 1' },
  { value: 'dark_light', label: 'DARK 2' },
  { value: 'corner_strong', label: 'CORN 1' },
  { value: 'corner_light', label: 'CORN 2' },
  { value: 'tunnel_strong', label: 'TUN 1' },
  { value: 'tunnel_light', label: 'TUN 2' },
];

function OptionGroup({
  label, icon, options, value, onChange,
}: {
  label: string; icon: string; options: OptionDef[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 9, color: 'var(--px-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon icon={icon} width={14} height={14} />
        {label}
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <div
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '4px 7px',
              fontSize: 8,
              cursor: 'pointer',
              background: value === opt.value ? 'var(--px-accent)' : 'var(--px-panel-header)',
              color: value === opt.value ? 'white' : 'var(--px-text-dim)',
              border: `1px solid ${value === opt.value ? 'var(--px-accent)' : 'var(--px-border-dark)'}`,
              borderRadius: 0,
              transition: 'none',
              userSelect: 'none',
            }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RetroPanel({ settings, onChange, isAdmin }: RetroPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  if (!isAdmin) return null;

  const update = (partial: Partial<RetroSettings>) => {
    const next = { ...settings, ...partial };
    onChange(next);
    saveRetroSettings(next);
  };

  return (
    <div style={{ position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 200, pointerEvents: 'auto' }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: 'var(--px-text-dim)', borderRadius: 0, userSelect: 'none', width: 'fit-content',
        }}
      >
        <Icon icon="streamline-pixel:photography-retouch-wand" width={16} height={16} />
        RETRO FX
        <span style={{ fontSize: 9, opacity: 0.6 }}>{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && (
        <div
          style={{
            background: 'var(--px-panel)', border: '2px solid var(--px-border)',
            boxShadow: '3px 3px 0 var(--px-shadow)', padding: 12, marginTop: 4,
            display: 'flex', flexDirection: 'column', gap: 10, minWidth: 320,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <OptionGroup label="CRT" icon="streamline-pixel:computers-devices-electronics-television-vintage" options={CRT_OPTIONS} value={settings.crt} onChange={(v) => update({ crt: v as any })} />
          <OptionGroup label="SCANLINES" icon="streamline-pixel:design-color-spray" options={SCANLINE_OPTIONS} value={settings.scanlines} onChange={(v) => update({ scanlines: v as any })} />
          <OptionGroup label="NOISE" icon="streamline-pixel:interface-essential-alert" options={NOISE_OPTIONS} value={settings.noise} onChange={(v) => update({ noise: v as any })} />
          <OptionGroup label="COLOR" icon="streamline-pixel:design-color-painting-palette" options={COLOR_OPTIONS} value={settings.color} onChange={(v) => update({ color: v as any })} />
          <OptionGroup label="VIGNETTE" icon="streamline-pixel:interface-essential-view-eye" options={VIGNETTE_OPTIONS} value={settings.vignette} onChange={(v) => update({ vignette: v as any })} />
        </div>
      )}
    </div>
  );
}
