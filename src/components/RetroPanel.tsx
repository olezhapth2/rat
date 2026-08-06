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

const CRT_OPTIONS: RetroSettings['crt'][] = ['off', 'low', 'medium', 'high', 'ultra', 'max', 'extreme'];
const SCANLINE_OPTIONS: RetroSettings['scanlines'][] = ['off', 'subtle', 'thin', 'normal', 'thick', 'heavy', 'crt'];
const NOISE_OPTIONS: RetroSettings['noise'][] = ['off', 'subtle', 'light', 'medium', 'heavy', 'static', 'snow'];
const COLOR_OPTIONS: RetroSettings['color'][] = ['off', 'warm', 'cool', 'vivid', 'retro', 'gb', 'amber'];
const VIGNETTE_OPTIONS: RetroSettings['vignette'][] = ['off', 'subtle', 'light', 'medium', 'strong', 'deep', 'tunnel'];

function OptionGroup<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
  labels,
}: {
  label: string;
  icon: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 7, color: 'var(--px-text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon icon={icon} width={10} height={10} />
        {label}
      </div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <div
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: '3px 5px',
              fontSize: 7,
              cursor: 'pointer',
              background: value === opt ? 'var(--px-accent)' : 'var(--px-panel-header)',
              color: value === opt ? 'white' : 'var(--px-text-dim)',
              border: `1px solid ${value === opt ? 'var(--px-accent)' : 'var(--px-border-dark)'}`,
              borderRadius: 3,
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
          >
            {labels[opt]}
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
    <div
      style={{
        position: 'fixed',
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        pointerEvents: 'auto',
      }}
    >
      {/* Toggle button */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: 'var(--px-panel)',
          border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '5px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 8,
          color: 'var(--px-text-dim)',
          borderRadius: 4,
          userSelect: 'none',
          margin: '0 auto',
          width: 'fit-content',
        }}
      >
        <Icon icon="streamline-pixel:photography-retouch-wand" width={12} height={12} />
        RETRO FX
        <span style={{ fontSize: 7, opacity: 0.6 }}>{collapsed ? '▲' : '▼'}</span>
      </div>

      {/* Panel */}
      {!collapsed && (
        <div
          style={{
            background: 'var(--px-panel)',
            border: '2px solid var(--px-border)',
            boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
            padding: 10,
            marginTop: 4,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 300,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <OptionGroup
            label="CRT"
            icon="streamline-pixel:computers-devices-electronics-television-vintage"
            options={CRT_OPTIONS}
            value={settings.crt}
            onChange={(v) => update({ crt: v })}
            labels={{ off: 'OFF', low: '1', medium: '2', high: '3', ultra: '4', max: '5', extreme: '6' }}
          />
          <OptionGroup
            label="SCANLINES"
            icon="streamline-pixel:design-color-spray"
            options={SCANLINE_OPTIONS}
            value={settings.scanlines}
            onChange={(v) => update({ scanlines: v })}
            labels={{ off: 'OFF', subtle: '1', thin: '2', normal: '3', thick: '4', heavy: '5', crt: '6' }}
          />
          <OptionGroup
            label="NOISE"
            icon="streamline-pixel:interface-essential-alert"
            options={NOISE_OPTIONS}
            value={settings.noise}
            onChange={(v) => update({ noise: v })}
            labels={{ off: 'OFF', subtle: '1', light: '2', medium: '3', heavy: '4', static: '5', snow: '6' }}
          />
          <OptionGroup
            label="COLOR"
            icon="streamline-pixel:design-color-painting-palette"
            options={COLOR_OPTIONS}
            value={settings.color}
            onChange={(v) => update({ color: v })}
            labels={{ off: 'OFF', warm: 'WARM', cool: 'COOL', vivid: 'VIV', retro: 'RET', gb: 'GB', amber: 'AMB' }}
          />
          <OptionGroup
            label="VIGNETTE"
            icon="streamline-pixel:interface-essential-view-eye"
            options={VIGNETTE_OPTIONS}
            value={settings.vignette}
            onChange={(v) => update({ vignette: v })}
            labels={{ off: 'OFF', subtle: '1', light: '2', medium: '3', strong: '4', deep: '5', tunnel: '6' }}
          />
        </div>
      )}
    </div>
  );
}
