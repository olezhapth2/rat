'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { RetroSettings } from '../game/retro';
import {
  getNoiseOpacity, getNoiseType, isVhsNoise,
  getScanlineOpacity, getScanlineType,
  getVignetteOpacity, getVignetteType,
  getCrtIntensity, getCrtType,
} from '../game/retro';

export default function RetroEffects({ settings, children }: { settings: RetroSettings; children: React.ReactNode }) {
  const noiseCanvasRef = useRef<HTMLCanvasElement>(null);
  const noiseFrameRef = useRef(0);

  const noiseOpacity = getNoiseOpacity(settings);
  const noiseType = getNoiseType(settings);
  const vhs = isVhsNoise(settings);
  const scanlineOpacity = getScanlineOpacity(settings);
  const scanlineType = getScanlineType(settings);
  const vignetteOpacity = getVignetteOpacity(settings);
  const vignetteType = getVignetteType(settings);

  const generateNoise = useCallback(() => {
    const canvas = noiseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    if (noiseType === 'grain') {
      // Uniform grain
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
      }
    } else if (noiseType === 'static') {
      // TV static — bigger blocks
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const v = Math.random() * 255;
          for (let dy = 0; dy < 4 && y + dy < h; dy++) {
            for (let dx = 0; dx < 4 && x + dx < w; dx++) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              data[idx] = v; data[idx + 1] = v; data[idx + 2] = v; data[idx + 3] = 255;
            }
          }
        }
      }
    }
    // VHS is done via CSS, not canvas
    ctx.putImageData(imageData, 0, 0);
  }, [noiseType]);

  useEffect(() => {
    if (noiseOpacity <= 0 && !vhs) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      noiseFrameRef.current++;
      if (noiseFrameRef.current % 4 === 0) generateNoise();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, [noiseOpacity, generateNoise, vhs]);

  useEffect(() => {
    if (noiseOpacity > 0) generateNoise();
  }, [noiseOpacity, generateNoise]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {children}

      {/* === SCANLINES === */}
      {scanlineOpacity > 0 && scanlineType === 'crt' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,${scanlineOpacity}) 1px, rgba(0,0,0,${scanlineOpacity}) ${settings.scanlines.includes('thick') ? 3 : 2}px)`,
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {scanlineOpacity > 0 && scanlineType === 'rgb' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `repeating-linear-gradient(90deg,
            rgba(255,0,0,${scanlineOpacity * 0.4}) 0px, rgba(255,0,0,${scanlineOpacity * 0.4}) 1px,
            rgba(0,255,0,${scanlineOpacity * 0.4}) 1px, rgba(0,255,0,${scanlineOpacity * 0.4}) 2px,
            rgba(0,0,255,${scanlineOpacity * 0.4}) 2px, rgba(0,0,255,${scanlineOpacity * 0.4}) 3px,
            transparent 3px, transparent 4px)`,
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {scanlineOpacity > 0 && scanlineType === 'h' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `repeating-linear-gradient(0deg,
            transparent, transparent 2px,
            rgba(0,0,0,${scanlineOpacity * 0.5}) 2px, rgba(0,0,0,${scanlineOpacity * 0.5}) 4px)`,
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {/* === NOISE === */}
      {noiseOpacity > 0 && !vhs && (
        <canvas
          ref={noiseCanvasRef}
          width={noiseType === 'static' ? 64 : 128}
          height={noiseType === 'static' ? 64 : 128}
          style={{
            position: 'fixed', inset: 0,
            width: '100vw', height: '100vh',
            opacity: noiseOpacity,
            mixBlendMode: noiseType === 'static' ? 'screen' : 'overlay',
            imageRendering: 'pixelated',
            pointerEvents: 'none', zIndex: 11,
          }}
        />
      )}

      {/* VHS tracking lines */}
      {vhs && (
        <div style={{
          position: 'fixed', inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none', zIndex: 11,
        }}>
          {/* Horizontal tracking distortion */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: `${(noiseFrameRef.current * 2) % 120 - 10}%`,
            height: '4px',
            background: `rgba(255,255,255,${noiseOpacity * 1.5})`,
            filter: 'blur(1px)',
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: `${((noiseFrameRef.current * 3) + 40) % 130 - 10}%`,
            height: '2px',
            background: `rgba(255,255,255,${noiseOpacity})`,
            filter: 'blur(0.5px)',
          }} />
          {/* Color bleeding */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(0deg,
              transparent 0%,
              rgba(255,0,0,${noiseOpacity * 0.3}) ${30 + (noiseFrameRef.current % 20)}%,
              transparent ${40 + (noiseFrameRef.current % 20)}%,
              rgba(0,0,255,${noiseOpacity * 0.3}) ${60 + (noiseFrameRef.current % 15)}%,
              transparent ${70 + (noiseFrameRef.current % 15)}%,
              transparent 100%)`,
          }} />
        </div>
      )}

      {/* Static canvas for non-VHS types */}
      {noiseOpacity > 0 && !vhs && noiseType === 'grain' && (
        <div ref={noiseCanvasRef as any} style={{ display: 'none' }} />
      )}

      {/* === VIGNETTE === */}
      {vignetteOpacity > 0 && vignetteType === 'dark' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          pointerEvents: 'none', zIndex: 12,
        }} />
      )}

      {vignetteOpacity > 0 && vignetteType === 'corner' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `
            radial-gradient(ellipse at 0% 0%, rgba(0,0,0,${vignetteOpacity * 0.8}) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 0%, rgba(0,0,0,${vignetteOpacity * 0.8}) 0%, transparent 50%),
            radial-gradient(ellipse at 0% 100%, rgba(0,0,0,${vignetteOpacity * 0.8}) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(0,0,0,${vignetteOpacity * 0.8}) 0%, transparent 50%)`,
          pointerEvents: 'none', zIndex: 12,
        }} />
      )}

      {vignetteOpacity > 0 && vignetteType === 'tunnel' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: `
            radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,${vignetteOpacity * 0.3}) 50%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          pointerEvents: 'none', zIndex: 12,
        }} />
      )}
    </div>
  );
}
