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
  58×45 grid — Frame 454.png
  
  Top rooms (y=1..9):      7 rooms, W at x=9,16,23,30,37,44
  Hall (y=14..16):         full-width F
  Middle rooms (y=21..27): 5 rooms, W at x=16,21,33,43,50
  Lower area (y=31..37):   left hall + 5 rooms, W at x=16,24,31,38,45
  Bottom rooms (y=38..44): left hall + 7 rooms, W at x=7,11,15,24,31,38,45
  Borders:                 y=0,44 all W; x=0,57 all W
*/
export const ROOMS: Room[] = [
  // Top rooms (y=1..9)
  { id: 'boss',    name: 'Босс',        fx: 1,  fy: 4,  fw: 8,  fh: 6,  color1: '#dcb98a', color2: '#c8a97a' },
  { id: 'office1', name: 'Кабинет 1',   fx: 10, fy: 4,  fw: 6,  fh: 6,  color1: '#c9c2b6', color2: '#b9b2a6' },
  { id: 'office2', name: 'Кабинет 2',   fx: 17, fy: 4,  fw: 6,  fh: 6,  color1: '#c9b8d1', color2: '#b9a8c1' },
  { id: 'office3', name: 'Кабинет 3',   fx: 24, fy: 4,  fw: 6,  fh: 6,  color1: '#d1abb7', color2: '#c19ba7' },
  { id: 'office4', name: 'Кабинет 4',   fx: 31, fy: 4,  fw: 6,  fh: 6,  color1: '#a9c2ab', color2: '#99b29b' },
  { id: 'office5', name: 'Кабинет 5',   fx: 38, fy: 4,  fw: 6,  fh: 6,  color1: '#cbb87c', color2: '#bba86c' },
  { id: 'office6', name: 'Кабинет 6',   fx: 45, fy: 4,  fw: 12, fh: 6,  color1: '#8fc0be', color2: '#7fb0ae' },
  // Hall (y=14..16)
  { id: 'hall',    name: 'Зал',         fx: 1,  fy: 14, fw: 56, fh: 3,  color1: '#cbb896', color2: '#bba886' },
  // Middle rooms (y=21..27)
  { id: 'library', name: 'Библиотека',  fx: 1,  fy: 14, fw: 10, fh: 14, color1: '#c9c2b6', color2: '#b9b2a6' },
  { id: 'office7', name: 'Кабинет 7',   fx: 17, fy: 21, fw: 4,  fh: 7,  color1: '#d1abb7', color2: '#c19ba7' },
  { id: 'office8', name: 'Кабинет 8',   fx: 22, fy: 21, fw: 11, fh: 7,  color1: '#a9c2ab', color2: '#99b29b' },
  { id: 'office9', name: 'Кабинет 9',   fx: 34, fy: 21, fw: 9,  fh: 7,  color1: '#c9b8d1', color2: '#b9a8c1' },
  { id: 'office10',name: 'Кабинет 10',  fx: 44, fy: 21, fw: 13, fh: 7,  color1: '#dcb98a', color2: '#c8a97a' },
  // Bottom rooms (y=28..44)
  { id: 'kitchen', name: 'Кухня',       fx: 1,  fy: 28, fw: 15, fh: 16, color1: '#cbb87c', color2: '#bba86c' },
  { id: 'office11',name: 'Кабинет 11',  fx: 17, fy: 28, fw: 7,  fh: 16, color1: '#8fc0be', color2: '#7fb0ae' },
  { id: 'office12',name: 'Кабинет 12',  fx: 25, fy: 28, fw: 6,  fh: 16, color1: '#d1abb7', color2: '#c19ba7' },
  { id: 'office13',name: 'Кабинет 13',  fx: 32, fy: 28, fw: 6,  fh: 16, color1: '#c9c2b6', color2: '#b9b2a6' },
  { id: 'office14',name: 'Кабинет 14',  fx: 39, fy: 28, fw: 6,  fh: 16, color1: '#a9c2ab', color2: '#99b29b' },
  { id: 'office15',name: 'Кабинет 15',  fx: 46, fy: 28, fw: 11, fh: 16, color1: '#c9b8d1', color2: '#b9a8c1' },
];

// Default textures per room: { floor: textureIndex, wall: textureIndex }
// floor1-5, wall1-5 (0-indexed)
export const ROOM_TEXTURES: Record<string, { floor: number; wall: number }> = {
  boss:     { floor: 0, wall: 0 },
  office1:  { floor: 1, wall: 1 },
  office2:  { floor: 2, wall: 2 },
  office3:  { floor: 3, wall: 3 },
  office4:  { floor: 4, wall: 4 },
  office5:  { floor: 0, wall: 2 },
  office6:  { floor: 1, wall: 3 },
  hall:     { floor: 2, wall: 1 },
  library:  { floor: 3, wall: 0 },
  office7:  { floor: 4, wall: 4 },
  office8:  { floor: 0, wall: 3 },
  office9:  { floor: 1, wall: 1 },
  office10: { floor: 2, wall: 2 },
  office11: { floor: 3, wall: 0 },
  office12: { floor: 4, wall: 4 },
  office13: { floor: 0, wall: 1 },
  office14: { floor: 1, wall: 3 },
  office15: { floor: 2, wall: 2 },
  kitchen:  { floor: 4, wall: 0 },
};

export const MAP_W = 58;
export const MAP_H = 45;
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

const MAP_DATA = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'WSSSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSSSSSSWW',
  'WSSSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSSSSSSWW',
  'WSSSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSSSSSSWW',
  'WFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WWWWWWWFFWWWWWFFWWWFFWWWWWWFFWWWFFFWWWWWWFFWWWFFFFFWWWWWWW',
  'WSSSSSSFFSSSSSFFSSSFFSSSSSSFFSSSFFFSSSSSSFFSSSFFFFFSSSSSWW',
  'WSSSSSSFFSSSSSFFSSSFFSSSSSSFFSSSFFFSSSSSSFFSSSFFFFFSSSSSWW',
  'WSSSSSSFFSSSSSFFSSSFFSSSSSSFFSSSFFFSSSSSSFFSSSFFFFFSSSSSWW',
  'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
  'WFFFFFFFFFFWWWWWWWWWWWWFFWWWWWWWWWWWWWFFWWWWWWWWFFWWWWWWWW',
  'WFFFFFFFFFFSSSSSSWSSSSSFFWSSSSSSSSSSSWFFSSSSSSSWFFSSSSSSSW',
  'WFFFFFFFFFFSSSSSSWSSSSSFFWSSSSSSSSSSSWFFSSSSSSSWFFSSSSSSSW',
  'WFFFFFFFFFFSSSSSSWSSSSSFFWSSSSSSSSSSSWFFSSSSSSSWFFSSSSSSSW',
  'WFFFFFFFFFFFFFFFFWFFFFFFFWFFFFFFFFFFFWFFFFFFFFFWFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFWFFFFFFFWFFFFFFFFFFFWFFFFFFFFFWFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFWFFFFFFFWFFFFFFFFFFFWFFFFFFFFFWFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFWFFFFFFFFFFFFFFFFFFFFFFFFFFFWFFFFFFFFFWWW',
  'WFFFFFFFFFFFFFFFFWFFFFFFFFFFFFFFFFFFFFFFFFFFFWFFFFFFFFFWWW',
  'WFFFFFFFFFFFFFFFFWFFFFFFFFFFFFFFFFFFFFFFFFFFFWFFFFFFFFFWWW',
  'WFFFFFFFFFFFFFFFWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'WFFFFFFFFFFFFFFFWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSSSSSSWW',
  'WFFFFFFFFFFFFFFFWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSSSSSSWW',
  'WFFFFFFFFFFFFFFFWSSSSSSWSSSSSSWSSSSSSWSSSSSSWSSSSSSSSSSSWW',
  'WFFFFFFFFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WWWWFFWWWFFWWWFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WSSSFFSSSFFSSSFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WSSSFFSSSFFSSSFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WSSSFFSSSFFSSSFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFWFFFFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFWWWFFWWWWWWFFWWWFFFWWWWWWFFWWWFFFFFWWWWWWW',
  'WWWWFFWWWFFWWWFFSSSFFSSSSSSFFSSSFFFSSSSSSFFSSSFFFFFSSSSSWW',
  'WSSSFFSSSFFSSSFFSSSFFSSSSSSFFSSSFFFSSSSSSFFSSSFFFFFSSSSSWW',
  'WSSSFFSSSFFSSSFFSSSFFSSSSSSFFSSSFFFSSSSSSFFSSSFFFFFSSSSSWW',
  'WSSSFFSSSFFSSSFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
  'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
];

const CHAR_MAP: Record<string, number> = { 'W': W, 'S': S, 'F': F };

export function buildMap(): number[][] {
  return MAP_DATA.map(row => row.split('').map(ch => CHAR_MAP[ch] ?? E));
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
  surface?: 'floor' | 'wall';
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
    x: 29 * TILE + TILE / 2,
    y: 15 * TILE + TILE / 2,
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
    { id: 'pers1',  name: 'Олег',    color: '#4ecca3', x: 5 * TILE,  y: 7 * TILE,  radius: 8, role: 'Разработчик', room: 'boss',    wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers2',  name: 'Аня',     color: '#ffa726', x: 13 * TILE, y: 7 * TILE,  radius: 8, role: 'Дизайнер',   room: 'office1', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers3',  name: 'Алиса',   color: '#9c27b0', x: 27 * TILE, y: 7 * TILE,  radius: 8, role: 'HR',         room: 'office3', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers4',  name: 'Кирилл',  color: '#2196f3', x: 29 * TILE, y: 15 * TILE, radius: 8, role: 'QA',         room: 'hall',    wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'pers5',  name: 'Саша',    color: '#e94560', x: 28 * TILE, y: 25 * TILE, radius: 8, role: 'PM',         room: 'office8', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'kryska', name: 'Крыска',  color: '#888',     x: 8 * TILE,  y: 36 * TILE, radius: 6, role: 'крыса',      room: 'kitchen', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
  ];
}

export const EMOJI_CHAT = ['👋', '😂', '👍', '❤️', '🔥', '💀', '👀', '🎮'];

export const ROOM_CENTERS: Record<string, { x: number; y: number }> = {
  boss:    { x: (1 + 8 / 2) * TILE,  y: (4 + 6 / 2) * TILE },
  office1: { x: (10 + 6 / 2) * TILE, y: (4 + 6 / 2) * TILE },
  office2: { x: (17 + 6 / 2) * TILE, y: (4 + 6 / 2) * TILE },
  office3: { x: (24 + 6 / 2) * TILE, y: (4 + 6 / 2) * TILE },
  office4: { x: (31 + 6 / 2) * TILE, y: (4 + 6 / 2) * TILE },
  office5: { x: (38 + 6 / 2) * TILE, y: (4 + 6 / 2) * TILE },
  office6: { x: (45 + 12 / 2) * TILE, y: (4 + 6 / 2) * TILE },
  hall:    { x: (1 + 56 / 2) * TILE, y: (14 + 3 / 2) * TILE },
  library: { x: (1 + 10 / 2) * TILE, y: (14 + 14 / 2) * TILE },
  office7: { x: (17 + 4 / 2) * TILE, y: (21 + 7 / 2) * TILE },
  office8: { x: (22 + 11 / 2) * TILE, y: (21 + 7 / 2) * TILE },
  office9: { x: (34 + 9 / 2) * TILE,  y: (21 + 7 / 2) * TILE },
  office10:{ x: (44 + 13 / 2) * TILE, y: (21 + 7 / 2) * TILE },
  kitchen: { x: (1 + 15 / 2) * TILE, y: (28 + 16 / 2) * TILE },
  office11:{ x: (17 + 7 / 2) * TILE, y: (28 + 16 / 2) * TILE },
  office12:{ x: (25 + 6 / 2) * TILE, y: (28 + 16 / 2) * TILE },
  office13:{ x: (32 + 6 / 2) * TILE, y: (28 + 16 / 2) * TILE },
  office14:{ x: (39 + 6 / 2) * TILE, y: (28 + 16 / 2) * TILE },
  office15:{ x: (46 + 11 / 2) * TILE, y: (28 + 16 / 2) * TILE },
};

export const BOT_PHRASES: Record<string, string[]> = {
  pers1: [
    'Код скомпилировался с первого раза',
    'Пулл реквест готов к ревью',
    'Баг в продакшене, пофиксил',
    'Рефакторю этот модуль',
    'Деплой прошёл успешно',
    'Тесты зелёные',
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
    'Брендбук обновила',
    'Нужны новые баннеры',
    'Презентация для клиента',
    'Мокапы 준비ила',
    'Палитра расширилась',
    'Дизайн-система растёт',
  ],
  pers4: [
    'Баг в.edge case нашла',
    'Регрессионный тест написала',
    'Сценарий протестировала',
    'Нашла баг в форме',
    'Откатываем на прошлую версию',
    'Всё работает, закрываю тикет',
  ],
  pers5: [
    'Спринт завершён',
    'Дедлайн через неделю',
    'Оценки от команды собраны',
    'Статус проекта обновлён',
    'Ретроспектива в 17:00',
    'Новый тикет в бэклоге',
  ],
  kryska: [
    '*пии-пии*',
    '*грызёт провода*',
    '*ночью вылезу*',
  ],
};

export const BOT_REACTIONS: Record<string, string[]> = {
  pers1: ['👋', '💻', '🔧', '🚀'],
  pers2: ['👋', '🎨', '✨', '😊'],
  pers3: ['👋', '💼', '🤝', '📋'],
  pers4: ['👋', '🐛', '😤', '🔍'],
  pers5: ['👋', '📋', '📊', '🗓️'],
  kryska: ['🐀', '🧀', '👀', '💀'],
};

export const BOT_CONVERSATIONS: string[][] = [
  ['Олег', 'Кирилл', 'Тесты прошли?', 'Почти...'],
  ['Аня', 'Олег', 'Макет готов', 'Ок смотрю'],
  ['Аня', 'Кирилл', 'Дизайн ок?', 'Нужны правки'],
  ['Олег', 'Аня', 'Сколько осталось?', 'День-два'],
  ['Кирилл', 'Олег', 'Кто деплоил?', 'Не я!'],
  ['Аня', 'Кирилл', 'Дизайн пройден?', 'Есть замечания'],
  ['Саша', 'Олег', 'Спринт готов?', 'Почти'],
  ['Саша', 'Аня', 'Макет для клиента?', 'Завтра будет'],
];

export interface ShopItem {
  id: string; n: string; e: string; p: number;
  w: number; h: number;
  surface: 'floor' | 'wall';
  noCollision?: boolean;
  sprite: string;
  minigame?: 'smoke' | 'microwave' | 'furniture_toss' | 'book_prediction' | 'cardgame' | 'basketball';
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
    { id: 'pet1', n: 'Кот', e: '🐱', p: 100, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet1.webp' },
    { id: 'pet2', n: 'Пёс', e: '🐶', p: 120, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet2.webp' },
    { id: 'pet3', n: 'Рыба', e: '🐟', p: 80, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet3.webp' },
    { id: 'pet4', n: 'Птица', e: '🐦', p: 90, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet4.webp' },
  ],
  minigames: [
    { id: 'minigame_ashtray', n: 'Пепельница', e: '🚬', p: 60, w: 3, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/ashtray.png', minigame: 'smoke' as const },
    { id: 'minigame_bookshelf', n: 'Шкаф', e: '📖', p: 80, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/minigames/bookshelf.png', minigame: 'book_prediction' as const },
    { id: 'minigame_plant', n: 'Растение', e: '🌿', p: 70, w: 2, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/plant.png', minigame: 'cardgame' as const },
    { id: 'minigame_basketball', n: 'Баскетбол', e: '🏀', p: 90, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/minigames/basketball.png', minigame: 'basketball' as const },
    { id: 'minigame_microwave', n: 'Микроволновка', e: '📦', p: 80, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/minigames/microwave.png', minigame: 'microwave' as const },
  ],
};

export const ALL_ITEMS: ShopItem[] = Object.values(SHOP).flat();

if (typeof window !== 'undefined') {
  (window as any).__itemEmojis = Object.fromEntries(ALL_ITEMS.map((i: ShopItem) => [i.id, i.e]));
  (window as any).__itemDefs = Object.fromEntries(ALL_ITEMS.map((i: ShopItem) => [i.id, { w: i.w, h: i.h }]));
  (window as any).__itemSprites = Object.fromEntries(ALL_ITEMS.map((i: ShopItem) => [i.id, i.sprite]));
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
  { id: 'smoke_1', name: 'Расслабься',   desc: 'Сыграй в сигаретную через пепельницу', icon: '🚬', target: 1, reward: 25 },
];
