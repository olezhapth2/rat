import { TILE } from './constants';

// === Sprite Animation Config ===
export const SPRITE_FRAME_INTERVAL = 8;
export const SPRITE_RUN_FRAMES = 2;
export const CHAR_W = TILE;             // sprite width
export const CHAR_H = TILE * 2;         // sprite height (2 tiles tall)

// === Character IDs (pers1-5 + kryska) ===
export const CHARACTER_IDS = ['pers1', 'pers2', 'pers3', 'pers4', 'pers5', 'kryska'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

// === Hat IDs ===
export const HAT_IDS = ['none', 'hat0', 'hat1', 'hat2', 'hat3', 'hat4'] as const;
export type HatId = (typeof HAT_IDS)[number];

// === Direction ===
export type Direction = 'front' | 'back' | 'left' | 'right';

// === Animation State ===
export interface AnimState {
  dir: Direction;
  isMoving: boolean;
  frame: number;
  tick: number;
}

export function createAnimState(): AnimState {
  return { dir: 'front', isMoving: false, frame: 0, tick: 0 };
}

// === Sprite Cache ===
const spriteCache: Map<string, HTMLImageElement> = new Map();
let totalToLoad = 0;
let totalLoaded = 0;
let onProgressCallback: ((loaded: number, total: number) => void) | null = null;
let onLoadCallback: (() => void) | null = null;

// Character → file mapping
const CHAR_FILES: Record<string, string> = {
  pers1: '/sprites/pers/pers1.png',
  pers2: '/sprites/pers/pers2.png',
  pers3: '/sprites/pers/pers3.png',
  pers4: '/sprites/pers/pers4.png',
  pers5: '/sprites/pers/pers5.png',
  kryska: '/sprites/pers/kryska.png',
};

// Pet files
const PET_FILES: Record<string, string> = {
  pet1: '/sprites/pets/pet1.png',
  pet2: '/sprites/pets/pet2.png',
  pet3: '/sprites/pets/pet3.png',
  pet4: '/sprites/pets/pet4.png',
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // resolve anyway, will use fallback
    img.src = url;
  });
}

function makeFallback(charId: string): HTMLImageElement {
  const c = document.createElement('canvas');
  c.width = CHAR_W;
  c.height = CHAR_H;
  const ctx = c.getContext('2d')!;
  // Simple colored rect with first letter
  const colors: Record<string, string> = {
    pers1: '#e94560', pers2: '#ffa726', pers3: '#4ecca3',
    pers4: '#2196f3', pers5: '#9c27b0', kryska: '#888',
  };
  ctx.fillStyle = colors[charId] || '#ccc';
  ctx.beginPath();
  ctx.roundRect(0, 0, CHAR_W, CHAR_H, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(charId.toUpperCase(), CHAR_W / 2, CHAR_H / 2 + 4);
  const img = new Image();
  img.src = c.toDataURL();
  return img;
}

/**
 * Preload all character sprites.
 * Each character gets ONE image used for all directions and states.
 */
export async function preloadCharacterSprites(
  onProgress?: (loaded: number, total: number) => void,
  onLoad?: () => void
): Promise<void> {
  onProgressCallback = onProgress || null;
  onLoadCallback = onLoad || null;

  const entries = Object.entries(CHAR_FILES);
  totalToLoad = entries.length;
  totalLoaded = 0;

  const promises = entries.map(async ([charId, url]) => {
    const img = await loadImage(url);
    if (img.complete && img.naturalWidth > 0) {
      spriteCache.set(charId, img);
    }
    // No fallback — if image fails, character simply won't render
    totalLoaded++;
    onProgressCallback?.(totalLoaded, totalToLoad);
  });

  await Promise.all(promises);
  onLoadCallback?.();
  console.log(`[Sprites] Loaded ${totalLoaded} character sprites`);
}

/**
 * Preload pet sprites.
 */
export async function preloadPetSprites(): Promise<void> {
  const entries = Object.entries(PET_FILES);
  for (const [petId, url] of entries) {
    const img = await loadImage(url);
    if (img.complete && img.naturalWidth > 0) {
      spriteCache.set(petId, img);
    }
    // No fallback
  }
  console.log('[Sprites] Pet sprites loaded');
}

// Get cached sprite (always returns the single character image)
export function getSprite(charId: string, _hatId: string, _dir: Direction, _state: 'idle' | 'run'): HTMLImageElement | null {
  return spriteCache.get(charId) || null;
}

export function hasSprite(charId: string, _hatId: string, _dir: Direction, _state: 'idle' | 'run'): boolean {
  return spriteCache.has(charId);
}

// === Update AnimState ===
export function updateAnimState(anim: AnimState, vx: number, vy: number): void {
  anim.isMoving = Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3;

  if (anim.isMoving) {
    if (Math.abs(vx) > Math.abs(vy)) {
      anim.dir = vx > 0 ? 'right' : 'left';
    } else {
      anim.dir = vy > 0 ? 'front' : 'back';
    }
    anim.tick++;
    if (anim.tick >= SPRITE_FRAME_INTERVAL) {
      anim.tick = 0;
      anim.frame = (anim.frame + 1) % SPRITE_RUN_FRAMES;
    }
  } else {
    anim.frame = 0;
    anim.tick = 0;
  }
}

// === Draw Character Sprite ===
export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  charId: string,
  hatId: string,
  anim: AnimState,
  name?: string,
  color?: string
): void {
  const sprite = getSprite(charId, hatId, anim.dir, anim.isMoving ? 'run' : 'idle');
  const state: 'idle' | 'run' = anim.isMoving ? 'run' : 'idle';

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    // Draw the character sprite
    ctx.drawImage(
      sprite,
      x - CHAR_W / 2,
      y - CHAR_H / 2,
      CHAR_W,
      CHAR_H
    );
  }
  // No fallback — skip rendering if sprite not loaded

}

// === Draw Pet ===
export function drawPet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  petId: string
): void {
  const petSize = 30;
  const sprite = spriteCache.get(petId);
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.drawImage(sprite, x - petSize / 2, y - petSize / 2, petSize, petSize);
  }
  // No fallback — skip rendering if sprite not loaded
}
