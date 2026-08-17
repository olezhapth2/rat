export const TILE = 40;

const E = 0; // empty (void)
const F = 1; // floor (walkable)
const W = 2; // wall (solid)
const S = 3; // side wall — visual-only wall-window overlay on floor (walkable)

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
  _stealTime: number;
  _stuckFrames: number;
}

export function createBots(): Bot[] {
  return [
    { id: 'bot_oleg',  name: 'Олег',    color: '#4ecca3', spriteId: 'pers1', x: 5 * TILE,  y: 7 * TILE,  radius: 8, role: 'Разработчик', wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false, _stealTime: 0, _stuckFrames: 0 },
    { id: 'bot_kryska', name: 'Крыска',  color: '#888', spriteId: 'kryska', x: 9 * TILE + TILE / 2,  y: 36 * TILE + TILE / 2, radius: 6, role: 'крыса',      wanderTimer: 0, wanderTargetX: null, wanderTargetY: null, _speechBubble: null, _speechTime: 0, _emoji: null, _emojiTime: 0, _targetRoomId: null, _roomTimer: 0, _stealCooldown: 0, _lastVx: 0, _lastVy: 0, _stolenCoins: 0, _chaseTimer: 0, _speedMultiplier: 1, _chasingPlayer: false, _stealTime: 0, _stuckFrames: 0 },
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
  ['Олег', 'Крыска', 'Код готов', 'Проверяю'],
];

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#A8B072',
  uncommon: '#6B8CAE',
  rare: '#E8C878',
  epic: '#A491C4',
  legendary: '#C55A5A',
};

export interface ShopItem {
  id: string; n: string; e: string; p: number;
  w: number; h: number;
  surface: 'floor' | 'wall';
  noCollision?: boolean;
  sprite: string;
  rarity?: Rarity;
  minigame?: 'smoke' | 'microwave' | 'furniture_toss' | 'book_prediction' | 'cardgame' | 'basketball' | 'okiya';
  pet?: boolean;
}

export const SHOP: Record<string, ShopItem[]> = {
  desks: [
    { id: 'table_baza', n: 'База', e: '🪵', p: 50, w: 3, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/tables/стол_База.webp' },
    { id: 'table_iris', n: 'Ирис', e: '🪵', p: 50, w: 3, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/tables/стол_Ирис.webp' },
    { id: 'table_1999', n: '1999', e: '🪵', p: 50, w: 3, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/tables/стол_1999.webp' },
    { id: 'table_pechatnik', n: 'Печатник', e: '🪵', p: 100, w: 3, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/tables/стол_Печатник.webp' },
    { id: 'table_prozrachny', n: 'Прозрачный', e: '🪵', p: 100, w: 3, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/tables/стол_Прозрачный.webp' },
    { id: 'table_nakryty', n: 'Накрытый', e: '🪵', p: 100, w: 3, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/tables/стол_Накрытый.webp' },
    { id: 'table_bar', n: 'Бар', e: '🪵', p: 100, w: 3, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/tables/стол_Бар.webp' },
    { id: 'table_naduvnoy', n: 'Надувной', e: '🪵', p: 200, w: 3, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/tables/стол_Надувной.webp' },
    { id: 'table_klava', n: 'Клавиатура', e: '🪵', p: 200, w: 3, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/tables/стол_Клавиатура.webp' },
    { id: 'table_khrupky', n: 'Хрупкий', e: '🪵', p: 200, w: 3, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/tables/стол_Хрупкий.webp' },
    { id: 'table_gorit', n: 'Горит', e: '🪵', p: 350, w: 3, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/tables/стол_Горит.webp' },
    { id: 'table_fd15', n: 'FD15.V12', e: '🪵', p: 350, w: 3, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/tables/стол_FD15.V12.webp' },
    { id: 'table_luxure', n: 'LУXУRE', e: '🪵', p: 600, w: 3, h: 2, surface: 'floor' as const, rarity: 'legendary', sprite: '/sprites/objects/tables/стол_LУXУRE.webp' },
  ],
  chairs: [
    { id: 'chair_raskladnoy', n: 'Раскладной', e: '🪑', p: 50, w: 2, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/chairs/Стул_Раскладной.webp' },
    { id: 'chair_fauteuil', n: 'Fauteuil', e: '🪑', p: 50, w: 2, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/chairs/Стул_Fauteuil.webp' },
    { id: 'chair_ofis', n: 'Офис', e: '🪑', p: 50, w: 2, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/chairs/Стул_Офис.webp' },
    { id: 'chair_detsky', n: 'Детский', e: '🪑', p: 50, w: 2, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/chairs/Стул_Детский.webp' },
    { id: 'chair_kreslo', n: 'Кресло', e: '🪑', p: 100, w: 2, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/chairs/Стул_Кресло.webp' },
    { id: 'chair_kolesami', n: 'сКолесами', e: '🪑', p: 100, w: 2, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/chairs/Стул_сКолесами.webp' },
    { id: 'chair_yaytso', n: 'Яйцо', e: '🪑', p: 200, w: 2, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/chairs/Стул_Яйцо.webp' },
    { id: 'chair_boss', n: 'Босс', e: '🪑', p: 200, w: 2, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/chairs/Стул_Босс.webp' },
    { id: 'chair_f2', n: 'Формула2', e: '🪑', p: 350, w: 2, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/chairs/Стул_Формула2.webp' },
    { id: 'chair_chuzhoy', n: 'Чужой', e: '🪑', p: 350, w: 2, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/chairs/Стул_Чужой.webp' },
    { id: 'chair_shar', n: 'Шар', e: '🪑', p: 350, w: 2, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/chairs/Стул_Шар.webp' },
  ],
  sofas: [
    { id: 'sofa_baza', n: 'База', e: '🛋️', p: 50, w: 3, h: 2, surface: 'floor' as const, rarity: 'common', sprite: '/sprites/objects/sofas/диван_База.webp' },
    { id: 'sofa_skameyka', n: 'Скамейка', e: '🛋️', p: 100, w: 3, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/sofas/диван_Скамейка.webp' },
    { id: 'sofa_avito', n: 'сАвито', e: '🛋️', p: 100, w: 3, h: 2, surface: 'floor' as const, rarity: 'uncommon', sprite: '/sprites/objects/sofas/диван_сАвито.webp' },
    { id: 'sofa_zheleyny', n: 'Желейный', e: '🛋️', p: 200, w: 3, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/sofas/диван_Желейный.webp' },
    { id: 'sofa_velosiped', n: 'Велосипед', e: '🛋️', p: 200, w: 3, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/sofas/диван_Велосипед.webp' },
    { id: 'sofaoblachko', n: 'Облачко', e: '🛋️', p: 200, w: 3, h: 2, surface: 'floor' as const, rarity: 'rare', sprite: '/sprites/objects/sofas/диван_Облачко.webp' },
    { id: 'sofa_uno', n: 'UNO', e: '🛋️', p: 350, w: 3, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/sofas/диван_UNO.webp', minigame: 'cardgame' as const },
    { id: 'sofa_malboro', n: 'Мальборо', e: '🛋️', p: 350, w: 3, h: 2, surface: 'floor' as const, rarity: 'epic', sprite: '/sprites/objects/sofas/диван_Мальборо.webp', minigame: 'smoke' as const },
    { id: 'sofa_f1', n: 'Формула1', e: '🛋️', p: 600, w: 3, h: 2, surface: 'floor' as const, rarity: 'legendary', sprite: '/sprites/objects/sofas/диван_Формула1.webp' },
  ],
  decorations: [
    { id: 'deco_taburety', n: 'Табуреты', e: '🪑', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/decorations/Украшения_Табуреты.webp' },
    { id: 'deco_korobka', n: 'Коробка', e: '📦', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/decorations/Украшения_Коробка.webp' },
    { id: 'deco_pivo', n: 'КоробкаПива', e: '🍺', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/decorations/Украшения_КоробкаПива.webp' },
    { id: 'deco_tsvetok', n: 'Цветок', e: '🌸', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/decorations/Украшения_Цветок.webp' },
    { id: 'deco_barnyy', n: 'Барныйстул', e: '🪑', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/decorations/Украшения_Барныйстул.webp' },
    { id: 'deco_trava', n: 'трава', e: '🌿', p: 100, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/decorations/Украшения_трава.webp' },
    { id: 'deco_dengi', n: 'Денежное', e: '💰', p: 100, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/decorations/Украшения_Денежное.webp' },
    { id: 'deco_bonsai', n: 'Бонсай', e: '🌿', p: 100, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/decorations/Украшения_Бонсай.webp' },
    { id: 'deco_ananas', n: 'ананас', e: '🍍', p: 100, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/decorations/Украшения_ананас.webp', minigame: 'cardgame' as const },
    { id: 'deco_kaktus', n: 'Кактус', e: '🌵', p: 100, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/decorations/Украшения_Кактус.webp' },
    { id: 'deco_formy', n: 'Формы', e: '🌿', p: 100, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/decorations/Украшения_Формы.webp' },
    { id: 'deco_skeyt', n: 'Скейт', e: '🛹', p: 200, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/decorations/Украшения_Скейт.webp' },
    { id: 'deco_ng', n: 'НГ', e: '🎄', p: 200, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/decorations/Украшения_НГ.webp' },
    { id: 'deco_kusaka', n: 'Кусака', e: '🐛', p: 200, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/decorations/Украшения_Кусака.webp' },
    { id: 'deco_totklient', n: 'ТотКлиент', e: '👤', p: 200, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/decorations/Украшения_ТотКлиент.webp' },
    { id: 'deco_chay', n: 'Чай', e: '🍵', p: 200, w: 1, h: 2, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/decorations/Украшения_Чай.webp' },
    { id: 'deco_okiya', n: 'Окия', e: '🃏', p: 350, w: 2, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'epic', sprite: '/sprites/objects/decorations/Украшение_Окия.webp', minigame: 'okiya' as const },
    { id: 'deco_svet', n: 'Свет', e: '💡', p: 350, w: 2, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'epic', sprite: '/sprites/objects/decorations/Украшение_Свет.webp' },
  ],
  windows: [
    { id: 'window_den', n: 'День', e: '🪟', p: 50, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Окно_День.webp' },
    { id: 'window_okno', n: 'Окно', e: '🪟', p: 50, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Окно_Окно.webp' },
    { id: 'window_vecher', n: 'Вечер', e: '🪟', p: 100, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/wall/Окно_Вечер.webp' },
    { id: 'window_noch', n: 'Ночь', e: '🪟', p: 100, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/wall/Окно_Ночь.webp' },
    { id: 'window_neblag', n: 'Неблагополучное', e: '🪟', p: 100, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/wall/Окно_Неблагополучное.webp' },
    { id: 'window_ratzilla', n: 'RATZILLA', e: '🪟', p: 200, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/wall/Окно_RATZILLA.webp' },
    { id: 'window_vuayerist', n: 'Вуайерист', e: '🪟', p: 200, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/wall/Окно_Вуайерист.webp' },
  ],
  cabinets: [
    { id: 'cab_mikro', n: 'Микроволновка', e: '📦', p: 50, w: 3, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Шкаф_Микроволновка.webp', minigame: 'microwave' as const },
    { id: 'cab_obycny', n: 'Обычный', e: '🗄️', p: 50, w: 3, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Шкаф_Обычный.webp' },
    { id: 'cab_biblio', n: 'Библиотека', e: '📚', p: 50, w: 3, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Шкаф_Библиотека.webp', minigame: 'book_prediction' as const },
    { id: 'cab_holod', n: 'Холодильник', e: '🧊', p: 100, w: 3, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/wall/Шкаф_Холодильник.webp' },
    { id: 'cab_dyrka', n: 'Дырка', e: '🕳️', p: 200, w: 3, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/wall/Шкаф_Дырка.webp' },
    { id: 'cab_holod1', n: 'Сейф', e: '🔐', p: 200, w: 3, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/wall/Шкаф_Холодильник-1.webp' },
  ],
  posters: [
    { id: 'poster_nosmoke', n: 'NOSMOKE', e: '🚫', p: 50, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Плакат_NOSMOKE.webp' },
    { id: 'poster_yeslove', n: 'YESLOVE', e: '❤️', p: 50, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Плакат_YESLOVE.webp' },
    { id: 'poster_chasy', n: 'Часы', e: '🕐', p: 50, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/Плакат_Часы.webp' },
    { id: 'poster_basketball', n: 'Баскетбол', e: '🏀', p: 100, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/wall/Плакат_Баскетбол.webp', minigame: 'basketball' as const },
    { id: 'poster_znamya', n: 'Знамя', e: '🏳️', p: 200, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/wall/Плакат_Знамя.webp' },
    { id: 'poster_korea', n: 'Корея', e: '🇰🇷', p: 200, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/wall/Плакат_Корея.webp' },
  ],
  signs: [
    { id: 'sign_alisa', n: 'Алиса', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Алиса.webp' },
    { id: 'sign_anya', n: 'Аня', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Аня.webp' },
    { id: 'sign_veronika', n: 'Вероника', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Вероника.webp' },
    { id: 'sign_diana', n: 'Диана', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Диана.webp' },
    { id: 'sign_imya1', n: 'ИМЯ1', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1.webp' },
    { id: 'sign_imya1_1', n: 'ИМЯ1-1', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-1.webp' },
    { id: 'sign_imya1_2', n: 'ИМЯ1-2', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-2.webp' },
    { id: 'sign_imya1_3', n: 'ИМЯ1-3', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-3.webp' },
    { id: 'sign_imya1_4', n: 'ИМЯ1-4', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-4.webp' },
    { id: 'sign_imya1_5', n: 'ИМЯ1-5', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-5.webp' },
    { id: 'sign_imya1_6', n: 'ИМЯ1-6', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-6.webp' },
    { id: 'sign_imya1_7', n: 'ИМЯ1-7', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_ИМЯ1-7.webp' },
    { id: 'sign_kirill', n: 'Кирилл', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Кирилл.webp' },
    { id: 'sign_sanya', n: 'Саня', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Саня.webp' },
    { id: 'sign_olesya', n: 'Олеся', e: '🏷️', p: 0, w: 2, h: 3, surface: 'wall' as const, noCollision: true, rarity: 'common', sprite: '/sprites/objects/wall/таблички/Плакат_Oлеся.webp' },
  ],
  carpets: [
    { id: 'carpet_sun', n: 'Солнце', e: '☀️', p: 100, w: 3, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/floor/ковры/Ковер_Солнце.webp' },
    { id: 'carpet_red', n: 'Красный', e: '🟥', p: 100, w: 3, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'uncommon', sprite: '/sprites/objects/floor/ковры/Ковер_красный.webp' },
    { id: 'carpet_rainbow', n: 'Радуга', e: '🌈', p: 200, w: 3, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/floor/ковры/Ковер_Радуга.webp' },
    { id: 'carpet_glitch', n: 'Глитч', e: '🟪', p: 200, w: 3, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/floor/ковры/Ковер_Глитч.webp' },
    { id: 'carpet_puddle', n: 'Лужа', e: '🟦', p: 200, w: 3, h: 3, surface: 'floor' as const, noCollision: true, rarity: 'rare', sprite: '/sprites/objects/floor/ковры/Ковер_Лужа.webp' },
  ],
  pets: [
    { id: 'pet_pony', n: 'Пони', e: '🐴', p: 350, w: 1, h: 1, surface: 'floor' as const, noCollision: true, rarity: 'epic', sprite: '/sprites/pets/pet1.webp', pet: true },
    { id: 'pet_sloth', n: 'Ленивец', e: '🦥', p: 350, w: 1, h: 1, surface: 'floor' as const, noCollision: true, rarity: 'epic', sprite: '/sprites/pets/pet2.webp', pet: true },
    { id: 'pet_lizard', n: 'Ящерица', e: '🦎', p: 350, w: 1, h: 1, surface: 'floor' as const, noCollision: true, rarity: 'epic', sprite: '/sprites/pets/pet3.webp', pet: true },
    { id: 'pet_cat', n: 'Кот', e: '🐱', p: 350, w: 1, h: 1, surface: 'floor' as const, noCollision: true, rarity: 'epic', sprite: '/sprites/pets/pet4.webp', pet: true },
    { id: 'pet_rat', n: 'Крыса', e: '🐀', p: 600, w: 1, h: 1, surface: 'floor' as const, noCollision: true, rarity: 'legendary', sprite: '/sprites/pets/petrat.webp', pet: true },
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
  { id: 'talk_3',  name: 'Болтун',       desc: 'Поговори с 3 ботами',               icon: '💬', target: 3, reward: 3 },
  { id: 'visit_2', name: 'Турист',       desc: 'Посети 2 разных комнаты',            icon: '🚶', target: 2, reward: 3 },
  { id: 'emoji_5', name: 'Эмодзи-кинг',  desc: 'Используй 5 эмодзи',                icon: '😀', target: 5, reward: 2 },
  { id: 'rps_3',   name: 'Игрок',        desc: 'Сыграй в КНБ 3 раза',               icon: '✊', target: 3, reward: 4 },
  { id: 'smoke_1', name: 'Расслабься',   desc: 'Сыграй в сигаретную через пепельницу', icon: '🚬', target: 1, reward: 3 },
];
