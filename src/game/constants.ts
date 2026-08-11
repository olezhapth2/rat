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
  ['Олег', 'Крыска', 'Код готов', 'Проверяю'],
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
    { id: 'table_bar', n: 'Бар', e: '🪵', p: 150, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Бар.webp' },
    { id: 'table_nakryty', n: 'Накрытый', e: '🪵', p: 180, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Накрытый.webp' },
    { id: 'table_khrupky', n: 'Хрупкий', e: '🪵', p: 120, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Хрупкий.webp' },
    { id: 'table_fd15', n: 'FD15.V12', e: '🪵', p: 160, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_FD15.V12.webp' },
    { id: 'table_prozrachny', n: 'Прозрачный', e: '🪵', p: 140, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Прозрачный.webp' },
    { id: 'table_gorit', n: 'Горит', e: '🪵', p: 170, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Горит.webp' },
    { id: 'table_pechatnik', n: 'Печатник', e: '🪵', p: 200, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Печатник.webp' },
    { id: 'table_klava', n: 'Клавиатура', e: '🪵', p: 190, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Клавиатура.webp' },
    { id: 'table_naduvnoy', n: 'Надувной', e: '🪵', p: 210, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Надувной.webp' },
    { id: 'table_luxure', n: 'LУXУRE', e: '🪵', p: 175, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_LУXУRE.webp' },
    { id: 'table_baza', n: 'База', e: '🪵', p: 165, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_База.webp' },
    { id: 'table_iris', n: 'Ирис', e: '🪵', p: 185, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_Ирис.webp' },
    { id: 'table_1999', n: '1999', e: '🪵', p: 130, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/tables/стол_1999.webp' },
  ],
  chairs: [
    { id: 'chair_boss', n: 'Босс', e: '🪑', p: 140, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Босс.webp' },
    { id: 'chair_kolesami', n: 'сКолесами', e: '🪑', p: 120, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_сКолесами.webp' },
    { id: 'chair_yaytso', n: 'Яйцо', e: '🪑', p: 110, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Яйцо.webp' },
    { id: 'chair_ofis', n: 'Офис', e: '🪑', p: 100, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Офис.webp' },
    { id: 'chair_detsky', n: 'Детский', e: '🪑', p: 80, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Детский.webp' },
    { id: 'chair_kreslo', n: 'Кресло', e: '🪑', p: 130, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Кресло.webp' },
    { id: 'chair_raskladnoy', n: 'Раскладной', e: '🪑', p: 90, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Раскладной.webp' },
    { id: 'chair_f2', n: 'Формула2', e: '🪑', p: 150, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Формула2.webp' },
    { id: 'chair_chuzhoy', n: 'Чужой', e: '🪑', p: 115, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Чужой.webp' },
    { id: 'chair_shar', n: 'Шар', e: '🪑', p: 105, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Шар.webp' },
    { id: 'chair_fauteuil', n: 'Fauteuil', e: '🪑', p: 125, w: 2, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/chairs/Стул_Fauteuil.webp' },
  ],
  sofas: [
    { id: 'sofa_zheleyny', n: 'Желейный', e: '🛋️', p: 200, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_Желейный.webp' },
    { id: 'sofa_baza', n: 'База', e: '🛋️', p: 220, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_База.webp' },
    { id: 'sofa_f1', n: 'Формула1', e: '🛋️', p: 210, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_Формула1.webp' },
    { id: 'sofa_velosiped', n: 'Велосипед', e: '🛋️', p: 180, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_Велосипед.webp' },
    { id: 'sofa_uno', n: 'UNO', e: '🛋️', p: 190, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_UNO.webp', minigame: 'cardgame' as const },
    { id: 'sofa_skameyka', n: 'Скамейка', e: '🛋️', p: 120, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_Скамейка.webp' },
    { id: 'sofa_avito', n: 'сАвито', e: '🛋️', p: 160, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_сАвито.webp' },
    { id: 'sofa_malboro', n: 'Мальборо', e: '🛋️', p: 170, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_Мальборо.webp', minigame: 'smoke' as const },
    { id: 'sofaoblachko', n: 'Облачко', e: '🛋️', p: 230, w: 3, h: 2, surface: 'floor' as const, sprite: '/sprites/objects/sofas/диван_Облачко.webp' },
  ],
  decorations: [
    { id: 'deco_formy', n: 'Формы', e: '🌿', p: 40, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Формы.webp' },
    { id: 'deco_bonsai', n: 'Бонсай', e: '🌿', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Бонсай.webp' },
    { id: 'deco_kusaka', n: 'Кусака', e: '🐛', p: 35, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Кусака.webp' },
    { id: 'deco_dengi', n: 'Денежное', e: '💰', p: 60, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Денежное.webp' },
    { id: 'deco_trava', n: 'трава', e: '🌿', p: 30, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_трава.webp' },
    { id: 'deco_ng', n: 'НГ', e: '🎄', p: 55, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_НГ.webp' },
    { id: 'deco_kaktus', n: 'Кактус', e: '🌵', p: 45, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Кактус.webp' },
    { id: 'deco_chay', n: 'Чай', e: '🍵', p: 35, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Чай.webp' },
    { id: 'deco_totklient', n: 'ТотКлиент', e: '👤', p: 40, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_ТотКлиент.webp' },
    { id: 'deco_taburety', n: 'Табуреты', e: '🪑', p: 45, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Табуреты.webp' },
    { id: 'deco_barnyy', n: 'Барныйстул', e: '🪑', p: 50, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Барныйстул.webp' },
    { id: 'deco_skeyt', n: 'Скейт', e: '🛹', p: 40, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Скейт.webp' },
    { id: 'deco_ananas', n: 'ананас', e: '🍍', p: 45, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_ананас.webp', minigame: 'cardgame' as const },
    { id: 'deco_tsvetok', n: 'Цветок', e: '🌸', p: 35, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Цветок.webp' },
    { id: 'deco_pivo', n: 'КоробкаПива', e: '🍺', p: 30, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_КоробкаПива.webp' },
    { id: 'deco_korobka', n: 'Коробка', e: '📦', p: 25, w: 1, h: 2, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшения_Коробка.webp' },
    { id: 'deco_okiya', n: 'Окия', e: '🃏', p: 50, w: 2, h: 3, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшение_Окия.webp', minigame: 'okiya' as const },
    { id: 'deco_svet', n: 'Свет', e: '💡', p: 60, w: 2, h: 3, surface: 'floor' as const, noCollision: true, sprite: '/sprites/objects/decorations/Украшение_Свет.webp' },
  ],
  windows: [
    { id: 'window_neblag', n: 'Неблагополучное', e: '🪟', p: 150, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_Неблагополучное.webp' },
    { id: 'window_noch', n: 'Ночь', e: '🪟', p: 160, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_Ночь.webp' },
    { id: 'window_vecher', n: 'Вечер', e: '🪟', p: 155, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_Вечер.webp' },
    { id: 'window_vuayerist', n: 'Вуайерист', e: '🪟', p: 170, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_Вуайерист.webp' },
    { id: 'window_okno', n: 'Окно', e: '🪟', p: 140, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_Окно.webp' },
    { id: 'window_ratzilla', n: 'RATZILLA', e: '🪟', p: 180, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_RATZILLA.webp' },
    { id: 'window_den', n: 'День', e: '🪟', p: 145, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Окно_День.webp' },
  ],
  cabinets: [
    { id: 'cab_obycny', n: 'Обычный', e: '🗄️', p: 200, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Шкаф_Обычный.webp' },
    { id: 'cab_holod1', n: 'Холодильник-1', e: '🧊', p: 220, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Шкаф_Холодильник-1.webp' },
    { id: 'cab_holod', n: 'Холодильник', e: '🧊', p: 210, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Шкаф_Холодильник.webp' },
    { id: 'cab_biblio', n: 'Библиотека', e: '📚', p: 190, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Шкаф_Библиотека.webp', minigame: 'book_prediction' as const },
    { id: 'cab_dyrka', n: 'Дырка', e: '🕳️', p: 160, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Шкаф_Дырка.webp' },
    { id: 'cab_mikro', n: 'Микроволновка', e: '📦', p: 180, w: 3, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Шкаф_Микроволновка.webp', minigame: 'microwave' as const },
  ],
  posters: [
    { id: 'poster_imya', n: 'ИМЯ1', e: '🖼️', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_ИМЯ1.webp' },
    { id: 'poster_znamya', n: 'Знамя', e: '🏳️', p: 85, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_Знамя.webp' },
    { id: 'poster_korea', n: 'Корея', e: '🇰🇷', p: 90, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_Корея.webp' },
    { id: 'poster_basketball', n: 'Баскетбол', e: '🏀', p: 95, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_Баскетбол.webp', minigame: 'basketball' as const },
    { id: 'poster_nosmoke', n: 'NOSMOKE', e: '🚫', p: 80, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_NOSMOKE.webp' },
    { id: 'poster_yeslove', n: 'YESLOVE', e: '❤️', p: 85, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_YESLOVE.webp' },
    { id: 'poster_chasy', n: 'Часы', e: '🕐', p: 90, w: 2, h: 3, surface: 'wall' as const, noCollision: true, sprite: '/sprites/objects/wall/Плакат_Часы.webp' },
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
