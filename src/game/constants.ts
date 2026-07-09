export const TILE = 40;

// Tile types
const E = 0; // empty (void)
const F = 1; // floor (walkable)
const W = 2; // top wall (solid, impassable)
const S = 3; // side wall (solid, impassable — visual blue zone below top walls)

export const SIDE_WALL_DEPTH = 3; // side wall is 3 tiles deep

export interface Room {
  id: string;
  name: string;
  // Floor area (walkable, multiples of 3)
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  color1: string;
  color2: string;
}

// All floor dimensions are multiples of 3
export const ROOMS: Room[] = [
  // Top row: colleague offices
  { id: 'office1',  name: 'Офис 1',       fx: 2,  fy: 2,  fw: 15, fh: 15, color1: '#f0ede6', color2: '#e5e0d8' },
  { id: 'office2',  name: 'Офис 2',       fx: 24, fy: 2,  fw: 15, fh: 15, color1: '#eee8e0', color2: '#e3ddd5' },
  { id: 'office3',  name: 'Офис 3',       fx: 46, fy: 2,  fw: 15, fh: 15, color1: '#f0ede6', color2: '#e5e0d8' },

  // Bottom row
  { id: 'smoking',  name: 'Курилка',      fx: 2,  fy: 27, fw: 12, fh: 12, color1: '#e8e0d4', color2: '#ddd5c9' },
  { id: 'lobby',    name: 'Лобби',        fx: 21, fy: 27, fw: 21, fh: 21, color1: '#f5f0e8', color2: '#eae5dd' },
  { id: 'gamezone', name: 'Game Zone',     fx: 49, fy: 27, fw: 12, fh: 12, color1: '#e0e8f0', color2: '#d5dde5' },

  // Bottom: boss (elongated) + my office
  { id: 'boss',     name: 'Кабинет босса', fx: 2,  fy: 45, fw: 21, fh: 15, color1: '#f0ebe3', color2: '#e5e0d8' },
  { id: 'myoffice', name: 'Мой кабинет',   fx: 30, fy: 45, fw: 15, fh: 15, color1: '#f0f0e8', color2: '#e5e5dd' },
];

export const MAP_W = 66;
export const MAP_H = 64;
export const MAP_PW = MAP_W * TILE;
export const MAP_PH = MAP_H * TILE;

export function getRoomAt(gx: number, gy: number): Room | null {
  for (const r of ROOMS) {
    if (gx >= r.fx && gx < r.fx + r.fw && gy >= r.fy && gy < r.fy + r.fh) return r;
  }
  return null;
}

function carve(map: number[][], rx: number, ry: number, rw: number, rh: number) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) map[y][x] = F;
    }
  }
}

export function buildMap(): number[][] {
  const map: number[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(E));

  // 1. Carve room floors
  for (const r of ROOMS) {
    carve(map, r.fx, r.fy, r.fw, r.fh);
  }

  // 2. Carve corridors (3 tiles wide)
  // Office1 ↔ Office2
  carve(map, 17, 7, 7, 3);
  // Office2 ↔ Office3
  carve(map, 39, 7, 7, 3);
  // Office1 ↔ Lobby (vertical)
  carve(map, 7, 17, 3, 10);
  // Office2 ↔ Lobby
  carve(map, 30, 17, 3, 10);
  // Office3 ↔ Lobby
  carve(map, 53, 17, 3, 10);
  // Lobby ↔ Smoking
  carve(map, 14, 33, 7, 3);
  // Lobby ↔ Game Zone
  carve(map, 42, 33, 7, 3);
  // Lobby ↔ Boss
  carve(map, 30, 48, 3, 3);
  // Lobby ↔ My Office
  carve(map, 37, 48, 3, 3);
  // Boss ↔ My Office
  carve(map, 23, 51, 7, 3);

  // 3. Build walls: every empty tile adjacent (4-dir) to floor → wall (always 1 tile thick)
  const wallMap = map.map((row) => [...row]);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === F) {
        const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of dirs) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W && wallMap[ny][nx] === E) {
            wallMap[ny][nx] = W;
          }
        }
      }
    }
  }

  // 4. Side walls: ONLY room top walls → 3 tiles DOWN of floor → solid (S)
  //    Side walls must NOT appear in corridors (corridor floor below walls stays F)
  for (const r of ROOMS) {
    const topWallY = r.fy - 1;
    if (topWallY < 0) continue;
    for (let x = r.fx; x < r.fx + r.fw; x++) {
      if (wallMap[topWallY]?.[x] !== W) continue;
      // Convert floor tiles below this room-top wall into side walls
      for (let d = 1; d <= SIDE_WALL_DEPTH; d++) {
        const dy = topWallY + d;
        if (dy < MAP_H && wallMap[dy]?.[x] === F) {
          // Only if this F tile is inside THIS room (not a corridor passing through)
          if (dy >= r.fy && dy < r.fy + r.fh && x >= r.fx && x < r.fx + r.fw) {
            wallMap[dy][x] = S;
          }
        }
      }
    }
  }

  // 5. Open passages: 2 tiles below each side wall row → floor (walkable)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (wallMap[y][x] !== S) continue;
      for (let d = 1; d <= 2; d++) {
        const dy = y + d;
        if (dy < MAP_H && wallMap[dy][x] === W) {
          wallMap[dy][x] = F;
        }
      }
    }
  }

  // 6. Cleanup orphaned walls: remove W tiles with no adjacent F (floor/side)
  //    These are thick wall blocks between rooms that aren't part of any room border
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (wallMap[y][x] !== W) continue;
      const hasAdjacentFloor = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || ny >= MAP_H || nx < 0 || nx >= MAP_W) return false;
        const t = wallMap[ny][nx];
        return t === F || t === S;
      });
      if (!hasAdjacentFloor) {
        wallMap[y][x] = E; // remove orphaned wall → void
      }
    }
  }

  return wallMap;
}

export function isWalkable(map: number[][], gx: number, gy: number): boolean {
  if (gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W) return false;
  return map[gy]?.[gx] === F; // only F=1 is walkable; W=2 (wall) and S=3 (side wall) block movement
}

export interface GameObject {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean;
  color?: string;
  label?: string;
  room?: string;
}

export function canMove(
  map: number[][],
  objects: GameObject[],
  px: number,
  py: number,
  radius: number
): boolean {
  const r = radius;
  const corners: [number, number][] = [
    [px - r, py - r],
    [px + r, py - r],
    [px - r, py + r],
    [px + r, py + r],
  ];
  for (const [cx, cy] of corners) {
    if (!isWalkable(map, Math.floor(cx / TILE), Math.floor(cy / TILE))) return false;
  }
  for (const obj of objects) {
    if (!obj.solid) continue;
    if (
      px > obj.x && px < obj.x + obj.w * TILE &&
      py > obj.y && py < obj.y + obj.h * TILE
    ) return false;
  }
  return true;
}

export function createObjects(): GameObject[] {
  return [
    // Office1
    { id: 'table1', type: 'furniture', x: 5 * TILE, y: 7 * TILE, w: 6, h: 3, solid: true, color: '#fff', label: 'Стол', room: 'office1' },
    { id: 'chair1', type: 'furniture', x: 7 * TILE, y: 11 * TILE, w: 3, h: 3, solid: true, color: '#fff', label: 'Стул', room: 'office1' },
    // Office2
    { id: 'table2', type: 'furniture', x: 27 * TILE, y: 7 * TILE, w: 6, h: 3, solid: true, color: '#fff', label: 'Стол', room: 'office2' },
    { id: 'chair2', type: 'furniture', x: 29 * TILE, y: 11 * TILE, w: 3, h: 3, solid: true, color: '#fff', label: 'Стул', room: 'office2' },
    // Office3
    { id: 'table3', type: 'furniture', x: 49 * TILE, y: 7 * TILE, w: 6, h: 3, solid: true, color: '#fff', label: 'Стол', room: 'office3' },
    { id: 'chair3', type: 'furniture', x: 51 * TILE, y: 11 * TILE, w: 3, h: 3, solid: true, color: '#fff', label: 'Стул', room: 'office3' },
    // Lobby
    { id: 'sofa1', type: 'furniture', x: 24 * TILE, y: 30 * TILE, w: 6, h: 3, solid: true, color: '#e8d5b7', label: 'Диван', room: 'lobby' },
    { id: 'plant1', type: 'furniture', x: 39 * TILE, y: 30 * TILE, w: 3, h: 3, solid: true, color: '#4ecca3', label: '🌿', room: 'lobby' },
    // Game Zone
    { id: 'dartboard', type: 'furniture', x: 55 * TILE, y: 30 * TILE, w: 3, h: 3, solid: true, color: '#e94560', label: '🎯', room: 'gamezone' },
    { id: 'arcade', type: 'furniture', x: 50 * TILE, y: 30 * TILE, w: 3, h: 6, solid: true, color: '#333', label: '🕹️', room: 'gamezone' },
    // Smoking
    { id: 'ashtray', type: 'furniture', x: 4 * TILE, y: 30 * TILE, w: 3, h: 3, solid: true, color: '#888', label: '🪣', room: 'smoking' },
    { id: 'bench_smoke', type: 'furniture', x: 8 * TILE, y: 33 * TILE, w: 3, h: 3, solid: true, color: '#a0856e', label: 'Скамейка', room: 'smoking' },
    // Boss
    { id: 'boss_desk', type: 'furniture', x: 8 * TILE, y: 50 * TILE, w: 9, h: 3, solid: true, color: '#c8b89a', label: 'Стол босса', room: 'boss' },
    // My Office
    { id: 'my_desk', type: 'furniture', x: 33 * TILE, y: 50 * TILE, w: 6, h: 3, solid: true, color: '#fff', label: 'Мой стол', room: 'myoffice' },
  ];
}

export interface Player {
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  speed: number;
  radius: number;
  vx: number;
  vy: number;
}

export function createPlayer(): Player {
  return {
    x: 30 * TILE + TILE / 2,
    y: 36 * TILE + TILE / 2,
    targetX: null,
    targetY: null,
    speed: 3,
    radius: 8,
    vx: 0,
    vy: 0,
  };
}

export interface Bot {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  radius: number;
  role: string;
  room: string;
  wanderTimer: number;
  wanderTargetX: number | null;
  wanderTargetY: number | null;
}

export function createBots(): Bot[] {
  return [
    { id: 'petr', name: 'Петя', color: '#e94560', x: 9 * TILE, y: 10 * TILE, radius: 8, role: 'PM', room: 'office1', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null },
    { id: 'anya', name: 'Аня', color: '#ffa726', x: 31 * TILE, y: 10 * TILE, radius: 8, role: 'Дизайнер', room: 'office2', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null },
    { id: 'sergey', name: 'Сергей', color: '#2196f3', x: 53 * TILE, y: 10 * TILE, radius: 8, role: 'QA', room: 'office3', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null },
    { id: 'kryska', name: 'Крыска 🐀', color: '#888', x: 6 * TILE, y: 33 * TILE, radius: 6, role: 'крыса', room: 'smoking', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null },
  ];
}

export const EMOJI_CHAT = ['👋', '😂', '👍', '❤️', '🔥', '💀', '👀', '🎮'];

export const SHOP = {
  desks: [
    { id: 'desk_wood', n: 'Деревянный стол', e: '🪵', p: 150, w: 3, h: 3 },
  ],
  chairs: [
    { id: 'chair_white', n: 'Белый стул', e: '🪑', p: 80, w: 3, h: 3 },
  ],
  plants: [
    { id: 'plant_small', n: 'Кактус', e: '🌵', p: 60, w: 3, h: 3 },
    { id: 'plant_big', n: 'Пальма', e: '🌴', p: 120, w: 3, h: 6 },
  ],
  hats: [
    { id: 'hat_crown', n: 'Корона', e: '👑', p: 200, w: 3, h: 3 },
  ],
  decor: [
    { id: 'poster1', n: 'Постер', e: '🖼️', p: 100, w: 6, h: 3 },
    { id: 'lamp1', n: 'Лампа', e: '💡', p: 70, w: 3, h: 3 },
  ],
};

export const ALL_ITEMS = Object.values(SHOP).flat();

export const AVATARS = ['🧑‍🚀', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🔧', '👩‍🔬', '🧑‍🍳', '🦊', '🐱', '🐨', '🐸', '👻'];

export const ACHIEVEMENTS = [
  { id: 'first_talk', name: 'Первый разговор', icon: '💬', desc: 'Поговори с кем-нибудь' },
  { id: 'smoker', name: 'Курильщик', icon: '🚬', desc: 'Прокури в курилке' },
  { id: 'rps_win', name: 'Азартный', icon: '🎲', desc: 'Выиграй в КНБ' },
  { id: 'rich', name: 'Богач', icon: '💰', desc: 'Накопи 500 алт' },
  { id: 'decorator', name: 'Дизайнер', icon: '🎨', desc: 'Оформи кабинет' },
  { id: 'social', name: 'Социальный', icon: '🤝', desc: 'Посети 3 кабинета' },
  { id: 'kryska_victim', name: 'Жертва Крыски', icon: '🐀', desc: 'Крыска украла твой предмет' },
];
