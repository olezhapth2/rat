export const TILE = 40;

const E = 0; // empty (void)
const F = 1; // floor (walkable)
const W = 2; // wall (solid)
const S = 3; // side wall — visual-only wall-window overlay on floor (walkable)

export const SIDE_WALL_DEPTH = 3; // S = 3 tiles tall

export const MAP_W = 58;
export const MAP_H = 45;
export const MAP_PW = MAP_W * TILE;
export const MAP_PH = MAP_H * TILE;

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
  sprite?: string;
  surface?: 'floor' | 'wall';
}

const SOLID_ZONE_RATIO = 0;

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
  for (let i = 0; i < corners.length; i++) {
    const [cx, cy] = corners[i];
    const gx = Math.floor(cx / TILE);
    const gy = Math.floor(cy / TILE);
    if (gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W) return false;
    const t = map[gy]?.[gx];
    if (t === W || t === E) return false;
    if (t === S && i < 2) {
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
  id: string; name: string; color: string; spriteId: string;
  x: number; y: number; radius: number;
  role: string;
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
    { id: 'bot_oleg',  name: 'Олег',    color: '#4ecca3', spriteId: 'pers1', x: 5 * TILE,  y: 7 * TILE,  radius: 8, role: 'Разработчик', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
    { id: 'bot_kryska', name: 'Крыска',  color: '#888', spriteId: 'kryska', x: 8 * TILE,  y: 36 * TILE, radius: 6, role: 'крыса',      wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false },
  ];
}

export const EMOJI_CHAT = ['👋', '😂', '👍', '❤️', '🔥', '💀', '👀', '🎮'];

export const BOT_PHRASES: Record<string, string[]> = {
  bot_oleg: [
    'разъ*б чуваки',
    'газ!',
    'hola amigos',
    'опять нашу идею сп*здили',
    'это олеся или алиса...',
    'я не lady gaga',
    'sorry за мой английский',
    'щас бы пуэрчику',
    'в переславле, не беспокоить',
    'где пинг-понг шоу?',
    'джизус никоненко',
    'фристайло ракамакафо',
    '(не)зацени мои стрипы',
    'я из минска',
    'фанат яблок',
    'не жги токены...',
    'ща подлечу на вертолете',
    'пора в монастырь',
    'отдых не мой конек',
    'пу пу пу',
  ],
  bot_kryska: [
    '*пии-пии*',
    '*грызёт провода*',
    '*ночью вылезу*',
  ],
};

export const BOT_REACTIONS: Record<string, string[]> = {
  bot_oleg: ['👋', '💻', '🔧', '🚀'],
  bot_kryska: ['🐀', '🧀', '👀', '💀'],
};

export const BOT_CONVERSATIONS: string[][] = [
  ['Олег', 'Олег', 'Код готов', 'Проверяю'],
];

export interface ShopItem {
  id: string; n: string; e: string; p: number;
  w: number; h: number;
  surface: 'floor' | 'wall';
  noCollision?: boolean;
  sprite: string;
  minigame?: 'smoke' | 'microwave' | 'furniture_toss' | 'book_prediction' | 'cardgame' | 'basketball' | 'okiya';
  pet?: boolean;
}

export const SHOP: Record<string, ShopItem[]> = {
  desks: [
    { id: 'table_2', n: 'Стол классик', e: '🪵', p: 150, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_2.webp' },
    { id: 'table_3', n: 'Стол стекло', e: '🪵', p: 180, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_3.webp' },
    { id: 'table_4', n: 'Стол минимал', e: '🪵', p: 120, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_4.webp' },
    { id: 'table_5', n: 'Стол тёмный', e: '🪵', p: 160, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_5.webp' },
    { id: 'table_6', n: 'Стол светлый', e: '🪵', p: 140, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_6.webp' },
    { id: 'table_7', n: 'Стол офис', e: '🪵', p: 170, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_7.webp' },
    { id: 'table_8', n: 'Стол конференц', e: '🪵', p: 200, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_8.webp' },
    { id: 'table_9', n: 'Стол круглый', e: '🪵', p: 190, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_9.webp' },
    { id: 'table_10', n: 'Стол длинный', e: '🪵', p: 210, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_10.webp' },
    { id: 'table_11', n: 'Стол угловой', e: '🪵', p: 175, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_11.webp' },
    { id: 'table_12', n: 'Стол дерево', e: '🪵', p: 165, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_12.webp' },
    { id: 'table_13', n: 'Стол modern', e: '🪵', p: 185, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_13.webp' },
    { id: 'table_14', n: 'Стол компакт', e: '🪵', p: 130, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_14.webp' },
    { id: 'table_15', n: 'Стол VIP', e: '🪵', p: 250, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/table_15.webp' },
  ],
  chairs: [
    { id: 'chear_1', n: 'Стул дерево', e: '🪑', p: 80, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_1.webp' },
    { id: 'chear_2', n: 'Стул белый', e: '🪑', p: 90, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_2.webp' },
    { id: 'chear_3', n: 'Стул чёрный', e: '🪑', p: 85, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_3.webp' },
    { id: 'chear_4', n: 'Стул офис', e: '🪑', p: 100, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_4.webp' },
    { id: 'chear_5', n: 'Стул зелёный', e: '🪑', p: 95, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_5.webp' },
    { id: 'chear_6', n: 'Стул винтаж', e: '🪑', p: 110, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_6.webp' },
    { id: 'chear_7', n: 'Стул мягкий', e: '🪑', p: 115, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_7.webp' },
    { id: 'chear_8', n: 'Стул кожаный', e: '🪑', p: 130, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_8.webp' },
    { id: 'chear_9', n: 'Стул металлик', e: '🪑', p: 105, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_9.webp' },
    { id: 'chear_10', n: 'Стул пластик', e: '🪑', p: 70, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_10.webp' },
    { id: 'chear_11', n: 'Стул стальной', e: '🪑', p: 120, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_11.webp' },
    { id: 'chear_12', n: 'Стул кресло', e: '🪑', p: 140, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/chear_12.webp' },
  ],
  sofas: [
    { id: 'sofa_1', n: 'Диван беж', e: '🛋️', p: 200, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_1.webp' },
    { id: 'sofa_2', n: 'Диван серый', e: '🛋️', p: 220, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_2.webp' },
    { id: 'sofa_3', n: 'Диван зелёный', e: '🛋️', p: 210, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_3.webp' },
    { id: 'sofa_4', n: 'Скамейка', e: '🛋️', p: 120, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_4.webp' },
    { id: 'sofa_5', n: 'Диван фиолет', e: '🛋️', p: 250, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_5.webp' },
    { id: 'sofa_6', n: 'Диван синий', e: '🛋️', p: 230, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_6.webp' },
    { id: 'sofa_7', n: 'Диван красный', e: '🛋️', p: 240, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_7.webp' },
    { id: 'sofa_8', n: 'Диван угловой', e: '🛋️', p: 280, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/sofa_8.webp' },
  ],
  lights: [
    { id: 'Lighht_1', n: 'Светильник 1', e: '💡', p: 70, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_1.webp' },
    { id: 'Lighht_2', n: 'Светильник 2', e: '💡', p: 80, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_2.webp' },
    { id: 'Lighht_3', n: 'Светильник 3', e: '💡', p: 75, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_3.webp' },
    { id: 'Lighht_4', n: 'Светильник 4', e: '💡', p: 85, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_4.webp' },
    { id: 'Lighht_5', n: 'Светильник 5', e: '💡', p: 90, w: 2, h: 3, surface: 'floor' as const, sprite: '/sprites/objects/lights/Lighht_5.webp' },
  ],
  small: [
    { id: 'Object2.1_1', n: 'Цветы', e: '🌿', p: 40, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_1.webp' },
    { id: 'Object2.1_3', n: 'Ёлка', e: '🎄', p: 60, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_3.webp' },
    { id: 'Object2.1_4', n: 'Подсолнух', e: '🌻', p: 35, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_4.webp' },
    { id: 'Object2.1_5', n: 'Пицца', e: '🍕', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_5.webp' },
    { id: 'Object2.1_6', n: 'Кактус', e: '🌵', p: 45, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_6.webp' },
    { id: 'Object2.1_8', n: 'Гриб', e: '🍄', p: 55, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object2.1_8.webp' },
    { id: 'Object3.2_1', n: 'Коробка', e: '📦', p: 30, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object3.2_1.webp' },
    { id: 'Object3.2_2', n: 'Мусорка', e: '🗑️', p: 25, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/Object3.2_2.webp' },
  ],
  wall: [
    { id: 'wall_window1', n: 'Окно пейзаж', e: '🪟', p: 150, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window1.webp' },
    { id: 'wall_window2', n: 'Окно закат', e: '🪟', p: 150, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window2.webp' },
    { id: 'wall_window3', n: 'Окно горы', e: '🪟', p: 160, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window3.webp' },
    { id: 'wall_window4', n: 'Окно море', e: '🪟', p: 160, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window4.webp' },
    { id: 'wall_window5', n: 'Окно ночь', e: '🪟', p: 170, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window5.webp' },
    { id: 'wall_window6', n: 'Окно рассвет', e: '🪟', p: 155, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window6.webp' },
    { id: 'wall_window7', n: 'Окно лес', e: '🪟', p: 165, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window7.webp' },
    { id: 'wall_window8', n: 'Окно город', e: '🪟', p: 175, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window8.webp' },
    { id: 'wall_window9', n: 'Окно звёзды', e: '🪟', p: 180, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_window9.webp' },
    { id: 'wall_decor1', n: 'Картина', e: '🖼️', p: 120, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_decor1.webp' },
    { id: 'wall_rat', n: 'Крыса на стене', e: '🐀', p: 100, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_rat.webp' },
    { id: 'wall_book1', n: 'Книжная полка', e: '📚', p: 90, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_book1.webp' },
    { id: 'poster1', n: 'Постер «Нет курению»', e: '🚫', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/poster1.webp' },
    { id: 'poster2', n: 'Постер «Диаграмма»', e: '📊', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/poster2.webp' },
    { id: 'poster3', n: 'Постер «Пузыри»', e: '🎨', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/poster3.webp' },
    { id: 'poster4', n: 'Постер «Сердце»', e: '❤️', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/poster4.webp' },
    { id: 'poster5', n: 'Постер «Смайлик»', e: '😊', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/poster5.webp' },
    { id: 'wall_freez', n: 'Холодильник', e: '🧊', p: 200, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_freez.webp' },
    { id: 'wall_safe', n: 'Сейф', e: '🔐', p: 250, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/wall_safe.webp' },
  ],
  minigames: [
    { id: 'minigame_ashtray', n: 'Пепельница', e: '🚬', p: 60, w: 3, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/ashtray.webp', minigame: 'smoke' as const },
    { id: 'minigame_bookshelf', n: 'Шкаф', e: '📖', p: 80, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/minigames/bookshelf.webp', minigame: 'book_prediction' as const },
    { id: 'minigame_plant', n: 'Растение', e: '🌿', p: 70, w: 2, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/plant.webp', minigame: 'cardgame' as const },
    { id: 'minigame_basketball', n: 'Баскетбол', e: '🏀', p: 90, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/minigames/basketball.webp', minigame: 'basketball' as const },
    { id: 'minigame_microwave', n: 'Микроволновка', e: '📦', p: 80, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/minigames/microwave.webp', minigame: 'microwave' as const },
    { id: 'minigame_okia', n: 'OKIЯ', e: '🃏', p: 50, w: 3, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/okia.webp', minigame: 'okiya' as const },
    { id: 'minigame_uno', n: 'UNO', e: '🃏', p: 60, w: 3, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/uno.webp', minigame: 'cardgame' as const },
    { id: 'minigame_malboro', n: 'Мальборо', e: '🌿', p: 65, w: 2, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/minigames/malboro.webp' },
  ],
  pets: [
    { id: 'pet_cat', n: 'Кошка', e: '🐱', p: 150, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet1.webp', pet: true },
    { id: 'pet_dog', n: 'Собака', e: '🐶', p: 150, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet2.webp', pet: true },
    { id: 'pet_bird', n: 'Птица', e: '🐦', p: 120, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet3.webp', pet: true },
    { id: 'pet_bunny', n: 'Кролик', e: '🐰', p: 130, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/pet4.webp', pet: true },
    { id: 'pet_rat', n: 'Крыса', e: '🐀', p: 100, w: 1, h: 1, surface: 'floor' as const, noCollision: true, sprite: '/sprites/pets/petrat.webp', pet: true },
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
];

export interface DailyQuest {
  id: string; name: string; desc: string; icon: string; target: number; reward: number;
}

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'talk_3',  name: 'Болтун',       desc: 'Поговори с 3 ботами',               icon: '💬', target: 3, reward: 30 },
  { id: 'visit_2', name: 'Турист',       desc: 'Посети 2 разных комнаты',            icon: '🚶', target: 2, reward: 25 },
  { id: 'emoji_5', name: 'Эмодзи-кинг',  desc: 'Используй 5 эмодзи',                icon: '😀', target: 5, reward: 20 },
  { id: 'rps_3',   name: 'Игрок',        desc: 'Сыграй в КНБ 3 раза',               icon: '✊', target: 3, reward: 35 },
  { id: 'smoke_1', name: 'Расслабься',   desc: 'Сыграй в сигаретную через пепельницу', icon: '🚬', target: 1, reward: 25 },
];
