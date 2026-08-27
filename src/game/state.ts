import { createPlayer, createBots, createObjects, buildMap, SHOP, ALL_ITEMS, TILE, BOT_PHRASES, ALL_BOT_PHRASES, DEFAULT_BOT_PHRASES, BOT_REACTIONS, BOT_CONVERSATIONS, DAILY_QUESTS, MAP_W, MAP_H, canMove } from './constants';
import type { Player, Bot, GameObject } from './constants';
import { createAnimState, type AnimState } from './sprites';

const STORAGE_KEY = 'secretgang';

export interface Activity {
  icon: string;
  text: string;
  time: string;
  ts: number;
}

export interface PlacedItem {
  id: string;
  x: number; // pixel position
  y: number; // pixel position
  surface: 'floor' | 'wall';
  placedBy: string; // player id
  uid?: string;
}

export interface GameState {
  player: Player & {
    name: string;
    av: string;
    avatar: string;
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
    _lastEmoji: string | null;
    _emojiTime: number;
    charId: string;  // character sprite ID (e.g. 'pers1', 'pers2')
    hatId: string;   // hat sprite ID (e.g. 'none', 'hat0')
    anim: AnimState; // animation state (dir, frame, tick)
    wallColor: string;
    doorName: string;
    pets: string[];       // owned pet item IDs
    activePet: string | null; // currently active pet ID (null = none)
  };
  tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>;
  bots: Bot[];
  objects: GameObject[];
  map: number[][];

  dailyQuests: {
    date: string;
    progress: Record<string, number>;
    claimed: string[];
  };
  botAnims: Record<string, AnimState>;
  tilePaintMode: {
    active: boolean;
    type: 'floor' | 'wall';
    textureIndex: number;
    previewX: number;
    previewY: number;
  } | null;
  _placedItemsVersion: number;
}

function loadState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old tileOverrides format ("x,y" → "type:x,y")
      if (parsed.tileOverrides) {
        const newOverrides: Record<string, unknown> = {};
        let migrated = false;
        for (const [key, value] of Object.entries(parsed.tileOverrides)) {
          if (key.includes(':')) {
            newOverrides[key] = value;
          } else {
            migrated = true;
            const ov = value as { type: string; textureIndex: number };
            newOverrides[`${ov.type}:${key}`] = value;
          }
        }
        if (migrated) parsed.tileOverrides = newOverrides;
      }
      return parsed;
    }
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
      achievements: state.player.achievements,
      charId: state.player.charId,
      hatId: state.player.hatId,
      wallColor: state.player.wallColor,
      doorName: state.player.doorName,
      pets: state.player.pets,
      activePet: state.player.activePet,
    })
  );
}

export function createInitialState(authUser?: { charId: string; name: string; role?: string; avatar?: string } | null): GameState {
  const saved = loadState();
  const today = new Date().toISOString().slice(0, 10);

  const charId = authUser?.charId || (saved?.charId as string) || 'pers4';
  const name = authUser?.name || (saved?.name as string) || 'Ты';
  const authRole = authUser?.role || 'Разработчик';

  const player = {
    ...createPlayer(),
    name,
    av: (saved?.av as string) || '🧑‍🚀',
    avatar: (saved?.avatar as string) || authUser?.avatar || '',
    role: (saved?.role as string) || authRole,
    coins: (saved?.coins as number) ?? 100,
    xp: (saved?.xp as number) ?? 0,
    level: (saved?.level as number) ?? 1,
    daily: (saved?.daily as string) || null,
    furniture: (saved?.furniture as string[]) || [],
    myRoom: (saved?.myRoom as string[]) || [],
    placedItems: [] as PlacedItem[],
    carrying: null as string | null,
    _dropPreview: null as { x: number; y: number; w: number; h: number } | null,
    activities: [] as Activity[],
    achievements: (saved?.achievements as string[]) || [],
    _lastEmoji: null as string | null,
    _emojiTime: 0,
    charId,
    hatId: (saved?.hatId as string) || 'none',
    anim: createAnimState(),
    wallColor: (saved?.wallColor as string) || '#2a2a4a',
    doorName: (saved?.doorName as string) || '',
    pets: (saved?.pets as string[]) || [],
    activePet: (saved?.activePet as string) || null,
  };

  if (player.daily !== today) {
    player.daily = today;
  }

  const bots = createBots();
  const botAnims: Record<string, AnimState> = {};
  for (const b of bots) botAnims[b.id] = createAnimState();

  const tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }> = {};

  const state: GameState = {
    player,
    bots,
    objects: createObjects(),
    map: buildMap(),
    tileOverrides,

    dailyQuests: { date: today, progress: {}, claimed: [] },
    botAnims,
    tilePaintMode: null,
    _placedItemsVersion: 0,
  };

  return state;
}

export function persistState(state: GameState) {
  savePartial(state);
}

// Debounced persist for high-frequency sync events (items/tiles received on connect)
let persistTimer: ReturnType<typeof setTimeout> | null = null;
export function persistStateDebounced(state: GameState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => savePartial(state), 300);
}

export function buyItem(state: GameState, itemId: string): { ok: boolean; msg: string } {
  const item = Object.values(SHOP)
    .flat()
    .find((i) => i.id === itemId);
  if (!item) return { ok: false, msg: 'Не найдено' };

  if (state.player.coins < item.p) return { ok: false, msg: 'Не хватает алт' };
  state.player.coins -= item.p;

  if (item.pet) {
    state.player.pets.push(itemId);
    state.player.activePet = itemId;
  } else {
    state.player.furniture.push(itemId);
    state.player.carrying = itemId;
  }

  addXP(state, 5);
  persistState(state);
  return { ok: true, msg: `Куплено: ${item.e} ${item.n}` };
}

export function togglePet(state: GameState, petId: string): void {
  if (state.player.activePet === petId) {
    state.player.activePet = null;
  } else {
    state.player.activePet = petId;
  }
  persistState(state);
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
  state._placedItemsVersion++;
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
  state._placedItemsVersion++;

  // Push player out if they overlap with the placed item
  if (def.surface !== 'wall') {
    const itemLeft = finalX;
    const itemTop = finalY;
    const itemRight = finalX + def.w * TILE;
    const itemBottom = finalY + def.h * TILE;
    const px = state.player.x;
    const py = state.player.y;
    const playerR = TILE * 0.4;
    if (px + playerR > itemLeft && px - playerR < itemRight && py + playerR > itemTop && py - playerR < itemBottom) {
      // Push distances: how far to move player to exit the item
      const pushLeft = (px + playerR) - itemLeft;
      const pushRight = itemRight - (px - playerR);
      const pushUp = (py + playerR) - itemTop;
      const pushDown = itemBottom - (py - playerR);
      // Pick the shortest push
      const options = [
        { dist: pushLeft, dx: -pushLeft, dy: 0 },
        { dist: pushRight, dx: pushRight, dy: 0 },
        { dist: pushUp, dx: 0, dy: -pushUp },
        { dist: pushDown, dx: 0, dy: pushDown },
      ];
      options.sort((a, b) => a.dist - b.dist);
      state.player.x += options[0].dx;
      state.player.y += options[0].dy;
    }
  }

  state.player.carrying = null;
  addXP(state, 5);
  logActivity(state, '📦', `Поставил: ${def.e}`);
  unlockAchievement(state, 'decorator');
  persistState(state);
  return { ok: true, msg: `Поставил ${def.e}` };
}

export function canPlaceItem(state: GameState, def: { w: number; h: number; surface: string; noCollision?: boolean }, x: number, y: number): boolean {
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

  // noCollision items (carpets) can be placed under other items
  if (!def.noCollision) {
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
  state.player.activities.unshift({ icon, text, time: now, ts: Date.now() });
  if (state.player.activities.length > 50) state.player.activities.pop();
}

export function unlockAchievement(state: GameState, id: string): string | null {
  if (state.player.achievements.includes(id)) return null;
  state.player.achievements.push(id);
  persistState(state);
  return id;
}

export function rpsGame(state: GameState, playerChoiceIdx?: number): {
  playerChoice: string;
  botChoice: string;
  result: string;
  reward: number;
} {
  const choices = ['✊', '✋', '✌️'];
  const pc = playerChoiceIdx !== undefined ? playerChoiceIdx : Math.floor(Math.random() * 3);
  const bc = Math.floor(Math.random() * 3);
  let result = 'Ничья!';
  let reward = 0;
  if ((pc === 0 && bc === 2) || (pc === 1 && bc === 0) || (pc === 2 && bc === 1)) {
    result = 'Ты выиграл!';
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
    reward = 0;
  } else if (diffSec < 0.8) {
    result = 'Отлично! ⚡';
    reward = 0;
  } else if (diffSec < 1.5) {
    result = 'Неплохо 👍';
    reward = 0;
  } else if (diffSec < 3.0) {
    result = 'Можно лучше 😐';
    reward = 0;
  } else {
    result = 'Промах 😅';
    reward = 0;
  }

  state.player.coins += reward;
  persistState(state);

  const sec = (stoppedAtMs / 1000).toFixed(3);
  return { stoppedAt: `${sec}с`, diff: diffSec, result, reward };
}

export function updateBots(state: GameState, dt: number, onlineCharIds?: Set<string>) {
  const { bots, map, objects, player } = state;
  const now = Date.now();

  for (const bot of bots) {
    // Skip bots for online players (player is connected → no bot needed)
    if (onlineCharIds && onlineCharIds.has(bot.spriteId)) continue;

    if (bot.id === 'bot_kryska') {
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

    // === 2. Random wandering ===
    bot._roomTimer -= dt;
    if (bot._roomTimer <= 0 && !bot._targetRoomId) {
      // Pick a random walkable tile on the map
      for (let attempt = 0; attempt < 20; attempt++) {
        const rx = Math.floor(Math.random() * MAP_W);
        const ry = Math.floor(Math.random() * MAP_H);
        if (map[ry]?.[rx] === 1) {
          bot.wanderTargetX = rx * TILE + TILE / 2;
          bot.wanderTargetY = ry * TILE + TILE / 2;
          bot._roomTimer = 200 + Math.random() * 400;
          break;
        }
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
        if (canMove(map, objects, nx, ny, bot.radius)) {
          bot.x = nx;
          bot.y = ny;
          bot._lastVx = (dx / dist) * 0.5;
          bot._lastVy = (dy / dist) * 0.5;
          bot._stuckFrames = 0;
        } else {
          bot._stuckFrames++;
          // If stuck for too long, teleport to a walkable tile
          if (bot._stuckFrames > 60) {
            for (let attempt = 0; attempt < 30; attempt++) {
              const rx = Math.floor(Math.random() * MAP_W);
              const ry = Math.floor(Math.random() * MAP_H);
              if (map[ry]?.[rx] === 1 && canMove(map, objects, rx * TILE + TILE / 2, ry * TILE + TILE / 2, bot.radius)) {
                bot.x = rx * TILE + TILE / 2;
                bot.y = ry * TILE + TILE / 2;
                bot._stuckFrames = 0;
                break;
              }
            }
          }
          bot.wanderTargetX = null;
          bot.wanderTargetY = null;
          bot._lastVx = 0;
          bot._lastVy = 0;
        }
      } else {
        bot.wanderTargetX = null;
        bot.wanderTargetY = null;
        bot._lastVx = 0;
        bot._lastVy = 0;
        bot._roomTimer = 200 + Math.random() * 300;
      }
    } else {
      // No target — check if stuck in a wall (can't move in any direction)
      if (!canMove(map, objects, bot.x + TILE, bot.y, bot.radius) &&
          !canMove(map, objects, bot.x - TILE, bot.y, bot.radius) &&
          !canMove(map, objects, bot.x, bot.y + TILE, bot.radius) &&
          !canMove(map, objects, bot.x, bot.y - TILE, bot.radius)) {
        bot._stuckFrames++;
        if (bot._stuckFrames > 30) {
          for (let attempt = 0; attempt < 30; attempt++) {
            const rx = Math.floor(Math.random() * MAP_W);
            const ry = Math.floor(Math.random() * MAP_H);
            if (map[ry]?.[rx] === 1 && canMove(map, objects, rx * TILE + TILE / 2, ry * TILE + TILE / 2, bot.radius)) {
              bot.x = rx * TILE + TILE / 2;
              bot.y = ry * TILE + TILE / 2;
              bot._stuckFrames = 0;
              break;
            }
          }
        }
      } else {
        bot._stuckFrames = 0;
      }
    }

    // === 4. Bot-to-bot conversations ===
    if (Math.random() < 0.002 * dt && now - bot._speechTime > 15000) {
      for (const other of bots) {
        if (other.id === bot.id || other.id === 'bot_kryska') continue;
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
    if (bot.id !== 'bot_kryska' && Math.random() < 0.003 * dt && now - bot._speechTime > 30000) {
      bot._speechBubble = ALL_BOT_PHRASES[Math.floor(Math.random() * ALL_BOT_PHRASES.length)];
      bot._speechTime = now;
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

  // If kryska has stolen coins — run away then wander until caught
  if (bot._stolenCoins > 0) {
    bot._chasingPlayer = true;
    const elapsedSinceSteal = now - bot._stealTime;

    // Auto-catch: only after 2 seconds grace period
    if (elapsedSinceSteal > 2000 && distToPlayer < TILE * 1.5) {
      const coins = bot._stolenCoins;
      state.player.coins += coins;
      logActivity(state, '🐀', `Крыска выронила ${coins} алт!`);
      bot._speechBubble = '*пиии!* 😰';
      bot._speechTime = now;
      bot._emoji = '😨';
      bot._emojiTime = now;
      bot._stolenCoins = 0;
      bot._chaseTimer = 0;
      bot._chasingPlayer = false;
      bot._stealTime = 0;
      persistState(state);
      return;
    }

    // Phase 1 (0-5s): flee from player at 2x speed
    // Phase 2 (5s+): wander randomly, don't seek anyone
    if (elapsedSinceSteal < 5000) {
      // Flee from player
      const fleeMultiplier = 2.0;
      const fleeX = bot.x - (dxp / (distToPlayer || 1)) * TILE * 15;
      const fleeY = bot.y - (dyp / (distToPlayer || 1)) * TILE * 15;
      const fdx = fleeX - bot.x;
      const fdy = fleeY - bot.y;
      const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
      if (fdist > 4) {
        const spd = fleeMultiplier * bot._speedMultiplier * dt;
        const nx = bot.x + (fdx / fdist) * spd;
        const ny = bot.y + (fdy / fdist) * spd;
        if (canMove(state.map, state.objects, nx, ny, bot.radius)) {
          bot.x = nx;
          bot.y = ny;
          bot._lastVx = (fdx / fdist) * 1.0;
          bot._lastVy = (fdy / fdist) * 1.0;
        }
      }
    } else {
      // Wander randomly while holding stolen coins
      if (bot._roomTimer <= 0) {
        const targets = [
          { x: 8 * TILE, y: 5 * TILE },
          { x: 18 * TILE, y: 14 * TILE },
          { x: 24 * TILE, y: 14 * TILE },
          { x: 36 * TILE, y: 5 * TILE },
          { x: 36 * TILE, y: 14 * TILE },
          { x: 15 * TILE, y: 30 * TILE },
          { x: 4 * TILE, y: 30 * TILE },
        ];
        const t = targets[Math.floor(Math.random() * targets.length)];
        bot.wanderTargetX = t.x;
        bot.wanderTargetY = t.y;
        bot._roomTimer = 40 + Math.random() * 60;
      }
      if (bot.wanderTargetX !== null && bot.wanderTargetY !== null) {
        const dx = bot.wanderTargetX - bot.x;
        const dy = bot.wanderTargetY - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 4) {
          const spd = 0.6 * dt;
          const nx = bot.x + (dx / dist) * spd;
          const ny = bot.y + (dy / dist) * spd;
          if (canMove(state.map, state.objects, nx, ny, bot.radius)) {
            bot.x = nx;
            bot.y = ny;
            bot._lastVx = (dx / dist) * 0.6;
            bot._lastVy = (dy / dist) * 0.6;
          } else {
            bot.wanderTargetX = null;
            bot.wanderTargetY = null;
            bot._roomTimer = 0;
          }
        } else {
          bot.wanderTargetX = null;
          bot.wanderTargetY = null;
        }
      }
    }

    return;
  }

  // === No stolen coins — actively seek the player ===
  if (bot._stealCooldown <= 0 && state.player.coins > 0) {
    // Move toward the player
    const spd = 0.7 * dt;
    const nx = bot.x + (dxp / (distToPlayer || 1)) * spd;
    const ny = bot.y + (dyp / (distToPlayer || 1)) * spd;
    if (canMove(state.map, state.objects, nx, ny, bot.radius)) {
      bot.x = nx;
      bot.y = ny;
      bot._lastVx = (dxp / (distToPlayer || 1)) * 0.7;
      bot._lastVy = (dyp / (distToPlayer || 1)) * 0.7;
    }
  } else {
    // On cooldown — patrol between rooms
    if (bot._roomTimer <= 0) {
      const targets = [
        { x: 8 * TILE, y: 5 * TILE },
        { x: 18 * TILE, y: 14 * TILE },
        { x: 24 * TILE, y: 14 * TILE },
        { x: 36 * TILE, y: 5 * TILE },
        { x: 36 * TILE, y: 14 * TILE },
        { x: 30 * TILE, y: 14 * TILE },
        { x: 15 * TILE, y: 30 * TILE },
        { x: 4 * TILE, y: 30 * TILE },
      ];
      const t = targets[Math.floor(Math.random() * targets.length)];
      bot.wanderTargetX = t.x;
      bot.wanderTargetY = t.y;
      bot._roomTimer = 60 + Math.random() * 120;
    }

    // Move toward patrol target
    if (bot.wanderTargetX !== null && bot.wanderTargetY !== null) {
      const dx = bot.wanderTargetX - bot.x;
      const dy = bot.wanderTargetY - bot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 4) {
        const spd = 0.8 * dt;
        const nx = bot.x + (dx / dist) * spd;
        const ny = bot.y + (dy / dist) * spd;
        if (canMove(state.map, state.objects, nx, ny, bot.radius)) {
          bot.x = nx;
          bot.y = ny;
          bot._lastVx = (dx / dist) * 0.8;
          bot._lastVy = (dy / dist) * 0.8;
        } else {
          bot.wanderTargetX = null;
          bot.wanderTargetY = null;
          bot._roomTimer = 0;
        }
      } else {
        bot.wanderTargetX = null;
        bot.wanderTargetY = null;
      }
    }
  }

  // === Steal coins from nearby player ===
  if (bot._stolenCoins === 0 && bot._pendingSteal === false && distToPlayer < TILE * 2 && bot._stealCooldown <= 0 && state.player.coins > 0) {
    bot._pendingSteal = true;
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
  logActivity(state, quest.icon, `Выполнил квест: ${quest.name}`);
  return { ok: true, msg: `Квест выполнен!` };
}

export function getQuestProgress(state: GameState, questId: string): number {
  return state.dailyQuests.progress[questId] || 0;
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
      sprite: (def as any)?.sprite || undefined,
      surface: def?.surface || 'floor',
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
  kryska._stealTime = 0;
  kryska._speechBubble = '*пиии!* 😰';
  kryska._speechTime = Date.now();
  kryska._emoji = '😨';
  kryska._emojiTime = Date.now();
  logActivity(state, '🐀', `Отнял у крыски ${coins} алт!`);
  persistState(state);
  return { ok: true, msg: `Вернул ${coins} алт` };
}

// === Tile Painting ===

/** Find any S=3 tile near (tileX, tileY). No 3×3 requirement. */
export function findWallSnap(map: number[][], tileX: number, tileY: number): { x: number; y: number } | null {
  for (let r = 0; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const gx = tileX + dx;
        const gy = tileY + dy;
        if (gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W) continue;
        if (map[gy]?.[gx] === 3) return { x: gx, y: gy };
      }
    }
  }
  return null;
}

/** Find any F=1 or S=3 tile near (tileX, tileY). No 3×3 requirement. */
export function findFloorSnap(map: number[][], tileX: number, tileY: number): { x: number; y: number } | null {
  for (let r = 0; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const gx = tileX + dx;
        const gy = tileY + dy;
        if (gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W) continue;
        const t = map[gy]?.[gx];
        if (t === 1 || t === 3) return { x: gx, y: gy };
      }
    }
  }
  return null;
}

export function paintTile(state: GameState, tileX: number, tileY: number, type: 'floor' | 'wall', textureIndex: number): void {
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const x = tileX + dx;
      const y = tileY + dy;
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) {
        const tileType = state.map[y]?.[x];
        const key = `${type}:${x},${y}`;
        if (type === 'floor' && (tileType === 1 || tileType === 3)) {
          state.tileOverrides[key] = { type, textureIndex };
        } else if (type === 'wall' && tileType === 3) {
          state.tileOverrides[key] = { type, textureIndex };
        }
      }
    }
  }
  persistState(state);
}

export function removeTilePaint(state: GameState, tileX: number, tileY: number, type: 'floor' | 'wall'): void {
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const key = `${type}:${tileX + dx},${tileY + dy}`;
      delete state.tileOverrides[key];
    }
  }
  persistState(state);
}

export function resetAllTileOverrides(state: GameState): void {
  state.tileOverrides = {};
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
