import { createPlayer, createBots, createObjects, buildMap, SHOP, ALL_ITEMS, TILE, SIDE_WALL_DEPTH, ROOMS, ROOM_CENTERS, BOT_PHRASES, BOT_REACTIONS, BOT_CONVERSATIONS, DAILY_QUESTS, OFFICE_EVENTS, getRoomAt, MAP_W, MAP_H } from './constants';
import type { Player, Bot, GameObject, Room, OfficeEvent } from './constants';
import { createAnimState, type AnimState } from './sprites';

const STORAGE_KEY = 'secretgang';

export interface Activity {
  icon: string;
  text: string;
  time: string;
}

export interface PlacedItem {
  id: string;
  x: number; // pixel position
  y: number; // pixel position
  surface: 'floor' | 'wall';
  placedBy: string; // player id
}

export interface GameState {
  player: Player & {
    name: string;
    av: string;
    color: string;
    role: string;
    coins: number;
    xp: number;
    level: number;
    daily: string | null;
    furniture: string[]; // owned item IDs (can buy multiples)
    myRoom: string[];
    placedItems: PlacedItem[];
    carrying: string | null; // item ID being carried (null = nothing)
    _dropPreview: { x: number; y: number; w: number; h: number } | null;
    activities: Activity[];
    achievements: string[];
    visitedRooms: string[];
    _lastEmoji: string | null;
    _emojiTime: number;
    charId: string;  // character sprite ID (e.g. 'pers1', 'pers2')
    hatId: string;   // hat sprite ID (e.g. 'none', 'hat0')
    anim: AnimState; // animation state (dir, frame, tick)
    petId: string | null; // active pet sprite ID (e.g. 'pet1')
    petX: number;
    petY: number;
    wallColor: string;
    doorName: string;
    petPetCount: number;
  };
  tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>;
  bots: Bot[];
  objects: GameObject[];
  map: number[][];
  bossCall: {
    active: boolean;
    timer: number;
    reward: number;
  };
  dailyQuests: {
    date: string;
    progress: Record<string, number>;
    claimed: string[];
  };
  botAnims: Record<string, AnimState>; // botId → animation state
  officeEvents: OfficeEventState;
  tilePaintMode: {
    active: boolean;
    type: 'floor' | 'wall';
    textureIndex: number;
    previewX: number; // tile X for preview
    previewY: number; // tile Y for preview
  } | null;
}

export interface OfficeEventState {
  activeEvent: OfficeEvent | null;
  lastCheckedMinute: number;
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
      xp: state.player.xp,
      level: state.player.level,
      name: state.player.name,
      av: state.player.av,
      role: state.player.role,
      furniture: state.player.furniture,
      myRoom: state.player.myRoom,
      placedItems: state.player.placedItems,
      achievements: state.player.achievements,
      charId: state.player.charId,
      hatId: state.player.hatId,
      petId: state.player.petId,
      wallColor: state.player.wallColor,
      doorName: state.player.doorName,
      petPetCount: state.player.petPetCount,
      tileOverrides: state.tileOverrides,
    })
  );
}

export function createInitialState(authUser?: { charId: string; name: string; color?: string; role?: string } | null): GameState {
  const saved = loadState();
  const today = new Date().toISOString().slice(0, 10);

  const charId = authUser?.charId || (saved?.charId as string) || 'pers4';
  const name = authUser?.name || (saved?.name as string) || 'Ты';
  const authColor = authUser?.color || '#4ecca3';
  const authRole = authUser?.role || 'Разработчик';

  const player = {
    ...createPlayer(),
    name,
    av: (saved?.av as string) || '🧑‍🚀',
    color: authColor,
    role: (saved?.role as string) || authRole,
    coins: (saved?.coins as number) ?? 100,
    xp: (saved?.xp as number) ?? 0,
    level: (saved?.level as number) ?? 1,
    daily: (saved?.daily as string) || null,
    furniture: (saved?.furniture as string[]) || [],
    myRoom: (saved?.myRoom as string[]) || [],
    placedItems: (saved?.placedItems as PlacedItem[]) || [],
    carrying: null as string | null,
    _dropPreview: null as { x: number; y: number; w: number; h: number } | null,
    activities: [] as Activity[],
    achievements: (saved?.achievements as string[]) || [],
    visitedRooms: ['hall'] as string[],
    _lastEmoji: null as string | null,
    _emojiTime: 0,
    charId,
    hatId: (saved?.hatId as string) || 'none',
    anim: createAnimState(),
    petId: 'pet1',
    petX: 0,
    petY: 0,
    wallColor: (saved?.wallColor as string) || '#2a2a4a',
    doorName: (saved?.doorName as string) || '',
    petPetCount: (saved?.petPetCount as number) ?? 0,
  };

  if (player.daily !== today) {
    player.daily = today;
    player.coins += 100;
  }

  const bots = createBots();
  const botAnims: Record<string, AnimState> = {};
  for (const b of bots) botAnims[b.id] = createAnimState();

  return {
    player,
    bots,
    objects: createObjects(),
    map: buildMap(),
    tileOverrides: (saved?.tileOverrides as Record<string, { type: 'floor' | 'wall'; textureIndex: number }>) || {},
    bossCall: { active: false, timer: 0, reward: 0 },
    dailyQuests: { date: today, progress: {}, claimed: [] },
    botAnims,
    officeEvents: { activeEvent: null, lastCheckedMinute: -1 },
    tilePaintMode: null,
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

  // Special handling for pets
  if (itemId.startsWith('pet')) {
    if (state.player.petId === itemId) return { ok: false, msg: 'Уже есть' };
    if (state.player.coins < item.p) return { ok: false, msg: 'Не хватает алт' };
    state.player.coins -= item.p;
    state.player.petId = itemId;
    persistState(state);
    return { ok: true, msg: `Куплено: ${item.e} ${item.n}` };
  }

  const inFurniture = state.player.furniture.filter(id => id === itemId).length;
  const inPlaced = state.player.placedItems.filter(pi => pi.id === itemId).length;
  const totalOwned = inFurniture + inPlaced;
  if (totalOwned > 0) return { ok: false, msg: 'Уже есть' };
  if (state.player.coins < item.p) return { ok: false, msg: 'Не хватает алт' };
  state.player.coins -= item.p;
  state.player.furniture.push(itemId);
  addXP(state, 5);
  persistState(state);
  return { ok: true, msg: `Куплено: ${item.e} ${item.n}` };
}

export function addCoins(state: GameState, amount: number) {
  state.player.coins += amount;
  if (state.player.coins >= 500) unlockAchievement(state, 'rich');
  persistState(state);
}

export function addXP(state: GameState, amount: number): void {
  state.player.xp += amount;
  const needed = state.player.level * 100;
  while (state.player.xp >= needed) {
    state.player.xp -= needed;
    state.player.level++;
    unlockAchievement(state, 'level_' + state.player.level);
    logActivity(state, '⭐', `Level ${state.player.level}!`);
  }
  persistState(state);
}

// === Item Pick Up / Drop ===
export function pickUpItem(state: GameState, itemIndex: number): { ok: boolean; msg: string } {
  if (state.player.carrying !== null) return { ok: false, msg: 'Уже держишь предмет' };
  if (itemIndex < 0 || itemIndex >= state.player.placedItems.length) return { ok: false, msg: 'Не найдено' };
  const item = state.player.placedItems[itemIndex];
  state.player.carrying = item.id;
  state.player.placedItems.splice(itemIndex, 1);
  logActivity(state, '📦', `Взял: ${getItemEmoji(item.id)}`);
  persistState(state);
  return { ok: true, msg: `Взял ${getItemEmoji(item.id)}` };
}

export function dropItem(state: GameState, x: number, y: number): { ok: boolean; msg: string } {
  if (state.player.carrying === null) return { ok: false, msg: 'Нечего бросать' };
  const itemId = state.player.carrying;
  const def = ALL_ITEMS.find(i => i.id === itemId);
  if (!def) return { ok: false, msg: 'Не найдено' };

  // Use drop preview position if available (more accurate)
  let finalX = x;
  let finalY = y;
  if (state.player._dropPreview) {
    finalX = state.player._dropPreview.x;
    finalY = state.player._dropPreview.y;
  }

  // For wall items, snap to nearest S tile
  if (def.surface === 'wall') {
    const snapped = snapToWall(state, finalX, finalY, def.w, def.h);
    if (!snapped) return { ok: false, msg: 'Нужна боковая стена!' };
    finalX = snapped.x;
    finalY = snapped.y;
  }

  // Check if placement is valid
  if (!canPlaceItem(state, def, finalX, finalY)) {
    return { ok: false, msg: 'Нельзя разместить здесь' };
  }

  state.player.placedItems.push({
    id: itemId,
    x: finalX,
    y: finalY,
    surface: def.surface,
    placedBy: 'player',
  });
  state.player.carrying = null;
  addXP(state, 5);
  logActivity(state, '📦', `Поставил: ${def.e}`);
  unlockAchievement(state, 'decorator');
  persistState(state);
  return { ok: true, msg: `Поставил ${def.e}` };
}

export function canPlaceItem(state: GameState, def: { w: number; h: number; surface: string }, x: number, y: number): boolean {
  const mapW = state.map[0]?.length || 0;
  const mapH = state.map.length;

  // Check bounds
  if (x < 0 || y < 0 || x + def.w * TILE > mapW * TILE || y + def.h * TILE > mapH * TILE) return false;

  // Check tiles under the item
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) {
      const gx = Math.floor((x + dx * TILE + TILE / 2) / TILE);
      const gy = Math.floor((y + dy * TILE + TILE / 2) / TILE);
      const tile = state.map[gy]?.[gx];
      // Floor items: top (h-1) rows must be on F, bottom 1 row can be F or S
      if (def.surface === 'wall') {
        if (tile !== 3) return false;
      } else {
        const isBottomRow = dy === def.h - 1;
        if (isBottomRow) {
          if (tile !== 1 && tile !== 3) return false;
        } else {
          if (tile !== 1) return false;
        }
      }
    }
  }

  // Check collision with existing placed items (lenient — allow overlap)
  for (const pi of state.player.placedItems) {
    const piDef = ALL_ITEMS.find(i => i.id === pi.id);
    if (!piDef) continue;
    if ((piDef as any).noCollision) continue;
    const margin = TILE * 0.3;
    if (
      x + margin < pi.x + piDef.w * TILE - margin &&
      x + def.w * TILE - margin > pi.x + margin &&
      y + margin < pi.y + piDef.h * TILE - margin &&
      y + def.h * TILE - margin > pi.y + margin
    ) return false;
  }

  // Check collision with furniture (lenient)
  for (const obj of state.objects) {
    if (!obj.solid || obj.noCollision) continue;
    const margin = TILE * 0.3;
    if (
      x + margin < obj.x + obj.w * TILE - margin &&
      x + def.w * TILE - margin > obj.x + margin &&
      y + margin < obj.y + obj.h * TILE - margin &&
      y + def.h * TILE - margin > obj.y + margin
    ) return false;
  }

  return true;
}

function snapToWall(state: GameState, x: number, y: number, w: number, h: number): { x: number; y: number } | null {
  // Find the best S-tile cluster for an item of w×h tiles
  const mapW = state.map[0]?.length || 0;
  const mapH = state.map.length;

  // Search around the drop position
  const centerGx = Math.floor(x / TILE);
  const centerGy = Math.floor(y / TILE);

  for (let r = 0; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const gx = centerGx + dx;
        const gy = centerGy + dy;

        // Try to place item starting at this tile
        let allWall = true;
        for (let iy = 0; iy < h && allWall; iy++) {
          for (let ix = 0; ix < w && allWall; ix++) {
            const tx = gx + ix;
            const ty = gy + iy;
            if (ty < 0 || ty >= mapH || tx < 0 || tx >= mapW) { allWall = false; break; }
            if (state.map[ty]?.[tx] !== 3) allWall = false;
          }
        }

        if (allWall) {
          return { x: gx * TILE, y: gy * TILE };
        }
      }
    }
  }

  // Fallback: find ANY single S tile nearby
  for (let r = 0; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = centerGx + dx;
        const cy = centerGy + dy;
        if (cy >= 0 && cy < mapH && cx >= 0 && cx < mapW && state.map[cy]?.[cx] === 3) {
          return { x: cx * TILE, y: cy * TILE };
        }
      }
    }
  }

  return null;
}

export function getItemEmoji(id: string): string {
  const item = ALL_ITEMS.find(i => i.id === id);
  return item?.e || '📦';
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
    addXP(state, 20);
  } else if (pc !== bc) {
    result = 'Ты проиграл!';
  }
  state.player.coins += reward;
  persistState(state);
  return { playerChoice: choices[pc], botChoice: choices[bc], result, reward };
}

// === Microwave Timing Game ===
// Player stops a spinning timer, closest to 5.000s wins
export function microwaveGame(state: GameState, stoppedAtMs: number): {
  stoppedAt: string;
  diff: number;
  result: string;
  reward: number;
} {
  const TARGET_MS = 5000; // 5 seconds in ms
  const diffMs = Math.abs(stoppedAtMs - TARGET_MS);
  const diffSec = diffMs / 1000;

  let result: string;
  let reward: number;

  if (diffSec < 0.3) {
    result = 'Идеально! 🔥';
    reward = 35;
  } else if (diffSec < 0.8) {
    result = 'Отлично! ⚡';
    reward = 25;
  } else if (diffSec < 1.5) {
    result = 'Неплохо 👍';
    reward = 15;
  } else if (diffSec < 3.0) {
    result = 'Можно лучше 😐';
    reward = 5;
  } else {
    result = 'Промах 😅';
    reward = 0;
  }

  state.player.coins += reward;
  persistState(state);

  const sec = (stoppedAtMs / 1000).toFixed(3);
  return { stoppedAt: `${sec}с`, diff: diffSec, result, reward };
}

export function updateBots(state: GameState, dt: number) {
  const { bots, map, objects, player } = state;
  const now = Date.now();

  for (const bot of bots) {
    if (bot.id === 'kryska') {
      updateKryska(bot, state, dt);
      continue;
    }

    // === 1. Proximity reaction to player ===
    const dxp = player.x - bot.x;
    const dyp = player.y - bot.y;
    const distToPlayer = Math.sqrt(dxp * dxp + dyp * dyp);

    if (distToPlayer < TILE * 3 && now - bot._emojiTime > 8000) {
      const reactions = BOT_REACTIONS[bot.id] || ['👋'];
      if (Math.random() < 0.01 * dt) {
        bot._emoji = reactions[Math.floor(Math.random() * reactions.length)];
        bot._emojiTime = now;
      }
    }

    // === 2. Room walking ===
    bot._roomTimer -= dt;
    if (bot._roomTimer <= 0 && !bot._targetRoomId) {
      // Pick a random room to visit (not always home)
      const visitRooms = ['hall', 'library', 'kitchen', 'office1', 'office2', 'office3', 'office4', 'office5', 'office6'];
      const target = visitRooms[Math.floor(Math.random() * visitRooms.length)];
      const center = ROOM_CENTERS[target];
      if (center) {
        bot._targetRoomId = target;
        bot.wanderTargetX = center.x + (Math.random() - 0.5) * TILE * 4;
        bot.wanderTargetY = center.y + (Math.random() - 0.5) * TILE * 4;
        bot._roomTimer = 300 + Math.random() * 400; // stay in room for 5-12 min
      }
    }

    // === 3. Wander to target ===
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
          bot._lastVx = (dx / dist) * 0.5;
          bot._lastVy = (dy / dist) * 0.5;
        } else {
          bot.wanderTargetX = null;
          bot.wanderTargetY = null;
          bot._targetRoomId = null;
          bot._lastVx = 0;
          bot._lastVy = 0;
        }
      } else {
        bot.wanderTargetX = null;
        bot.wanderTargetY = null;
        bot._lastVx = 0;
        bot._lastVy = 0;
        // Arrived at room — start room timer
        if (bot._targetRoomId) {
          bot.room = bot._targetRoomId;
          bot._roomTimer = 200 + Math.random() * 300;
          bot._targetRoomId = null;
        }
      }
    }

    // === 4. Bot-to-bot conversations ===
    if (Math.random() < 0.002 * dt && now - bot._speechTime > 15000) {
      for (const other of bots) {
        if (other.id === bot.id || other.id === 'kryska') continue;
        const dxo = other.x - bot.x;
        const dyo = other.y - bot.y;
        const distBetween = Math.sqrt(dxo * dxo + dyo * dyo);
        if (distBetween < TILE * 2) {
          // Find a conversation between these two
          const conv = BOT_CONVERSATIONS.find(
            (c) => (c[0] === bot.name && c[1] === other.name) || (c[0] === other.name && c[1] === bot.name)
          );
          if (conv) {
            bot._speechBubble = conv[2];
            bot._speechTime = now;
            other._speechBubble = conv[3];
            other._speechTime = now;
            break;
          }
        }
      }
    }

    // === 5. Random idle phrases ===
    if (Math.random() < 0.001 * dt && now - bot._speechTime > 20000) {
      const phrases = BOT_PHRASES[bot.id];
      if (phrases && Math.random() < 0.3) {
        bot._speechBubble = phrases[Math.floor(Math.random() * phrases.length)];
        bot._speechTime = now;
      }
    }

    // Decay speech/emoji
    if (now - bot._speechTime > 5000) bot._speechBubble = null;
    if (now - bot._emojiTime > 4000) bot._emoji = null;
  }
}

function updateKryska(bot: Bot, state: GameState, dt: number) {
  const now = Date.now();
  const player = state.player;
  bot._roomTimer -= dt;
  bot._stealCooldown -= dt;

  const dxp = player.x - bot.x;
  const dyp = player.y - bot.y;
  const distToPlayer = Math.sqrt(dxp * dxp + dyp * dyp);

  // If kryska has stolen coins — run away from player
  if (bot._stolenCoins > 0) {
    bot._chasingPlayer = true;

    // Chase timer: 5 seconds then give up
    bot._chaseTimer -= dt;
    if (bot._chaseTimer <= 0) {
      // Drop stolen coins (player gets them back)
      state.player.coins += bot._stolenCoins;
      logActivity(state, '🐀', `Крыска выбросила ${bot._stolenCoins} алт и убежала!`);
      bot._speechBubble = '*пиии!* 😰';
      bot._speechTime = now;
      bot._emoji = '💨';
      bot._emojiTime = now;
      bot._stolenCoins = 0;
      bot._chaseTimer = 0;
      bot._chasingPlayer = false;
      persistState(state);
      return;
    }

    // Flee from player
    const fleeX = bot.x - (dxp / (distToPlayer || 1)) * TILE * 15;
    const fleeY = bot.y - (dyp / (distToPlayer || 1)) * TILE * 15;
    const fdx = fleeX - bot.x;
    const fdy = fleeY - bot.y;
    const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
    if (fdist > 4) {
      const spd = 1.0 * bot._speedMultiplier * dt;
      const nx = bot.x + (fdx / fdist) * spd;
      const ny = bot.y + (fdy / fdist) * spd;
      if (canMoveBot(state.map, state.objects, nx, ny, bot.radius)) {
        bot.x = nx;
        bot.y = ny;
        bot._lastVx = (fdx / fdist) * 1.0;
        bot._lastVy = (fdy / fdist) * 1.0;
      }
    }

    // If player is far enough, eat the coins
    if (distToPlayer > TILE * 12) {
      bot._speechBubble = '*проглотила* 🧀';
      bot._speechTime = now;
      bot._emoji = '💀';
      bot._emojiTime = now;
      logActivity(state, '🐀', `Крыска съела ${bot._stolenCoins} алт!`);
      bot._stolenCoins = 0;
      bot._chaseTimer = 0;
      bot._chasingPlayer = false;
      persistState(state);
    }
    return;
  }

  // Kryska patrols between rooms
  if (bot._roomTimer <= 0) {
    const targets = [
      { x: 8 * TILE, y: 5 * TILE },
      { x: 18 * TILE, y: 14 * TILE },
      { x: 24 * TILE, y: 14 * TILE },
      { x: 36 * TILE, y: 5 * TILE },
      { x: 36 * TILE, y: 14 * TILE },
      { x: 30 * TILE, y: 14 * TILE },
      { x: 30 * TILE, y: 24 * TILE },
    ];
    const t = targets[Math.floor(Math.random() * targets.length)];
    bot.wanderTargetX = t.x;
    bot.wanderTargetY = t.y;
    bot._roomTimer = 60 + Math.random() * 120;
  }

  // Move toward target
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
        bot._lastVx = (dx / dist) * 0.8;
        bot._lastVy = (dy / dist) * 0.8;
      } else {
        bot.wanderTargetX = null;
        bot.wanderTargetY = null;
      }
    } else {
      bot.wanderTargetX = null;
      bot.wanderTargetY = null;
    }
  }

  // === Steal coins from nearby player ===
  if (distToPlayer < TILE * 2 && bot._stealCooldown <= 0 && state.player.coins > 0) {
    const stealAmount = Math.min(
      state.player.coins,
      10 + Math.floor(Math.random() * 40) // steal 10-50 coins
    );
    if (stealAmount > 0 && Math.random() < 0.3) {
      state.player.coins -= stealAmount;
      bot._stolenCoins = stealAmount;
      bot._chaseTimer = 5; // 5 seconds to chase
      bot._chasingPlayer = true;
      bot._speechBubble = '*ухватила!* 🐀';
      bot._speechTime = now;
      bot._emoji = '🧀';
      bot._emojiTime = now;
      bot._stealCooldown = 300;
      logActivity(state, '🐀', `Крыска украла ${stealAmount} алт!`);
      persistState(state);
    }
  }

  // Random emoji
  if (now - bot._emojiTime > 10000 && Math.random() < 0.005 * dt) {
    const emojis = ['🐀', '🧀', '👀', '💨'];
    bot._emoji = emojis[Math.floor(Math.random() * emojis.length)];
    bot._emojiTime = now;
  }

  // Decay
  if (now - bot._speechTime > 5000) bot._speechBubble = null;
  if (now - bot._emojiTime > 4000) bot._emoji = null;
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
    const t = map[gy]?.[gx];
    if (t === 2 || t === 0) return false;
    if (t === 3) {
      const below = map[gy + 1]?.[gx];
      if (below !== 1) return false;
    }
  }
  for (const obj of objects) {
    if (!obj.solid || obj.noCollision) continue;
    const objLeft = obj.x;
    const objRight = obj.x + obj.w * TILE;
    const objBottom = obj.y + obj.h * TILE;
    if (px + r <= objLeft || px - r >= objRight) continue;
    const solidTop = obj.y + (obj.h * TILE) * 0.5;
    const solidBottom = objBottom;
    if (py + r > solidTop && py < solidBottom) return false;
  }
  return true;
}

// === Boss Call Mechanic ===
let bossCallCooldown = 0;

export function updateBossCall(state: GameState, dt: number) {
  bossCallCooldown -= dt;
  if (bossCallCooldown > 0) return;
  bossCallCooldown = 99999;
}

export function triggerBossCall(state: GameState) {
  const reward = 30 + Math.floor(Math.random() * 40); // 30-70 coins
  state.bossCall = { active: true, timer: 60, reward }; // 60 sec to arrive
  bossCallCooldown = 600; // 10 min cooldown between calls
  logActivity(state, '👔', 'Босс вызывает в кабинет!');
}

export function checkBossCallReward(state: GameState) {
  if (!state.bossCall.active) return;

  const bossRoom = ROOMS.find(r => r.id === 'boss');
  if (!bossRoom) return;

  const gx = Math.floor(state.player.x / TILE);
  const gy = Math.floor(state.player.y / TILE);

  // Check if player is in boss room
  if (gx >= bossRoom.fx && gx < bossRoom.fx + bossRoom.fw && gy >= bossRoom.fy && gy < bossRoom.fy + bossRoom.fh) {
    // Arrived! Give reward
    addCoins(state, state.bossCall.reward);
    unlockAchievement(state, 'boss_meeting');
    logActivity(state, '👔', `Босс дал ${state.bossCall.reward} алт`);
    state.bossCall = { active: false, timer: 0, reward: 0 };
  }
}

export function updateBossCallTimer(state: GameState, dt: number) {
  if (!state.bossCall.active) return;
  state.bossCall.timer -= dt;
  if (state.bossCall.timer <= 0) {
    // Expired
    logActivity(state, '👔', 'Босс разочарован...');
    state.bossCall = { active: false, timer: 0, reward: 0 };
  }
}

// === Daily Quests ===
export function trackQuestProgress(state: GameState, questId: string, amount: number = 1) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyQuests.date !== today) {
    // Reset quests for new day
    state.dailyQuests = { date: today, progress: {}, claimed: [] };
  }
  if (!state.dailyQuests.progress[questId]) {
    state.dailyQuests.progress[questId] = 0;
  }
  state.dailyQuests.progress[questId] += amount;
  persistState(state);
}

export function claimQuestReward(state: GameState, questId: string): { ok: boolean; msg: string } {
  const quest = DAILY_QUESTS.find(q => q.id === questId);
  if (!quest) return { ok: false, msg: 'Не найдено' };
  if (state.dailyQuests.claimed.includes(questId)) return { ok: false, msg: 'Уже получено' };
  const progress = state.dailyQuests.progress[questId] || 0;
  if (progress < quest.target) return { ok: false, msg: 'Ещё не выполнено' };

  state.dailyQuests.claimed.push(questId);
  addCoins(state, quest.reward);
  logActivity(state, quest.icon, `Выполнил квест: ${quest.name}`);
  return { ok: true, msg: `+${quest.reward} алт!` };
}

export function getQuestProgress(state: GameState, questId: string): number {
  return state.dailyQuests.progress[questId] || 0;
}

// === Room Passive Income ===
let roomIncomeTimer = 0;

export function updateRoomIncome(state: GameState, dt: number) {
  roomIncomeTimer -= dt;
  if (roomIncomeTimer > 0) return;

  // Check which room player is in
  const gx = Math.floor(state.player.x / TILE);
  const gy = Math.floor(state.player.y / TILE);
  const room = getRoomAt(gx, gy);

  if (room) {
    let income = 0;
    switch (room.id) {
      case 'office1':
      case 'office2':
      case 'office3':
      case 'office4':
      case 'office5':
      case 'office6':
        income = 2; // Work in office
        break;
      case 'boss':
        income = 5; // Boss room pays more
        break;
      case 'hall':
        income = 1; // Hall
        break;
      case 'library':
        income = 3; // Reading = more income
        break;
      case 'kitchen':
        income = 1; // Kitchen breaks
        break;
    }

    if (income > 0) {
      addCoins(state, income);
      roomIncomeTimer = 120; // Every 2 minutes
    }
  }
}

// === Update pet following player ===
export function updatePet(state: GameState, dt: number) {
  const p = state.player;
  if (!p.petId) return;

  // Pet target: slightly behind and to the right of player
  const targetX = p.x - (p.vx !== 0 ? Math.sign(p.vx) * TILE * 1.2 : TILE * 0.8);
  const targetY = p.y + TILE * 0.6;

  // Smooth follow with delay
  const lerp = 0.06 * dt;
  p.petX += (targetX - p.petX) * lerp;
  p.petY += (targetY - p.petY) * lerp;
}

// === Convert PlacedItems to GameObjects for collision ===
export function getPlacedObjectsAsGameObjects(state: GameState): GameObject[] {
  return state.player.placedItems.map((pi, idx) => {
    const def = ALL_ITEMS.find(i => i.id === pi.id);
    return {
      id: `placed_${idx}_${pi.id}`,
      type: 'furniture',
      x: pi.x,
      y: pi.y,
      w: def?.w || 1,
      h: def?.h || 1,
      solid: !(def as any)?.noCollision,
      noCollision: !!(def as any)?.noCollision,
      color: def?.surface === 'wall' ? '#a0c4ff' : '#ffffff',
      label: def?.n || pi.id,
      room: 'placed',
      sprite: (def as any)?.sprite || undefined,
    };
  });
}

// === Update drop preview position ===
export function updateDropPreview(state: GameState, cursorWorldX?: number, cursorWorldY?: number) {
  if (!state.player.carrying) {
    state.player._dropPreview = null;
    return;
  }

  const def = ALL_ITEMS.find(i => i.id === state.player.carrying);
  if (!def) { state.player._dropPreview = null; return; }

  const px = cursorWorldX ?? state.player.x;
  const py = cursorWorldY ?? state.player.y;

  if (def.surface === 'wall') {
    // Wall items: snap to nearest S tile cluster from cursor position
    const snapped = snapToWall(state, px, py, def.w, def.h);
    if (snapped) {
      state.player._dropPreview = { x: snapped.x, y: snapped.y, w: def.w, h: def.h };
    } else {
      state.player._dropPreview = null;
    }
  } else {
    // Floor items: snap to cursor position, centered on cursor
    const dropX = px - (def.w * TILE) / 2;
    const dropY = py - (def.h * TILE) / 2;
    if (canPlaceItem(state, def, dropX, dropY)) {
      state.player._dropPreview = { x: dropX, y: dropY, w: def.w, h: def.h };
    } else {
      state.player._dropPreview = null;
    }
  }
}

export function checkOfficeEvents(state: GameState): void {
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  if (currentMinute === state.officeEvents.lastCheckedMinute) return;
  state.officeEvents.lastCheckedMinute = currentMinute;

  const event = OFFICE_EVENTS.find(e => {
    const eventStart = e.hour * 60 + e.minute;
    const eventEnd = eventStart + e.duration;
    return currentMinute >= eventStart && currentMinute < eventEnd;
  });

  if (event && state.officeEvents.activeEvent?.id !== event.id) {
    state.officeEvents.activeEvent = event;
    logActivity(state, event.icon, event.message);
    addXP(state, 5);
  } else if (!event && state.officeEvents.activeEvent) {
    state.officeEvents.activeEvent = null;
    logActivity(state, '⏰', 'Бонусное время окончено');
  }
}

export function takeBackFromKryska(state: GameState, kryskaId: string): { ok: boolean; msg: string } {
  const kryska = state.bots.find(b => b.id === kryskaId);
  if (!kryska || kryska._stolenCoins <= 0) return { ok: false, msg: 'Нечего отнимать' };

  const dx = state.player.x - kryska.x;
  const dy = state.player.y - kryska.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > TILE * 3) return { ok: false, msg: 'Слишком далеко!' };

  const coins = kryska._stolenCoins;
  state.player.coins += coins;
  kryska._stolenCoins = 0;
  kryska._chaseTimer = 0;
  kryska._chasingPlayer = false;
  kryska._speedMultiplier += 0.05; // +5% speed permanently
  kryska._speechBubble = '*пиии!* 😰';
  kryska._speechTime = Date.now();
  kryska._emoji = '😨';
  kryska._emojiTime = Date.now();
  logActivity(state, '🐀', `Отнял у крыски ${coins} алт!`);
  persistState(state);
  return { ok: true, msg: `Вернул ${coins} алт` };
}

// === Tile Painting ===
export function paintTile(state: GameState, tileX: number, tileY: number, type: 'floor' | 'wall', textureIndex: number): void {
  // Paint 3x3 block (texture is a 3x3 spritesheet)
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const x = tileX + dx;
      const y = tileY + dy;
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) {
        const tileType = state.map[y]?.[x];
        if (type === 'floor' && tileType === 1) {
          state.tileOverrides[`${x},${y}`] = { type, textureIndex };
        } else if (type === 'wall') {
          // Allow painting wall tiles (S=3, W=2) AND floor tiles (F=1) that are directly below a wall
          if (tileType === 3 || tileType === 2) {
            state.tileOverrides[`${x},${y}`] = { type, textureIndex };
          } else if (tileType === 1) {
            // Check if tile above is a wall — if so, paint this floor tile too
            const above = state.map[y - 1]?.[x];
            if (above === 3 || above === 2) {
              state.tileOverrides[`${x},${y}`] = { type, textureIndex };
            }
          }
        }
      }
    }
  }
  persistState(state);
}

export function removeTilePaint(state: GameState, tileX: number, tileY: number): void {
  // Remove 3x3 block
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      delete state.tileOverrides[`${tileX + dx},${tileY + dy}`];
    }
  }
  persistState(state);
}

// === Tile Paint Mode ===
export function enterTilePaintMode(state: GameState, type: 'floor' | 'wall', textureIndex: number): void {
  state.tilePaintMode = { active: true, type, textureIndex, previewX: -1, previewY: -1 };
}

export function exitTilePaintMode(state: GameState): void {
  state.tilePaintMode = null;
}

export function updateTilePaintPreview(state: GameState, tileX: number, tileY: number): void {
  if (state.tilePaintMode) {
    state.tilePaintMode.previewX = tileX;
    state.tilePaintMode.previewY = tileY;
  }
}

export function setTilePaintTexture(state: GameState, textureIndex: number): void {
  if (state.tilePaintMode) {
    state.tilePaintMode.textureIndex = textureIndex;
  }
}
