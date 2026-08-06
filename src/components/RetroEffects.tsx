'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { RetroSettings } from '../game/retro';
import { getNoiseOpacity, getScanlineOpacity, getScanlineGap, getVignetteOpacity, getCrtIntensity } from '../game/retro';

export default function RetroEffects({ settings, children }: { settings: RetroSettings; children: React.ReactNode }) {
  const noiseCanvasRef = useRef<HTMLCanvasElement>(null);
  const noiseFrameRef = useRef(0);

  const crtIntensity = getCrtIntensity(settings);
  const noiseOpacity = getNoiseOpacity(settings);
  const scanlineOpacity = getScanlineOpacity(settings);
  const scanlineGap = getScanlineGap(settings);
  const vignetteOpacity = getVignetteOpacity(settings);

  // Generate noise texture
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

  // Update noise every few frames for flickering
  useEffect(() => {
    if (noiseOpacity <= 0) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      noiseFrameRef.current++;
      if (noiseFrameRef.current % 3 === 0) {
        generateNoise();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, [noiseOpacity, generateNoise]);

  // Initial noise generation
  useEffect(() => {
    if (noiseOpacity > 0) generateNoise();
  }, [noiseOpacity, generateNoise]);

  const hasEffects = crtIntensity > 0 || scanlineOpacity > 0 || noiseOpacity > 0 || vignetteOpacity > 0;

  return (
    <div
      className="retro-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: crtIntensity > 0 ? `${8 + crtIntensity * 12}px` : 0,
        // CRT curvature simulation
        transform: crtIntensity > 0
          ? `perspective(${800 - crtIntensity * 200}px) rotateX(${crtIntensity * 1.5}deg) scale(${1 + crtIntensity * 0.02})`
          : undefined,
        boxShadow: crtIntensity > 0
          ? `inset 0 0 ${40 + crtIntensity * 60}px rgba(0,0,0,${0.2 + crtIntensity * 0.3}), 0 0 ${20 + crtIntensity * 30}px rgba(0,0,0,${0.1 + crtIntensity * 0.2})`
          : undefined,
      }}
    >
      {children}

      {/* Scanlines overlay */}
      {scanlineOpacity > 0 && (
        <div
          className="retro-scanlines"
          style={{
            position: 'absolute',
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

      {/* Noise overlay */}
      {noiseOpacity > 0 && (
        <canvas
          ref={noiseCanvasRef}
          width={128}
          height={128}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: noiseOpacity,
            mixBlendMode: 'overlay',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            zIndex: 11,
          }}
        />
      )}

      {/* Vignette overlay */}
      {vignetteOpacity > 0 && (
        <div
          className="retro-vignette"
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(
              ellipse at center,
              transparent ${50 - vignetteOpacity * 15}%,
              rgba(0,0,0,${vignetteOpacity}) 100%
            )`,
            pointerEvents: 'none',
            zIndex: 12,
          }}
        />
      )}

      {/* CRT edge glow */}
      {crtIntensity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            boxShadow: `inset 0 0 ${80 * crtIntensity}px rgba(0,20,0,${0.15 * crtIntensity})`,
            pointerEvents: 'none',
            zIndex: 13,
          }}
        />
      )}
    </div>
  );
}
