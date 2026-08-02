import { TILE } from './constants';

export interface InteractionZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  icon: string;
}

export const INTERACTION_ZONES: InteractionZone[] = [
  { id: 'ashtray', x: 37 * TILE, y: 16 * TILE, radius: TILE * 2.5, label: 'ПЕРЕКУР', icon: '🚬' },
  { id: 'bookshelf', x: 36 * TILE, y: 4 * TILE, radius: TILE * 2.5, label: 'ГРНУТЬ КНИГУ', icon: '📖' },
  { id: 'basketball', x: 5 * TILE, y: 11 * TILE, radius: TILE * 3, label: 'БАСКЕТБОЛ', icon: '🏀' },
  { id: 'microwave', x: 37 * TILE, y: 8 * TILE, radius: TILE * 1.5, label: 'МИКРОВОЛНОВКА', icon: '⏱️' },
  { id: 'furniture_toss', x: 39 * TILE, y: 9 * TILE, radius: TILE * 1.5, label: 'СВАЛКА МЕБЕЛИ', icon: '🪑' },
  { id: 'cardgame', x: 38 * TILE, y: 7 * TILE, radius: TILE * 2, label: 'ИГРАТЬ В OKIЯ', icon: '🃏' },
];

export function checkInteractions(px: number, py: number): InteractionZone | null {
  for (const zone of INTERACTION_ZONES) {
    const dx = px - zone.x;
    const dy = py - zone.y;
    if (Math.sqrt(dx * dx + dy * dy) < zone.radius) {
      return zone;
    }
  }
  return null;
}

export interface SmokingRecord {
  name: string;
  time: number;
  date: string;
}

const STORAGE_KEY = 'smoking_leaderboard';

export function getSmokingLeaderboard(): SmokingRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveSmokingRecord(name: string, timeMs: number) {
  const board = getSmokingLeaderboard();
  board.push({ name, time: timeMs, date: new Date().toISOString() });
  board.sort((a, b) => a.time - b.time);
  const top10 = board.slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
  return top10;
}

export const BOOK_PREDICTIONS: string[] = [
  'Клиент скажет "сделайте попроще", но будет прав',
  'Сегодня цвет дня — тот, который ты выбрал вчера',
  'Макет пройдёт с первого раза. Шучу, потребуется 47 правок',
  'Фрилансер из трёх разных стран пришлёт одно и то же',
  'Пиксель будет идеально выровнен... завтра',
  'Встреча продлится ровно столько, сколько нужно',
  'Новый тренд будет вдохновлён тем, что ты сделал год назад',
  'Кофе сегодня будет особенно бодрящим',
  'Мышка предскажет удачный выбор цветовой палитры',
  'Ты найдёшь идеальный шрифт в самое неожиданное время',
  'Клиент присшлёт референс из 2012 года и скажет "вот так"',
  'Дизайн-ревью пройдёт без единого замечания. Ахахаха',
  'Сегодня يوم, когда идеи льются как река',
  'Принт-скрин с макетом покажет бабушке — она одобрит',
  'Комплимент от коллеги усилит продуктивность на 200%',
  'Шрифт Comic Sans будет вдохновением. Для кого-то другого',
  'Презентация клиента будет на 47 слайдов длиннее, чем нужно',
  'Цвет #4ecca3 сегодня besonders магический',
  'Пиксель-перфекционист сегодня не будет ругаться',
  'Дизайнер и программист сегодня договорятся с первого раза',
];
