import { TILE, MAP_W, MAP_H, ROOMS } from './constants';
import type { Player, GameObject, Bot } from './constants';
import { getSprite, CHAR_W, CHAR_H, type AnimState, drawCharacterSprite, drawPet } from './sprites';
import { getFloorImage, getFloorImageByIndex, getWallImageByIndex, getSideWallImage, getWallTopImage } from './tiles';
import type { RemotePlayer } from './multiplayer';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
}

export function createCamera(): Camera {
  return { x: 0, y: 0, zoom: 2.0, targetZoom: 2.0 };
}

export function updateCamera(cam: Camera, player: Player, canvasW: number, canvasH: number): void {
  const tx = player.x - canvasW / (2 * cam.zoom);
  const ty = player.y - canvasH / (2 * cam.zoom);
  cam.x += (tx - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
  cam.x = Math.max(0, Math.min(MAP_W * TILE - canvasW / cam.zoom, cam.x));
  cam.y = Math.max(0, Math.min(MAP_H * TILE - canvasH / cam.zoom, cam.y));
  cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cam: Camera,
  map: number[][],
  objects: GameObject[],
  player: Player,
  bots: Bot[],
  frame: number,
  placedObjects: GameObject[],
  carrying: string | null,
  dropPreview: { x: number; y: number; w: number; h: number } | null,
  playerAnim?: AnimState,
  botAnims?: Record<string, AnimState>,
  remotePlayers: RemotePlayer[] = [],
  tileOverrides?: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>,
  tilePaintMode?: { active: boolean; type: 'floor' | 'wall'; textureIndex: number; previewX: number; previewY: number } | null

): void {
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, cw, ch);

  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const sx = Math.max(0, Math.floor(cam.x / TILE));
  const sy = Math.max(0, Math.floor(cam.y / TILE));
  const ex = Math.min(MAP_W, Math.ceil((cam.x + cw / cam.zoom) / TILE) + 1);
  const ey = Math.min(MAP_H, Math.ceil((cam.y + ch / cam.zoom) / TILE) + 1);

  // ===== 1. FLOOR (F=1) =====
  const floorImg = getFloorImage();
  for (let y = sy; y < ey; y++) {
    if (!map[y]) continue;
    for (let x = sx; x < ex; x++) {
      if (map[y][x] !== 1) continue;
      const key = `${x},${y}`;
      const override = tileOverrides?.[key];
      let drawImg: HTMLImageElement | null = null;
      if (override?.type === 'floor') {
        drawImg = getFloorImageByIndex(override.textureIndex);
      }
      if (!drawImg) drawImg = floorImg;
      if (drawImg && drawImg.complete && drawImg.naturalWidth > 0) {
        const tx = ((x % 3) + 3) % 3;
        const ty = ((y % 3) + 3) % 3;
        ctx.drawImage(drawImg, tx * TILE, ty * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      } else {
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // ===== 2. WALL-WINDOW (S=3) =====
  const sideImg = getSideWallImage();
  for (let y = sy; y < ey; y++) {
    if (!map[y]) continue;
    for (let x = sx; x < ex; x++) {
      if (map[y][x] !== 3) continue;
      const key = `${x},${y}`;
      const override = tileOverrides?.[key];
      let drawImg: HTMLImageElement | null = null;
      if (override?.type === 'wall') {
        drawImg = getWallImageByIndex(override.textureIndex);
      }
      if (!drawImg) drawImg = sideImg;
      if (drawImg && drawImg.complete && drawImg.naturalWidth > 0) {
        const tx = ((x % 3) + 3) % 3;
        const ty = ((y % 3) + 3) % 3;
        ctx.drawImage(drawImg, tx * TILE, ty * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      } else {
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // ===== 3. ROOM LABELS =====
  ctx.textAlign = 'center';
  ctx.fillStyle = '#00000015';
  ctx.font = 'bold 11px sans-serif';
  for (const room of ROOMS) {
    ctx.fillText(
      room.name.toUpperCase(),
      (room.fx + room.fw / 2) * TILE,
      room.fy * TILE + 14
    );
  }

  // ===== 4. BLOB SHADOWS (under all objects + characters) =====
  ctx.save();
  for (const obj of objects) {
    if (obj.type !== 'furniture') continue;
    drawBlobShadow(ctx, obj.x + (obj.w * TILE) / 2, obj.y + obj.h * TILE, obj.w * TILE * 0.5, 5);
  }
  for (const obj of placedObjects) {
    drawBlobShadow(ctx, obj.x + (obj.w * TILE) / 2, obj.y + obj.h * TILE, obj.w * TILE * 0.5, 5);
  }
  // Character shadows
  drawBlobShadow(ctx, player.x, player.y + 6, 14, 4);
  for (const b of bots) {
    drawBlobShadow(ctx, b.x, b.y + 6, 14, 4);
  }
  for (const rp of remotePlayers) {
    drawBlobShadow(ctx, rp.x, rp.y + 6, 14, 4);
  }
  // Pet shadow (read early for shadows)
  const petIdEarly = (player as any).petId as string | undefined;
  const petXEarly = (player as any).petX as number | undefined;
  const petYEarly = (player as any).petY as number | undefined;
  if (petIdEarly && petXEarly !== undefined && petYEarly !== undefined) {
    drawBlobShadow(ctx, petXEarly, petYEarly + 4, 8, 3);
  }
  ctx.restore();

  // ===== 5. DEPTH-SORTED RENDERING (objects + characters by Y) =====
  // Collect all entities with sortY
  interface SortEntity {
    sortY: number;
    draw: () => void;
  }

  const entities: SortEntity[] = [];

  // Furniture objects
  for (const obj of objects) {
    if (obj.type !== 'furniture') continue;
    const bottomY = obj.y + obj.h * TILE;
    entities.push({ sortY: bottomY, draw: () => drawFurniture(ctx, obj) });
  }
  for (const obj of placedObjects) {
    const bottomY = obj.y + obj.h * TILE;
    entities.push({ sortY: bottomY, draw: () => drawFurniture(ctx, obj) });
  }

  // Characters
  const playerName = (player as any).name || 'Ты';
  const allChars = [
    { x: player.x, y: player.y, color: '#4ecca3', name: playerName, isPlayer: true, bot: null as any, charId: (player as any).charId || 'pers4', hatId: (player as any).hatId || 'none' },
    ...bots.map((b) => ({ x: b.x, y: b.y, color: b.color, name: b.name, isPlayer: false, bot: b, charId: b.id, hatId: 'none' })),
    ...remotePlayers.map((rp) => ({ x: rp.x, y: rp.y, color: rp.color, name: rp.name, isPlayer: false, bot: null as any, charId: rp.charId, hatId: rp.hatId })),
  ];

  // Pet
  const petId = (player as any).petId as string | undefined;
  const petX = (player as any).petX as number | undefined;
  const petY = (player as any).petY as number | undefined;
  if (petId && petX !== undefined && petY !== undefined) {
    entities.push({ sortY: petY, draw: () => drawPet(ctx, petX, petY, petId) });
  }

  for (const c of allChars) {
    entities.push({
      sortY: c.y,
      draw: () => {
        const bobY = c.y + Math.sin(frame * 0.04 + c.x * 0.1) * 1.5;
        const anim: AnimState = c.isPlayer
          ? (playerAnim ?? { dir: 'front' as const, isMoving: false, frame: 0, tick: 0 })
          : (botAnims?.[c.bot?.id] ?? { dir: 'front' as const, isMoving: false, frame: 0, tick: 0 });
        drawCharacterSprite(ctx, c.x, bobY, c.charId, c.hatId, anim, c.name, c.color);

        // Carried item for player
        if (c.isPlayer && carrying) {
          const carryEmoji = (window as any).__itemEmojis?.[carrying] || '📦';
          const carryDef = (window as any).__itemDefs?.[carrying];
          const itemW = (carryDef?.w || 1) * TILE;
          const itemH = (carryDef?.h || 1) * TILE;
          const itemX = c.x - itemW / 2;
          const itemY = bobY - TILE * 1.2 - itemH;
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          drawRoundRect(ctx, itemX + 2, itemY + 2, itemW, itemH, 4);
          ctx.fill();
          ctx.fillStyle = '#ffffffdd';
          drawRoundRect(ctx, itemX, itemY, itemW, itemH, 4);
          ctx.fill();
          ctx.strokeStyle = '#4ecca3';
          ctx.lineWidth = 2;
          ctx.stroke();
          const emojiSize = Math.min(itemW, itemH) * 0.6;
          ctx.font = `${emojiSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(carryEmoji, itemX + itemW / 2, itemY + itemH / 2 + emojiSize * 0.35);
          ctx.strokeStyle = '#4ecca340';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.x, bobY - TILE * 0.9);
          ctx.lineTo(c.x, itemY + itemH + 2);
          ctx.stroke();
        }

        // Bot emoji bubble
        if (c.bot && c.bot._emoji && Date.now() - c.bot._emojiTime < 3000) {
          const a = 1 - (Date.now() - c.bot._emojiTime) / 3000;
          ctx.globalAlpha = a;
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(c.bot._emoji, c.x, c.y - TILE * 1.2 - (1 - a) * 10);
          ctx.globalAlpha = 1;
        }

        // Kryska stolen item — show floating item above her
        if (c.bot && c.bot._stolenItemId) {
          const carryEmoji = (window as any).__itemEmojis?.[c.bot._stolenItemId] || '📦';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          const floatY = c.y - TILE * 1.5 + Math.sin(frame * 0.08) * 3;
          ctx.fillText(carryEmoji, c.x + 8, floatY);
        }

        // Bot speech bubble
        if (c.bot && c.bot._speechBubble && Date.now() - c.bot._speechTime < 4500) {
          const a = 1 - (Date.now() - c.bot._speechTime) / 4500;
          ctx.globalAlpha = a;
          const text = c.bot._speechBubble;
          ctx.font = 'bold 9px sans-serif';
          const tw = ctx.measureText(text).width;
          const bw = tw + 12;
          const bh = 18;
          const bx = c.x - bw / 2;
          const by = c.y - TILE * 1.8;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          const r2 = 6;
          ctx.moveTo(bx + r2, by);
          ctx.lineTo(bx + bw - r2, by);
          ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r2);
          ctx.lineTo(bx + bw, by + bh - r2);
          ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r2, by + bh);
          ctx.lineTo(bx + r2, by + bh);
          ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r2);
          ctx.lineTo(bx, by + r2);
          ctx.quadraticCurveTo(bx, by, bx + r2, by);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(text, c.x, by + 13);
          ctx.beginPath();
          ctx.moveTo(c.x - 4, by + bh);
          ctx.lineTo(c.x, by + bh + 5);
          ctx.lineTo(c.x + 4, by + bh);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Player emoji bubble
        const pExt = player as any;
        if (c.isPlayer && pExt._lastEmoji && pExt._emojiTime && Date.now() - pExt._emojiTime < 3000) {
          const a = 1 - (Date.now() - pExt._emojiTime) / 3000;
          ctx.globalAlpha = a;
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pExt._lastEmoji, player.x, player.y - TILE * 1.2 - (1 - a) * 15);
          ctx.globalAlpha = 1;
        }
      }
    });
  }

  // Sort all entities by Y (lower Y = drawn first = further from camera)
  entities.sort((a, b) => a.sortY - b.sortY);
  for (const e of entities) e.draw();

  // ===== 6. DROP PREVIEW =====
  if (dropPreview) {
    const pw = dropPreview.w * TILE;
    const ph = dropPreview.h * TILE;
    const px = dropPreview.x;
    const py = dropPreview.y;
    // Semi-transparent green outline
    ctx.globalAlpha = 0.4 + Math.sin(frame * 0.08) * 0.1;
    ctx.fillStyle = '#4ecca330';
    ctx.strokeStyle = '#4ecca3';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    drawRoundRect(ctx, px, py, pw, ph, 4);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    // "+" marker in center
    ctx.fillStyle = '#4ecca3';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', px + pw / 2, py + ph / 2 + 5);
    ctx.globalAlpha = 1;
  }

  // ===== 7. WALLS (W=2) =====
  const wtopImg = getWallTopImage();
  for (let y = sy; y < ey; y++) {
    if (!map[y]) continue;
    for (let x = sx; x < ex; x++) {
      if (map[y][x] !== 2) continue;
      if (wtopImg && wtopImg.complete && wtopImg.naturalWidth > 0) {
        const tx = ((x % 3) + 3) % 3;
        ctx.drawImage(wtopImg, tx * TILE, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      } else {
        ctx.fillStyle = '#777777';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // ===== 8. TILE PAINT MODE PREVIEW =====
  if (tilePaintMode?.active && tilePaintMode.previewX >= 0 && tilePaintMode.previewY >= 0) {
    const px = tilePaintMode.previewX;
    const py = tilePaintMode.previewY;
    // Draw 3x3 highlight
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.08) * 0.1;
    ctx.fillStyle = tilePaintMode.type === 'floor' ? '#4ecca340' : '#ff6b6b40';
    ctx.strokeStyle = tilePaintMode.type === 'floor' ? '#4ecca3' : '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(px * TILE, py * TILE, TILE * 3, TILE * 3);
    ctx.strokeRect(px * TILE, py * TILE, TILE * 3, TILE * 3);
    ctx.setLineDash([]);
    // Draw texture preview in center tile
    const texIdx = tilePaintMode.textureIndex;
    const texImg = tilePaintMode.type === 'floor'
      ? getFloorImageByIndex(texIdx)
      : getWallImageByIndex(texIdx);
    if (texImg && texImg.complete && texImg.naturalWidth > 0) {
      ctx.globalAlpha = 0.6;
      const tx = ((px % 3) + 3) % 3;
      const ty = ((py % 3) + 3) % 3;
      ctx.drawImage(texImg, tx * TILE, ty * TILE, TILE, TILE, px * TILE + TILE, py * TILE + TILE, TILE, TILE);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // ===== 9. LIGHT OVERLAY =====
  renderLightOverlay(ctx, canvas, cam, frame, player);
}

// Object sprite cache
const objectSpriteCache: Map<string, HTMLImageElement> = new Map();

function drawFurniture(ctx: CanvasRenderingContext2D, obj: GameObject): void {
  const ox = obj.x;
  const oy = obj.y;
  const ow = obj.w * TILE;
  const oh = obj.h * TILE;

  // Draw sprite if available
  if (obj.sprite) {
    let img = objectSpriteCache.get(obj.sprite);
    if (img === undefined) {
      img = new Image();
      img.src = obj.sprite;
      objectSpriteCache.set(obj.sprite, img);
    }
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, ox, oy, ow, oh);
      ctx.imageSmoothingEnabled = true;
      return;
    }
    // Sprite not loaded — draw solid color fallback
  }

  // Fallback: solid color rectangle
  if (obj.color) {
    ctx.fillStyle = obj.color;
    ctx.fillRect(ox + 2, oy + 2, ow - 4, oh - 4);
    ctx.strokeStyle = '#00000020';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 2, oy + 2, ow - 4, oh - 4);
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  name: string,
  isPlayer: boolean
): void {
  const w = TILE * 0.7;
  const h = TILE * 1.8;
  const r = w / 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2 + r);
  ctx.arcTo(x - w / 2, y - h / 2, x, y - h / 2, r);
  ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r, r);
  ctx.lineTo(x + w / 2, y + h / 2 - r);
  ctx.arcTo(x + w / 2, y + h / 2, x, y + h / 2, r);
  ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r, r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isPlayer ? '#2a8a6a' : '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y - h / 2 - 6);
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBlobShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Light overlay system
let lightCanvas: HTMLCanvasElement | null = null;
let lightCtx: CanvasRenderingContext2D | null = null;

export function renderLightOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cam: Camera,
  frame: number,
  player: Player
): void {
  const cw = canvas.width;
  const ch = canvas.height;

  // Create/recreate light canvas if needed
  if (!lightCanvas || lightCanvas.width !== cw || lightCanvas.height !== ch) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = cw;
    lightCanvas.height = ch;
    lightCtx = lightCanvas.getContext('2d');
  }
  if (!lightCtx) return;

  const lc = lightCtx;
  lc.clearRect(0, 0, cw, ch);

  // Dark overlay
  lc.fillStyle = 'rgba(8, 8, 20, 0.35)';
  lc.fillRect(0, 0, cw, ch);

  // Cut out light sources
  lc.globalCompositeOperation = 'destination-out';

  const zoom = cam.zoom;
  const offX = cam.x;
  const offY = cam.y;

  // Helper: convert world coords to screen coords
  const sx = (wx: number) => (wx - offX) * zoom;
  const sy = (wy: number) => (wy - offY) * zoom;

  // === ROOM LIGHT SOURCES ===

  // Boss office — warm overhead light
  drawRadialLight(lc, sx((1 + 12 / 2) * TILE), sy((1 + 6 / 2) * TILE), 180 * zoom, '#ffeedd', 0.5);

  // Office 1-3 — cool monitor glow
  drawRadialLight(lc, sx(16 * TILE), sy(3.5 * TILE), 70 * zoom, '#aaccff', 0.25);
  drawRadialLight(lc, sx(23 * TILE), sy(3.5 * TILE), 70 * zoom, '#aaccff', 0.25);
  drawRadialLight(lc, sx(30 * TILE), sy(3.5 * TILE), 70 * zoom, '#aaccff', 0.25);

  // Chill zone — warm ambient
  drawRadialLight(lc, sx(37 * TILE), sy(6 * TILE), 160 * zoom, '#ffe8c0', 0.45);

  // Smoking room — dim warm
  drawRadialLight(lc, sx(37 * TILE), sy(15 * TILE), 100 * zoom, '#ffccaa', 0.3);

  // Hall — overhead strip lights
  for (let hx = 5; hx <= 29; hx += 8) {
    drawRadialLight(lc, sx(hx * TILE), sy(13 * TILE), 120 * zoom, '#ffffff', 0.35);
  }

  // Office 4-6 — cool overhead
  drawRadialLight(lc, sx(16 * TILE), sy(25 * TILE), 100 * zoom, '#ddeeff', 0.3);
  drawRadialLight(lc, sx(23 * TILE), sy(25 * TILE), 100 * zoom, '#ddeeff', 0.3);
  drawRadialLight(lc, sx(34 * TILE), sy(25 * TILE), 120 * zoom, '#ddeeff', 0.35);

  // Player proximity glow (small warm light around player)
  const playerScreenX = (player.x - offX) * zoom;
  const playerScreenY = (player.y - offY) * zoom;
  drawRadialLight(lc, playerScreenX, playerScreenY, 60 * zoom, '#ffffff', 0.15);

  lc.globalCompositeOperation = 'source-over';

  // Apply light overlay
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.restore();
}

function drawRadialLight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  _color: string,
  intensity: number
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
  gradient.addColorStop(0.4, `rgba(255, 255, 255, ${intensity * 0.5})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
