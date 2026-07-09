import { createPlayer, createBots, createObjects, buildMap, SHOP, TILE } from './constants';
import type { Player, Bot, GameObject, Room } from './constants';

const STORAGE_KEY = 'secretgang';

export interface Activity {
  icon: string;
  text: string;
  time: string;
}

export interface PlacedItem {
  id: string;
  gx: number;
  gy: number;
}

export interface GameState {
  player: Player & {
    name: string;
    av: string;
    color: string;
    role: string;
    coins: number;
    daily: string | null;
    furniture: string[];
    myRoom: string[];
    placedItems: PlacedItem[];
    activities: Activity[];
    achievements: string[];
    visitedRooms: string[];
    _lastEmoji: string | null;
    _emojiTime: number;
  };
  bots: Bot[];
  objects: GameObject[];
  map: number[][];
}

function loadState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function savePartial(state: GameState) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      coins: state.player.coins,
      name: state.player.name,
      av: state.player.av,
      role: state.player.role,
      furniture: state.player.furniture,
      myRoom: state.player.myRoom,
      placedItems: state.player.placedItems,
      achievements: state.player.achievements,
    })
  );
}

export function createInitialState(): GameState {
  const saved = loadState();
  const today = new Date().toISOString().slice(0, 10);

  const player = {
    ...createPlayer(),
    name: (saved?.name as string) || 'Ты',
    av: (saved?.av as string) || '🧑‍🚀',
    color: '#4ecca3',
    role: (saved?.role as string) || 'Разработчик',
    coins: (saved?.coins as number) ?? 100,
    daily: (saved?.daily as string) || null,
    furniture: (saved?.furniture as string[]) || [],
    myRoom: (saved?.myRoom as string[]) || [],
    placedItems: (saved?.placedItems as PlacedItem[]) || [],
    activities: [] as Activity[],
    achievements: (saved?.achievements as string[]) || [],
    visitedRooms: ['lobby'] as string[],
    _lastEmoji: null as string | null,
    _emojiTime: 0,
  };

  if (player.daily !== today) {
    player.daily = today;
    player.coins += 100;
  }

  return {
    player,
    bots: createBots(),
    objects: createObjects(),
    map: buildMap(),
  };
}

export function persistState(state: GameState) {
  savePartial(state);
}

export function buyItem(state: GameState, itemId: string): { ok: boolean; msg: string } {
  const item = Object.values(SHOP)
    .flat()
    .find((i) => i.id === itemId);
  if (!item) return { ok: false, msg: 'Не найдено' };
  if (state.player.furniture.includes(itemId)) return { ok: false, msg: 'Уже есть' };
  if (state.player.coins < item.p) return { ok: false, msg: 'Не хватает алт' };
  state.player.coins -= item.p;
  state.player.furniture.push(itemId);
  persistState(state);
  return { ok: true, msg: `Куплено: ${item.e} ${item.n}` };
}

export function addCoins(state: GameState, amount: number) {
  state.player.coins += amount;
  persistState(state);
}

export function logActivity(state: GameState, icon: string, text: string) {
  const now = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  state.player.activities.unshift({ icon, text, time: now });
  if (state.player.activities.length > 50) state.player.activities.pop();
}

export function unlockAchievement(state: GameState, id: string): string | null {
  if (state.player.achievements.includes(id)) return null;
  state.player.achievements.push(id);
  persistState(state);
  return id;
}

export function rpsGame(state: GameState): {
  playerChoice: string;
  botChoice: string;
  result: string;
  reward: number;
} {
  const choices = ['✊', '✋', '✌️'];
  const pc = Math.floor(Math.random() * 3);
  const bc = Math.floor(Math.random() * 3);
  let result = 'Ничья!';
  let reward = 0;
  if ((pc === 0 && bc === 2) || (pc === 1 && bc === 0) || (pc === 2 && bc === 1)) {
    result = 'Ты выиграл!';
    reward = 20;
  } else if (pc !== bc) {
    result = 'Ты проиграл!';
  }
  state.player.coins += reward;
  persistState(state);
  return { playerChoice: choices[pc], botChoice: choices[bc], result, reward };
}

export function updateBots(state: GameState, dt: number) {
  const { bots, map, objects, player } = state;

  for (const bot of bots) {
    if (bot.id === 'kryska') {
      updateKryska(bot, state, dt);
      continue;
    }

    bot.wanderTimer -= dt;

    if (bot.wanderTimer <= 0) {
      const room = state.map
        ? { x: Math.floor(bot.x / TILE), y: Math.floor(bot.y / TILE) }
        : null;

      if (room) {
        const wanderDist = 3 + Math.floor(Math.random() * 4);
        const dx = Math.floor(Math.random() * wanderDist * 2) - wanderDist;
        const dy = Math.floor(Math.random() * wanderDist * 2) - wanderDist;
        bot.wanderTargetX = (room.x + dx) * TILE + TILE / 2;
        bot.wanderTargetY = (room.y + dy) * TILE + TILE / 2;
      }
      bot.wanderTimer = 120 + Math.random() * 180;
    }

    if (bot.wanderTargetX !== null && bot.wanderTargetY !== null) {
      const dx = bot.wanderTargetX - bot.x;
      const dy = bot.wanderTargetY - bot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 4) {
        const spd = 0.5 * dt;
        const nx = bot.x + (dx / dist) * spd;
        const ny = bot.y + (dy / dist) * spd;
        if (canMoveBot(map, objects, nx, ny, bot.radius)) {
          bot.x = nx;
          bot.y = ny;
        } else {
          bot.wanderTargetX = null;
          bot.wanderTargetY = null;
        }
      } else {
        bot.wanderTargetX = null;
        bot.wanderTargetY = null;
      }
    }
  }
}

function updateKryska(bot: Bot, state: GameState, dt: number) {
  bot.wanderTimer -= dt;

  if (bot.wanderTimer <= 0) {
    const targets = [
      { x: 8 * TILE, y: 24 * TILE },
      { x: 6 * TILE, y: 22 * TILE },
      { x: 10 * TILE, y: 26 * TILE },
      { x: 28 * TILE, y: 24 * TILE },
      { x: 48 * TILE, y: 24 * TILE },
    ];
    const t = targets[Math.floor(Math.random() * targets.length)];
    bot.wanderTargetX = t.x;
    bot.wanderTargetY = t.y;
    bot.wanderTimer = 60 + Math.random() * 120;
  }

  if (bot.wanderTargetX !== null && bot.wanderTargetY !== null) {
    const dx = bot.wanderTargetX - bot.x;
    const dy = bot.wanderTargetY - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      const spd = 0.8 * dt;
      const nx = bot.x + (dx / dist) * spd;
      const ny = bot.y + (dy / dist) * spd;
      if (canMoveBot(state.map, state.objects, nx, ny, bot.radius)) {
        bot.x = nx;
        bot.y = ny;
      } else {
        bot.wanderTargetX = null;
        bot.wanderTargetY = null;
      }
    } else {
      bot.wanderTargetX = null;
      bot.wanderTargetY = null;
    }
  }
}

function canMoveBot(map: number[][], objects: GameObject[], px: number, py: number, radius: number): boolean {
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
    if (gy < 0 || gy >= map.length || gx < 0 || gx >= (map[0]?.length || 0)) return false;
    if (map[gy]?.[gx] === 2 || map[gy]?.[gx] === 3) return false;
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
