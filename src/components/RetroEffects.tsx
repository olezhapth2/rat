'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { RetroSettings } from '../game/retro';
import { getNoiseOpacity, getScanlineOpacity, getScanlineGap, getVignetteOpacity } from '../game/retro';

export default function RetroEffects({ settings, children }: { settings: RetroSettings; children: React.ReactNode }) {
  const noiseCanvasRef = useRef<HTMLCanvasElement>(null);
  const noiseFrameRef = useRef(0);

  const noiseOpacity = getNoiseOpacity(settings);
  const scanlineOpacity = getScanlineOpacity(settings);
  const scanlineGap = getScanlineGap(settings);
  const vignetteOpacity = getVignetteOpacity(settings);

  const generateNoise = useCallback(() => {
    const canvas = noiseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    if (noiseOpacity <= 0) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      noiseFrameRef.current++;
      if (noiseFrameRef.current % 3 === 0) generateNoise();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, [noiseOpacity, generateNoise]);

  useEffect(() => {
    if (noiseOpacity > 0) generateNoise();
  }, [noiseOpacity, generateNoise]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {children}

      {/* Scanlines */}
      {scanlineOpacity > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent ${scanlineGap - 1}px,
              rgba(0,0,0,${scanlineOpacity}) ${scanlineGap - 1}px,
              rgba(0,0,0,${scanlineOpacity}) ${scanlineGap}px
            )`,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}

      {/* Noise */}
      {noiseOpacity > 0 && (
        <canvas
          ref={noiseCanvasRef}
          width={128}
          height={128}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            opacity: noiseOpacity,
            mixBlendMode: 'overlay',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            zIndex: 11,
          }}
        />
      )}

      {/* Vignette */}
      {vignetteOpacity > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: `radial-gradient(ellipse at center, transparent ${50 - vignetteOpacity * 15}%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
            pointerEvents: 'none',
            zIndex: 12,
          }}
        />
      )}
    </div>
  );
}
