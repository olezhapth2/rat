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
  { id: 'ashtray', x: 36 * TILE, y: 16 * TILE, radius: TILE * 2.5, label: 'ПЕРЕКУР', icon: '🚬' },
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
