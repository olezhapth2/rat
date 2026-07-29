export const TILE = 40;

const E = 0; // empty (void)
const F = 1; // floor (walkable)
const W = 2; // wall (solid)
const S = 3; // side wall — visual-only wall-window overlay on floor (walkable)

export const SIDE_WALL_DEPTH = 3; // S = 3 tiles tall

export interface Room {
  id: string;
  name: string;
  fx: number; fy: number; fw: number; fh: number;
  color1: string;
  color2: string;
}

/*
  Scaled down ~1.5x from original 60×44 → 40×29

  Column groups (walls = 1 tile between each):
    A (boss)   11 tiles  x=1..11
    B (kab1)    5 tiles  x=13..17
    C (kab2)    6 tiles  x=19..24
    D (kab3)    6 tiles  x=26..31
    E (chil)    7 tiles  x=33..39

  Row groups:
    Row0   6 tiles  y=1..6
    Row1  11 tiles  y=8..18
    Row2   5 tiles  y=20..24
    Row3  10 tiles  y=26..35
*/
export const ROOMS: Room[] = [
  { id: 'boss',    name: 'Босс',      fx: 1,  fy: 1,  fw: 11, fh: 6,  color1: '#dcb98a', color2: '#c8a97a' },
  { id: 'office1', name: 'Кабинет 1', fx: 13, fy: 1,  fw: 5,  fh: 6,  color1: '#c9c2b6', color2: '#b9b2a6' },
  { id: 'office2', name: 'Кабинет 2', fx: 19, fy: 1,  fw: 6,  fh: 6,  color1: '#c9b8d1', color2: '#b9a8c1' },
  { id: 'office3', name: 'Кабинет 3', fx: 26, fy: 1,  fw: 6,  fh: 6,  color1: '#d1abb7', color2: '#c19ba7' },
  { id: 'chill',   name: 'Чил',       fx: 33, fy: 1,  fw: 7,  fh: 11, color1: '#e0b98a', color2: '#d0a97a' },
  { id: 'hall',    name: 'Зал',       fx: 1,  fy: 8,  fw: 31, fh: 11, color1: '#cbb896', color2: '#bba886' },
  { id: 'smoking', name: 'Курилка',   fx: 33, fy: 13, fw: 7,  fh: 5,  color1: '#c99a9a', color2: '#b98a8a' },
  { id: 'office4', name: 'Кабинет 4', fx: 13, fy: 20, fw: 5,  fh: 10, color1: '#a9c2ab', color2: '#99b29b' },
  { id: 'office5', name: 'Кабинет 5', fx: 19, fy: 20, fw: 6,  fh: 10, color1: '#cbb87c', color2: '#bba86c' },
  { id: 'office6', name: 'Кабинет 6', fx: 26, fy: 20, fw: 14, fh: 10, color1: '#8fc0be', color2: '#7fb0ae' },
];

export const MAP_W = 40;
export const MAP_H = 29;
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

  // 1. Carve room interiors as floor
  for (const r of ROOMS) {
    carve(map, r.fx, r.fy, r.fw, r.fh);
  }

  // 2. Wall-window (S): top SIDE_WALL_DEPTH rows of each room
  for (const r of ROOMS) {
    for (let d = 0; d < SIDE_WALL_DEPTH; d++) {
      const sy = r.fy + d;
      if (sy >= r.fy + r.fh) continue;
      for (let x = r.fx; x < r.fx + r.fw; x++) {
        if (map[sy]?.[x] === F) map[sy][x] = S;
      }
    }
  }

  // 3. Outer walls
  for (let x = 0; x < MAP_W; x++) { map[0][x] = W; map[MAP_H - 1][x] = W; }
  for (let y = 0; y < MAP_H; y++) { map[y][0] = W; map[y][MAP_W - 1] = W; }

  // 4. Vertical walls between rooms
  // x=12: Boss|kab1 (y=1..6)
  for (let y = 1; y <= 6; y++) map[y][12] = W;
  // x=18: kab1|kab2 (y=1..6), kab4|kab5 (y=20..29)
  for (let y = 1; y <= 6; y++) map[y][18] = W;
  for (let y = 20; y <= 29; y++) map[y][18] = W;
  // x=25: kab2|kab3 (y=1..6), kab5|kab6 (y=20..29)
  for (let y = 1; y <= 6; y++) map[y][25] = W;
  for (let y = 20; y <= 29; y++) map[y][25] = W;
  // x=32: kab3|chil (y=1..6), zal|smoking (y=8..18)
  for (let y = 1; y <= 6; y++) map[y][32] = W;
  for (let y = 8; y <= 18; y++) map[y][32] = W;

  // 5. Horizontal walls
  // y=7: row0 | zal (x=0..32)
  for (let x = 0; x <= 32; x++) map[7][x] = W;
  // y=12: chil | smoking (x=33..39)
  for (let x = 33; x <= 39; x++) map[12][x] = W;
  // y=19: row2 | row3 (x=0..39)
  for (let x = 0; x <= 39; x++) map[19][x] = W;

  // 6. Doorways — 3-tile breaks in walls
  // Top wall y=7: Boss→Zal, kab1→Zal, kab2→Zal, kab3→Zal
  for (const cx of [5, 15, 22, 29]) {
    for (let dx = -1; dx <= 1; dx++) map[7][cx + dx] = F;
  }
  // Bottom wall y=19: Zal→kab4, Zal→kab5, Zal→kab6
  for (const cx of [15, 22, 29]) {
    for (let dx = -1; dx <= 1; dx++) map[19][cx + dx] = F;
  }
  // Vertical wall x=32: Zal↔Chil, Zal↔Smoking
  for (const cy of [10, 16]) {
    for (let dy = -1; dy <= 1; dy++) map[cy + dy][32] = F;
  }

  // 7. Wall-window cutouts — replace S with F where doorways enter through wall-window
  // Zal wall-window (y=8..10) cutouts at doorway x positions
  for (const cx of [5, 15, 22, 29]) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let y = 8; y <= 10; y++) {
        if (map[y]?.[cx + dx] === S) map[y][cx + dx] = F;
      }
    }
  }
  // Bottom rooms wall-window (y=20..22) cutouts
  for (const cx of [15, 22, 29]) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let y = 20; y <= 22; y++) {
        if (map[y]?.[cx + dx] === S) map[y][cx + dx] = F;
      }
    }
  }
  // Smoking side cutout for Zal↔Smoking passage (x=33..34, y=13..15)
  for (let y = 13; y <= 15; y++) {
    map[y][33] = F;
    map[y][34] = F;
  }

  return map;
}

export function isWalkable(map: number[][], gx: number, gy: number): boolean {
  if (gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W) return false;
  const t = map[gy]?.[gx];
  return t === F;
}

export interface GameObject {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean;
  noCollision?: boolean;
  color?: string;
  label?: string;
  room?: string;
  sprite?: string;
}

const SOLID_ZONE_RATIO = 0.35;

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
    const gx = Math.floor(cx / TILE);
    const gy = Math.floor(cy / TILE);
    if (gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W) return false;
    const t = map[gy]?.[gx];
    if (t === W || t === E) return false;
    if (t === S) {
      const below = map[gy + 1]?.[gx];
      if (below !== F) return false;
    }
  }

  for (const obj of objects) {
    if (!obj.solid || obj.noCollision) continue;
    const objLeft = obj.x;
    const objRight = obj.x + obj.w * TILE;
    if (px + r <= objLeft || px - r >= objRight) continue;
    const solidTop = obj.y + (obj.h * TILE) * SOLID_ZONE_RATIO;
    const solidBottom = obj.y + obj.h * TILE;
    if (py + r > solidTop && py < solidBottom) return false;
  }
  return true;
}

export function createObjects(): GameObject[] {
  return [];
}

export interface Player {
  x: number; y: number;
  speed: number; radius: number;
  vx: number; vy: number;
}

export function createPlayer(): Player {
  return {
    x: 16 * TILE + TILE / 2,
    y: 13 * TILE + TILE / 2,
    speed: 3, radius: 6,
    vx: 0, vy: 0,
  };
}

export interface Bot {
  id: string; name: string; color: string;
  x: number; y: number; radius: number;
  role: string; room: string;
  wanderTimer: number;
  wanderTargetX: number | null; wanderTargetY: number | null;
  _speechBubble: string | null; _speechTime: number;
  _emoji: string | null; _emojiTime: number;
  _targetRoomId: string | null; _roomTimer: number;
  _stealCooldown: number;
  _lastVx: number; _lastVy: number;
}

export function createBots(): Bot[] {
  return [
    { id: 'pers1',  name: 'Петя',       color: '#e94560', x: 15 * TILE, y: 4 * TILE,  radius: 8, role: 'PM',        room: 'office1', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0 },
    { id: 'pers2',  name: 'Аня',        color: '#ffa726', x: 22 * TILE, y: 4 * TILE,  radius: 8, role: 'Дизайнер',  room: 'office2', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0 },
    { id: 'pers3',  name: 'Сергей',     color: '#2196f3', x: 29 * TILE, y: 4 * TILE,  radius: 8, role: 'QA',        room: 'office3', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0 },
    { id: 'pers5',  name: 'Ольга',      color: '#9c27b0', x: 17 * TILE, y: 13 * TILE, radius: 8, role: 'HR',        room: 'hall',    wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0 },
    { id: 'kryska', name: 'Крыска',     color: '#888',     x: 36 * TILE, y: 16 * TILE, radius: 6, role: 'крыса',     room: 'smoking', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0 },
  ];
}

export const EMOJI_CHAT = ['👋', '😂', '👍', '❤️', '🔥', '💀', '👀', '🎮'];

export const ROOM_CENTERS: Record<string, { x: number; y: number }> = {
  boss:    { x: (1 + 11 / 2) * TILE,  y: (1 + 6 / 2) * TILE },
  office1: { x: (13 + 5 / 2) * TILE,  y: (1 + 6 / 2) * TILE },
  office2: { x: (19 + 6 / 2) * TILE,  y: (1 + 6 / 2) * TILE },
  office3: { x: (26 + 6 / 2) * TILE,  y: (1 + 6 / 2) * TILE },
  chill:   { x: (33 + 7 / 2) * TILE,  y: (1 + 11 / 2) * TILE },
  hall:    { x: (1 + 31 / 2) * TILE,  y: (8 + 11 / 2) * TILE },
  smoking: { x: (33 + 7 / 2) * TILE,  y: (13 + 5 / 2) * TILE },
  office4: { x: (13 + 5 / 2) * TILE,  y: (20 + 10 / 2) * TILE },
  office5: { x: (19 + 6 / 2) * TILE,  y: (20 + 10 / 2) * TILE },
  office6: { x: (26 + 14 / 2) * TILE, y: (20 + 10 / 2) * TILE },
};

export const BOT_PHRASES: Record<string, string[]> = {
  pers1: [
    'Надо дела закрыть',
    'Дедлайн завтра!',
    'Кто взял задачу?',
    'Ставлю приоритеты...',
    'Опять совещание',
    'Кто на созвон?',
  ],
  pers2: [
    'Дизайн готов!',
    'Обновила презентацию',
    'Нужно согласовать',
    'Красиво получилось',
    'Ещё одну деталь дорисую',
    'Принтер опять лагает...',
  ],
  pers3: [
    'Проблема в отчёте!',
    'Проверяю документы',
    'Всё не сходится',
    'Написала резюме',
    'Кто подписал?',
    'Надо перепроверить...',
  ],
  pers4: [
    'Документ готов к отправке',
    'Дорабатываю раздел',
    'Смета прошла',
    'Отчёт отправлен',
  ],
  pers5: [
    'Нужно провести совещание',
    'Обновила график',
    'Отчёт для руководства готов',
    'Ищем нового специалиста',
  ],
  kryska: [
    '*пии-пии*',
    '*грызёт провода*',
    '*ночью вылезу*',
  ],
};

export const BOT_REACTIONS: Record<string, string[]> = {
  pers1: ['👋', '🤔', '📋', '😅'],
  pers2: ['👋', '🎨', '✨', '😊'],
  pers3: ['👋', '🐛', '😤', '🔍'],
  pers4: ['👋', '💻', '🔧', '🚀'],
  pers5: ['👋', '📋', '💼', '🤝'],
  kryska: ['🐀', '🧀', '👀', '💀'],
};

export const BOT_CONVERSATIONS: string[][] = [
  ['Петя', 'Сергей', 'Документы готовы?', 'Почти...'],
  ['Аня', 'Петя', 'Презентация готова', 'Ок смотрю'],
  ['Аня', 'Сергей', 'Смета ок?', 'Нужны правки'],
  ['Петя', 'Аня', 'Сколько осталось?', 'День-два'],
  ['Сергей', 'Петя', 'Кто подписал?', 'Не я!'],
  ['Аня', 'Сергей', 'Отчёт пройден?', 'Есть замечания'],
];

export interface ShopItem {
  id: string; n: string; e: string; p: number;
  w: number; h: number;
  surface: 'floor' | 'wall';
  noCollision?: boolean;
  sprite: string;
}

export const SHOP: Record<string, ShopItem[]> = {
  desks: [
    { id: 'table_2', n: 'Стол классик', e: '🪵', p: 150, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_2.png' },
    { id: 'table_3', n: 'Стол стекло', e: '🪵', p: 180, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_3.png' },
    { id: 'table_4', n: 'Стол минимал', e: '🪵', p: 120, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_4.png' },
    { id: 'table_5', n: 'Стол тёмный', e: '🪵', p: 160, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_5.png' },
    { id: 'table_6', n: 'Стол светлый', e: '🪵', p: 140, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_6.png' },
    { id: 'table_7', n: 'Стол офис', e: '🪵', p: 170, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_7.png' },
  ],
  chairs: [
    { id: 'chear_1', n: 'Стул дерево', e: '🪑', p: 80, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_1.png' },
    { id: 'chear_2', n: 'Стул белый', e: '🪑', p: 90, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_2.png' },
    { id: 'chear_3', n: 'Стул чёрный', e: '🪑', p: 85, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_3.png' },
    { id: 'chear_4', n: 'Стул офис', e: '🪑', p: 100, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_4.png' },
    { id: 'chear_5', n: 'Стул зелёный', e: '🪑', p: 95, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_5.png' },
    { id: 'chear_6', n: 'Стул винтаж', e: '🪑', p: 110, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_6.png' },
  ],
  sofas: [
    { id: 'sofa_1', n: 'Диван беж', e: '🛋️', p: 200, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_1.png' },
    { id: 'sofa_2', n: 'Диван серый', e: '🛋️', p: 220, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_2.png' },
    { id: 'sofa_3', n: 'Диван зелёный', e: '🛋️', p: 210, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_3.png' },
    { id: 'sofa_4', n: 'Скамейка', e: '🛋️', p: 120, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_4.png' },
    { id: 'sofa_5', n: 'Диван фиолет', e: '🛋️', p: 250, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_5.png' },
  ],
  lights: [
    { id: 'Lighht_1', n: 'Светильник 1', e: '💡', p: 70, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_1.png' },
    { id: 'Lighht_2', n: 'Светильник 2', e: '💡', p: 80, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_2.png' },
    { id: 'Lighht_3', n: 'Светильник 3', e: '💡', p: 75, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_3.png' },
  ],
  small: [
    { id: 'Object2.1_1', n: 'Цветы', e: '🌿', p: 40, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_1.png' },
    { id: 'Object2.1_3', n: 'Ёлка', e: '🎄', p: 60, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_3.png' },
    { id: 'Object2.1_4', n: 'Подсолнух', e: '🌻', p: 35, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_4.png' },
    { id: 'Object2.1_5', n: 'Пицца', e: '🍕', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_5.png' },
  ],
  wall: [
    { id: 'wall_window1', n: 'Окно пейзаж', e: '🪟', p: 150, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window1.png' },
    { id: 'wall_window2', n: 'Окно закат', e: '🪟', p: 150, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window2.png' },
    { id: 'wall_window3', n: 'Окно горы', e: '🪟', p: 160, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window3.png' },
    { id: 'wall_window4', n: 'Окно море', e: '🪟', p: 160, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window4.png' },
    { id: 'wall_window5', n: 'Окно ночь', e: '🪟', p: 170, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window5.png' },
    { id: 'wall_decor1', n: 'Картина', e: '🖼️', p: 120, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_decor1.png' },
    { id: 'wall_rat', n: 'Крыса на стене', e: '🐀', p: 100, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_rat.png' },
  ],
};

export const ALL_ITEMS: ShopItem[] = Object.values(SHOP).flat();

if (typeof window !== 'undefined') {
  (window as any).__itemEmojis = Object.fromEntries(ALL_ITEMS.map((i: ShopItem) => [i.id, i.e]));
  (window as any).__itemDefs = Object.fromEntries(ALL_ITEMS.map((i: ShopItem) => [i.id, { w: i.w, h: i.h }]));
}

export const AVATARS = ['🧑‍🚀', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🔧', '👩‍🔬', '🧑‍🍳', '🦊', '🐱', '🐨', '🐸', '👻'];

export const ACHIEVEMENTS = [
  { id: 'first_talk',    name: 'Первый разговор',      icon: '💬', desc: 'Поговори с кем-нибудь' },
  { id: 'smoker',        name: 'Курильщик',            icon: '🚬', desc: 'Прокури в курилке' },
  { id: 'rps_win',       name: 'Азартный',             icon: '🎲', desc: 'Выиграй в КНБ' },
  { id: 'rich',          name: 'Богач',                icon: '💰', desc: 'Накопи 500 алт' },
  { id: 'decorator',     name: 'Дизайнер',             icon: '🎨', desc: 'Оформи кабинет' },
  { id: 'social',        name: 'Социальный',           icon: '🤝', desc: 'Посети 3 кабинета' },
  { id: 'kryska_victim', name: 'Жертва Крыски',        icon: '🐀', desc: 'Крыска украла твой предмет' },
  { id: 'boss_meeting',  name: 'На приеме у босса',    icon: '👔', desc: 'Дойди до кабинета босса по вызову' },
];

export interface DailyQuest {
  id: string; name: string; desc: string; icon: string; target: number; reward: number;
}

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'talk_3',  name: 'Болтун',       desc: 'Поговори с 3 ботами',               icon: '💬', target: 3, reward: 30 },
  { id: 'visit_2', name: 'Турист',       desc: 'Посети 2 разных комнаты',            icon: '🚶', target: 2, reward: 25 },
  { id: 'emoji_5', name: 'Эмодзи-кинг',  desc: 'Используй 5 эмодзи',                icon: '😀', target: 5, reward: 20 },
  { id: 'rps_3',   name: 'Игрок',        desc: 'Сыграй в КНБ 3 раза',               icon: '✊', target: 3, reward: 35 },
  { id: 'smoke_1', name: 'Расслабься',   desc: 'Прокури в курилке',                 icon: '🚬', target: 1, reward: 25 },
];
