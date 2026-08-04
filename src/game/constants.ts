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
  Expanded boss (14 wide), new Кухня and Библиотека replace chill/smoking.

  Top row (y=1..8):
    boss    x=1..14  (14 wide)
    wall    x=15
    office1 x=16..20 (5 wide)
    wall    x=21
    office2 x=22..26 (5 wide)
    wall    x=27
    office3 x=28..31 (4 wide)
    wall    x=32
    кухня   x=33..39 (7 wide)

  Hall (y=10..18):
    hall    x=1..32
    wall    x=33
    библиотека x=33..39 y=10..18 (7×9)

  Bottom row (y=20..28):
    office4 x=11..17 (7 wide)
    wall    x=18
    office5 x=19..25 (7 wide)
    wall    x=26
    office6 x=27..39 (13 wide)
*/
export const ROOMS: Room[] = [
  { id: 'boss',    name: 'Босс',        fx: 1,  fy: 1,  fw: 14, fh: 8,  color1: '#dcb98a', color2: '#c8a97a' },
  { id: 'office1', name: 'Кабинет 1',   fx: 16, fy: 1,  fw: 5,  fh: 8,  color1: '#c9c2b6', color2: '#b9b2a6' },
  { id: 'office2', name: 'Кабинет 2',   fx: 22, fy: 1,  fw: 5,  fh: 8,  color1: '#c9b8d1', color2: '#b9a8c1' },
  { id: 'office3', name: 'Кабинет 3',   fx: 28, fy: 1,  fw: 4,  fh: 8,  color1: '#d1abb7', color2: '#c19ba7' },
  { id: 'kitchen', name: 'Кухня',       fx: 33, fy: 1,  fw: 7,  fh: 8,  color1: '#b8d4a3', color2: '#a8c493' },
  { id: 'hall',    name: 'Зал',         fx: 1,  fy: 10, fw: 32, fh: 9,  color1: '#cbb896', color2: '#bba886' },
  { id: 'library', name: 'Библиотека',  fx: 33, fy: 10, fw: 7,  fh: 9,  color1: '#a3b8d4', color2: '#93a8c4' },
  { id: 'office4', name: 'Кабинет 4',   fx: 11, fy: 20, fw: 7,  fh: 9,  color1: '#a9c2ab', color2: '#99b29b' },
  { id: 'office5', name: 'Кабинет 5',   fx: 19, fy: 20, fw: 7,  fh: 9,  color1: '#cbb87c', color2: '#bba86c' },
  { id: 'office6', name: 'Кабинет 6',   fx: 27, fy: 20, fw: 13, fh: 9,  color1: '#8fc0be', color2: '#7fb0ae' },
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

  // 4. Vertical walls between rooms (1-tile thick)
  // x=15: boss | office1 (y=1..8)
  for (let y = 1; y <= 8; y++) map[y][15] = W;
  // x=21: office1 | office2 (y=1..8), office4 | office5 (y=20..28)
  for (let y = 1; y <= 8; y++) map[y][21] = W;
  for (let y = 20; y < MAP_H; y++) map[y][21] = W;
  // x=27: office2 | office3 (y=1..8), office5 | office6 (y=20..28)
  for (let y = 1; y <= 8; y++) map[y][27] = W;
  for (let y = 20; y < MAP_H; y++) map[y][27] = W;
  // x=32: office3 | кухня (y=1..8), hall | библиотека (y=10..18)
  for (let y = 1; y <= 8; y++) map[y][32] = W;
  for (let y = 10; y <= 18; y++) map[y][32] = W;

  // 5. Horizontal walls
  // y=9: top rooms | hall (x=0..32)
  for (let x = 0; x <= 32; x++) map[9][x] = W;
  // y=19: hall | bottom offices (x=0..39)
  for (let x = 0; x <= 39; x++) map[19][x] = W;

  // 6. Doorways — 3-tile breaks in walls
  // Top wall y=9: boss→hall, office1→hall, office2→hall, office3→hall
  for (const cx of [7, 18, 24, 29]) {
    for (let dx = -1; dx <= 1; dx++) map[9][cx + dx] = F;
  }
  // Bottom wall y=19: hall→office4, hall→office5, hall→office6
  for (const cx of [14, 22, 33]) {
    for (let dx = -1; dx <= 1; dx++) map[19][cx + dx] = F;
  }
  // Vertical wall x=32: hall↔кухня, hall↔библиотека
  for (const cy of [4, 13, 16]) {
    for (let dy = -1; dy <= 1; dy++) map[cy + dy][32] = F;
  }

  // 7. Wall-window cutouts — replace S with F where doorways enter through wall-window
  // Hall wall-window (y=10..12) cutouts at doorway x positions
  for (const cx of [7, 18, 24, 29]) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let y = 10; y <= 12; y++) {
        if (map[y]?.[cx + dx] === S) map[y][cx + dx] = F;
      }
    }
  }
  // Bottom rooms wall-window (y=20..22) cutouts
  for (const cx of [14, 22, 33]) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let y = 20; y <= 22; y++) {
        if (map[y]?.[cx + dx] === S) map[y][cx + dx] = F;
      }
    }
  }
  // Кухня/библиотека side cutout (x=33..34, y=1..2 and y=10..12)
  for (let y = 1; y <= 2; y++) {
    map[y][33] = F;
    map[y][34] = F;
  }
  for (let y = 10; y <= 12; y++) {
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
  return [
    { id: 'bookshelf', type: 'furniture', x: 34 * TILE, y: 12 * TILE, w: 2, h: 3, solid: true, color: '#8B4513', label: 'Книжный шкаф', room: 'library', sprite: '/ast/obj/wall_book3.3.png' },
    { id: 'basket_hoop', type: 'furniture', x: 4 * TILE, y: 12 * TILE, w: 2, h: 3, solid: true, color: '#ff6600', label: 'Корзина', room: 'hall', sprite: '/sprites/objects/small/basket_hoop.png' },
    { id: 'coffee_machine', type: 'furniture', x: 35 * TILE, y: 3 * TILE, w: 1, h: 2, solid: false, noCollision: true, color: '#6b4423', label: 'Кофемашина', room: 'kitchen' },
  ];
}

export interface Player {
  x: number; y: number;
  speed: number; radius: number;
  vx: number; vy: number;
}

export function createPlayer(): Player {
  return {
    x: 17 * TILE + TILE / 2,
    y: 14 * TILE + TILE / 2,
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
  _stolenCoins: number;
  _chaseTimer: number;
  _speedMultiplier: number;
  _chasingPlayer: boolean;
}

export function createBots(): Bot[] {
  return [
    { id: 'pers1',  name: 'Петя',       color: '#e94560', x: 18 * TILE, y: 5 * TILE,  radius: 8, role: 'PM',        room: 'office1', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers2',  name: 'Аня',        color: '#ffa726', x: 24 * TILE, y: 5 * TILE,  radius: 8, role: 'Дизайнер',  room: 'office2', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers3',  name: 'Сергей',     color: '#2196f3', x: 30 * TILE, y: 5 * TILE,  radius: 8, role: 'QA',        room: 'office3', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers5',  name: 'Ольга',      color: '#9c27b0', x: 17 * TILE, y: 14 * TILE, radius: 8, role: 'HR',        room: 'hall',    wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'kryska', name: 'Крыска',     color: '#888',     x: 36 * TILE, y: 14 * TILE, radius: 6, role: 'крыса',     room: 'library', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
  ];
}

export const EMOJI_CHAT = ['👋', '😂', '👍', '❤️', '🔥', '💀', '👀', '🎮'];

export const ROOM_CENTERS: Record<string, { x: number; y: number }> = {
  boss:    { x: (1 + 14 / 2) * TILE, y: (1 + 8 / 2) * TILE },
  office1: { x: (16 + 5 / 2) * TILE, y: (1 + 8 / 2) * TILE },
  office2: { x: (22 + 5 / 2) * TILE, y: (1 + 8 / 2) * TILE },
  office3: { x: (28 + 4 / 2) * TILE, y: (1 + 8 / 2) * TILE },
  kitchen: { x: (33 + 7 / 2) * TILE, y: (1 + 8 / 2) * TILE },
  hall:    { x: (1 + 32 / 2) * TILE, y: (10 + 9 / 2) * TILE },
  library: { x: (33 + 7 / 2) * TILE, y: (10 + 9 / 2) * TILE },
  office4: { x: (11 + 7 / 2) * TILE, y: (20 + 9 / 2) * TILE },
  office5: { x: (19 + 7 / 2) * TILE, y: (20 + 9 / 2) * TILE },
  office6: { x: (27 + 13 / 2) * TILE, y: (20 + 9 / 2) * TILE },
};

export const BOT_PHRASES: Record<string, string[]> = {
  pers1: [
    'Клиент прислал новый бриф',
    'Надо обсудить концепцию',
    'Какой шрифт выберем?',
    'Мудборд готов',
    'Палитра утверждена',
    'Ревью дизайна в 15:00',
  ],
  pers2: [
    'Нарисовала новые макеты',
    'Обновила UI-kit',
    'Компоненты в Figma готовы',
    'Прототип кликабельный',
    'Иконки дорисовала',
    'Тени добавила на карточки',
  ],
  pers3: [
    'Проверяю адаптив',
    'На мобилке что-то поехало',
    'Пиксель в пиксель сверяю',
    'Отступы не бьются',
    'Гайдлайн обновила',
    'Размер шрифта не тот',
  ],
  pers4: [
    'Лендинг почти готов',
    'Анимации добавил',
    'Hover-эффекты доработал',
    'Градиент обновил',
    'Фон поменял',
    'Кнопки стилизовал',
  ],
  pers5: [
    'Брендбук обновила',
    'Нужны новые баннеры',
    'Презентация для клиента',
    'Мокапы 준비ила',
    'Палитра расширилась',
    'Дизайн-система растёт',
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
  ['Петя', 'Сергей', 'Макет готов?', 'Почти...'],
  ['Аня', 'Петя', 'Презентация готова', 'Ок смотрю'],
  ['Аня', 'Сергей', 'Палитра ок?', 'Нужны правки'],
  ['Петя', 'Аня', 'Сколько осталось?', 'День-два'],
  ['Сергей', 'Петя', 'Кто подписал?', 'Не я!'],
  ['Аня', 'Сергей', 'Дизайн пройден?', 'Есть замечания'],
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
  pets: [
    { id: 'pet1', n: 'Кот', e: '🐱', p: 100, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet1.png' },
    { id: 'pet2', n: 'Пёс', e: '🐶', p: 120, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet2.png' },
    { id: 'pet3', n: 'Рыба', e: '🐟', p: 80, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet3.png' },
    { id: 'pet4', n: 'Птица', e: '🐦', p: 90, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet4.png' },
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
  { id: 'kryska_victim', name: 'Жертва Крыски',        icon: '🐀', desc: 'Крыска украла твои деньги' },
  { id: 'boss_meeting',  name: 'На приеме у босса',    icon: '👔', desc: 'Дойди до кабинета босса по вызову' },
  { id: 'secret_finder', name: 'Тайна раскрыта',        icon: '🔍', desc: 'Найди секрет за книжным шкафом' },
  { id: 'pet_lover',     name: 'Зоофил',                icon: '🐾', desc: 'Погладь питомца 10 раз' },
];

export interface DailyQuest {
  id: string; name: string; desc: string; icon: string; target: number; reward: number;
}

export interface OfficeEvent {
  id: string;
  name: string;
  icon: string;
  hour: number;
  minute: number;
  duration: number;
  bonusMultiplier: number;
  message: string;
  roomBonus: string | null;
}

export const OFFICE_EVENTS: OfficeEvent[] = [
  { id: 'morning_coffee', name: 'Утренний кофе', icon: '☕', hour: 9, minute: 0, duration: 15, bonusMultiplier: 1.5, message: 'Кофе-брейк! Бонус ×1.5 на кухне', roomBonus: 'kitchen' },
  { id: 'lunch', name: 'Обед', icon: '🍕', hour: 13, minute: 0, duration: 30, bonusMultiplier: 2, message: 'Обед! Бонус ×2 на кухне', roomBonus: 'kitchen' },
  { id: 'happy_hour', name: 'Happy Hour', icon: '🎉', hour: 17, minute: 0, duration: 20, bonusMultiplier: 2, message: 'Happy Hour! Бонус ×2 везде!', roomBonus: null },
  { id: 'reading_time', name: 'Час чтения', icon: '📖', hour: 11, minute: 30, duration: 10, bonusMultiplier: 1.5, message: 'Час чтения! Бонус ×1.5 в библиотеке', roomBonus: 'library' },
  { id: 'cleanup', name: 'Уборка', icon: '🧹', hour: 18, minute: 0, duration: 15, bonusMultiplier: 1.5, message: 'Уборка! Бонус ×1.5 в коридоре', roomBonus: 'hall' },
];

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'talk_3',  name: 'Болтун',       desc: 'Поговори с 3 ботами',               icon: '💬', target: 3, reward: 30 },
  { id: 'visit_2', name: 'Турист',       desc: 'Посети 2 разных комнаты',            icon: '🚶', target: 2, reward: 25 },
  { id: 'emoji_5', name: 'Эмодзи-кинг',  desc: 'Используй 5 эмодзи',                icon: '😀', target: 5, reward: 20 },
  { id: 'rps_3',   name: 'Игрок',        desc: 'Сыграй в КНБ 3 раза',               icon: '✊', target: 3, reward: 35 },
  { id: 'read_1',  name: 'Книжный червь', desc: 'Прочитай книгу в библиотеке',       icon: '📖', target: 1, reward: 25 },
];
