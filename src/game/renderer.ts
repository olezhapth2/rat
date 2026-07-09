import { TILE, MAP_W, MAP_H, ROOMS, getRoomAt } from './constants';
import type { Player, GameObject, Bot } from './constants';

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
  placedObjects: GameObject[]
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

  // ===== 1. FLOOR (yellow checkerboard) =====
  for (let y = sy; y < ey; y++) {
    if (!map[y]) continue;
    for (let x = sx; x < ex; x++) {
      if (map[y][x] !== 1) continue;
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f5f0d0' : '#ebe6c0';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // ===== 2. SIDE WALLS (blue, map tile S=3) =====
  for (let y = sy; y < ey; y++) {
    if (!map[y]) continue;
    for (let x = sx; x < ex; x++) {
      if (map[y][x] !== 3) continue;
      ctx.fillStyle = '#8ab4e8';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
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

  // ===== 4. FURNITURE =====
  for (const obj of objects) {
    if (obj.type === 'furniture') drawFurniture(ctx, obj);
  }
  for (const obj of placedObjects) {
    drawFurniture(ctx, obj);
  }

  // ===== 5. CURSOR =====
  if (player.targetX !== null && player.targetY !== null) {
    ctx.beginPath();
    ctx.arc(player.targetX, player.targetY, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#4ecca380';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(player.targetX, player.targetY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#4ecca3';
    ctx.fill();
  }

  // ===== 6. CHARACTERS (Y-sorted) =====
  const playerName = (player as any).name || 'Ты';
  const allChars = [
    { x: player.x, y: player.y, color: '#4ecca3', name: playerName, isPlayer: true },
    ...bots.map((b) => ({ x: b.x, y: b.y, color: b.color, name: b.name, isPlayer: false })),
  ];
  allChars.sort((a, b) => a.y - b.y);

  for (const c of allChars) {
    const bobY = c.y + Math.sin(frame * 0.04 + c.x * 0.1) * 1.5;
    drawCharacter(ctx, c.x, bobY, c.color, c.name, c.isPlayer);
  }

  // Emoji bubbles
  const pExt = player as any;
  if (pExt._lastEmoji && pExt._emojiTime && Date.now() - pExt._emojiTime < 3000) {
    const a = 1 - (Date.now() - pExt._emojiTime) / 3000;
    ctx.globalAlpha = a;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pExt._lastEmoji, player.x, player.y - TILE * 1.2 - (1 - a) * 15);
    ctx.globalAlpha = 1;
  }
  for (const bot of bots) {
    const b = bot as any;
    if (b._lastEmoji && b._emojiTime && Date.now() - b._emojiTime < 3000) {
      const a = 1 - (Date.now() - b._emojiTime) / 3000;
      ctx.globalAlpha = a;
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b._lastEmoji, bot.x, bot.y - TILE * 1.2 - (1 - a) * 15);
      ctx.globalAlpha = 1;
    }
  }

  // ===== 7. TOP WALLS (dark, opaque, LAST — covers everything) =====
  for (let y = sy; y < ey; y++) {
    if (!map[y]) continue;
    for (let x = sx; x < ex; x++) {
      if (map[y][x] === 2) {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        // Thin bright edge on bottom
        ctx.fillStyle = '#555';
        ctx.fillRect(x * TILE, y * TILE, TILE, 3);
      }
    }
  }

  ctx.restore();
}

function drawFurniture(ctx: CanvasRenderingContext2D, obj: GameObject): void {
  const ox = obj.x;
  const oy = obj.y;
  const ow = obj.w * TILE;
  const oh = obj.h * TILE;
  const r = 4;
  ctx.fillStyle = obj.color || '#fff';
  ctx.beginPath();
  ctx.moveTo(ox + r, oy);
  ctx.lineTo(ox + ow - r, oy);
  ctx.quadraticCurveTo(ox + ow, oy, ox + ow, oy + r);
  ctx.lineTo(ox + ow, oy + oh - r);
  ctx.quadraticCurveTo(ox + ow, oy + oh, ox + ow - r, oy + oh);
  ctx.lineTo(ox + r, oy + oh);
  ctx.quadraticCurveTo(ox, oy + oh, ox, oy + oh - r);
  ctx.lineTo(ox, oy + r);
  ctx.quadraticCurveTo(ox, oy, ox + r, oy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (obj.label) {
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.label, ox + ow / 2, oy + oh / 2 + 3);
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
