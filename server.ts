import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { type CardGameState, createGame, joinGame, playCard, drawCard } from './src/game/cardgame';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

// === Persistence ===
const DATA_DIR = join(process.cwd(), '.game-data');
const STATE_FILE = join(DATA_DIR, 'game-state.json');
const PLAYERS_FILE = join(DATA_DIR, 'players.json');

interface PersistedState {
  tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>;
  sharedItems: Array<{ id: string; x: number; y: number; w: number; h: number; color?: string }>;
  whiteboardData: string;
}

interface PlayerData {
  name: string;
  charId: string;
  hatId: string;
  coins: number;
  xp: number;
  level: number;
  furniture: string[];
  placedItems: Array<{ id: string; x: number; y: number; surface: 'floor' | 'wall'; placedBy: string }>;
  achievements: string[];
  petId: string;
  petPetCount: number;
  wallColor: string;
  doorName: string;
  av: string;
  role: string;
  visitedRooms: string[];
  dailyQuests: { date: string; progress: Record<string, number>; claimed: string[] };
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    const fs = require('fs');
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState(): PersistedState {
  ensureDataDir();
  try {
    if (existsSync(STATE_FILE)) {
      const raw = readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Data] Failed to load state:', e);
  }
  return { tileOverrides: {}, sharedItems: [], whiteboardData: '' };
}

function saveState(state: PersistedState) {
  ensureDataDir();
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[Data] Failed to save state:', e);
  }
}

function loadPlayers(): Record<string, PlayerData> {
  ensureDataDir();
  try {
    if (existsSync(PLAYERS_FILE)) {
      const raw = readFileSync(PLAYERS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Data] Failed to load players:', e);
  }
  return {};
}

function savePlayers(players: Record<string, PlayerData>) {
  ensureDataDir();
  try {
    writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
  } catch (e) {
    console.error('[Data] Failed to save players:', e);
  }
}

// Load persisted data
const persistedState = loadState();
const playersDb = loadPlayers();

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveState({
      tileOverrides,
      sharedItems,
      whiteboardData,
    });
    saveTimer = null;
  }, 1000);
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Shared state variables (declared here so scheduleSave can access them)
let tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }> = {};
let sharedItems: Array<{ id: string; x: number; y: number; w: number; h: number; color?: string }> = [];
let whiteboardData: string = '';

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // === Player state ===
  interface ServerPlayer {
    id: string;
    name: string;
    charId: string;
    hatId: string;
    x: number;
    y: number;
    color: string;
  }

  interface RpsGame {
    id: string;
    playerA: string;
    playerB: string;
    choiceA: 'rock' | 'paper' | 'scissors' | null;
    choiceB: 'rock' | 'paper' | 'scissors' | null;
    result: 'A' | 'B' | 'draw' | null;
    rewardA: number;
    rewardB: number;
  }

  const onlinePlayers = new Map<string, ServerPlayer>();
  const rpsGames = new Map<string, RpsGame>();
  let rpsCounter = 0;

  // === Card game state ===
  const cardGames = new Map<string, CardGameState>();
  const playerCardGames = new Map<string, string>();

  // === Shared state (loaded from disk) ===
  whiteboardData = persistedState.whiteboardData;
  Object.assign(tileOverrides, persistedState.tileOverrides);
  sharedItems.push(...persistedState.sharedItems);

  console.log(`[Data] Loaded: ${Object.keys(tileOverrides).length} tile overrides, ${sharedItems.length} items`);

  function broadcastPlayers() {
    const list = Array.from(onlinePlayers.values());
    io.emit('players:list', list);
  }

  io.on('connection', (socket) => {
    console.log(`[+] Player connected: ${socket.id}`);

    // Send current shared state to new player
    socket.emit('items:sync', sharedItems);
    if (whiteboardData) {
      socket.emit('whiteboard:sync', whiteboardData);
    }
    socket.emit('tile:sync', tileOverrides);

    // Player registers
    socket.on('player:register', (data: { name: string; charId: string; hatId: string; color: string }) => {
      const player: ServerPlayer = {
        id: socket.id,
        name: data.name,
        charId: data.charId,
        hatId: data.hatId,
        x: 16 * 40 + 20,
        y: 13 * 40 + 20,
        color: data.color,
      };
      onlinePlayers.set(socket.id, player);
      broadcastPlayers();

      // Send saved player data back to client
      const playerKey = data.name.toLowerCase();
      const saved = playersDb[playerKey];
      if (saved) {
        socket.emit('player:data_sync', saved);
        console.log(`[Data] Loaded saved data for "${data.name}"`);
      }
    });

    // Player moves
    socket.on('player:move', (data: { x: number; y: number }) => {
      const p = onlinePlayers.get(socket.id);
      if (p) {
        p.x = data.x;
        p.y = data.y;
        socket.broadcast.emit('player:moved', { id: socket.id, x: data.x, y: data.y });
      }
    });

    // === Player saves their data to server ===
    socket.on('player:save', (data: PlayerData) => {
      const playerKey = data.name.toLowerCase();
      playersDb[playerKey] = data;
      savePlayers(playersDb);
    });

    // === Tile painting (3x3 block) ===
    socket.on('tile:paint', (data: { x: number; y: number; type: 'floor' | 'wall'; textureIndex: number }) => {
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const x = data.x + dx;
          const y = data.y + dy;
          if (y >= 0 && y < 45 && x >= 0 && x < 58) {
            tileOverrides[`${x},${y}`] = { type: data.type, textureIndex: data.textureIndex };
          }
        }
      }
      io.emit('tile:sync', tileOverrides);
      scheduleSave();
    });

    socket.on('tile:remove', (data: { x: number; y: number }) => {
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          delete tileOverrides[`${data.x + dx},${data.y + dy}`];
        }
      }
      io.emit('tile:sync', tileOverrides);
      scheduleSave();
    });

    socket.on('tile:reset', () => {
      for (const key of Object.keys(tileOverrides)) {
        delete tileOverrides[key];
      }
      io.emit('tile:sync', tileOverrides);
      scheduleSave();
    });

    // === Shared items ===
    socket.on('item:place', (data: { id: string; x: number; y: number; w: number; h: number; color?: string }) => {
      sharedItems.push(data);
      console.log(`[Items] Placed: ${data.id} at (${data.x},${data.y})`);
      io.emit('items:sync', sharedItems);
      scheduleSave();
    });

    socket.on('item:remove', (data: { index: number; id: string }) => {
      const idx = sharedItems.findIndex((item, i) => i === data.index && item.id === data.id);
      if (idx !== -1) {
        sharedItems.splice(idx, 1);
        console.log(`[Items] Removed: ${data.id} at index ${data.index}`);
        io.emit('items:sync', sharedItems);
        scheduleSave();
      }
    });

    // === Whiteboard ===
    socket.on('whiteboard:update', (data: string) => {
      whiteboardData = data;
      socket.broadcast.emit('whiteboard:sync', data);
      scheduleSave();
    });

    socket.on('whiteboard:request_sync', () => {
      if (whiteboardData) {
        socket.emit('whiteboard:sync', whiteboardData);
      }
    });

    // === RPS Game ===
    socket.on('rps:invite', (data: { targetId: string }) => {
      const playerA = onlinePlayers.get(socket.id);
      const playerB = onlinePlayers.get(data.targetId);
      if (!playerA || !playerB) return;

      for (const game of rpsGames.values()) {
        if (game.playerA === socket.id || game.playerB === socket.id ||
            game.playerA === data.targetId || game.playerB === data.targetId) {
          return;
        }
      }

      const gameId = `rps_${++rpsCounter}`;
      const game: RpsGame = {
        id: gameId,
        playerA: socket.id,
        playerB: data.targetId,
        choiceA: null,
        choiceB: null,
        result: null,
        rewardA: 0,
        rewardB: 0,
      };
      rpsGames.set(gameId, game);

      io.to(data.targetId).emit('rps:invite_received', {
        gameId,
        fromId: socket.id,
        fromName: playerA.name,
      });

      io.to(socket.id).emit('rps:invite_sent', {
        gameId,
        targetId: data.targetId,
        targetName: playerB.name,
      });
    });

    socket.on('rps:accept', (data: { gameId: string }) => {
      const game = rpsGames.get(data.gameId);
      if (!game || game.playerB !== socket.id) return;

      const playerA = onlinePlayers.get(game.playerA);
      const playerB = onlinePlayers.get(game.playerB);

      io.to(game.playerA).emit('rps:started', {
        gameId: data.gameId,
        opponentName: playerB?.name,
      });
      io.to(game.playerB).emit('rps:started', {
        gameId: data.gameId,
        opponentName: playerA?.name,
      });
    });

    socket.on('rps:decline', (data: { gameId: string }) => {
      const game = rpsGames.get(data.gameId);
      if (!game) return;

      io.to(game.playerA).emit('rps:declined', { gameId: data.gameId });
      rpsGames.delete(data.gameId);
    });

    socket.on('rps:choice', (data: { gameId: string; choice: 'rock' | 'paper' | 'scissors' }) => {
      const game = rpsGames.get(data.gameId);
      if (!game) return;

      if (game.playerA === socket.id) game.choiceA = data.choice;
      else if (game.playerB === socket.id) game.choiceB = data.choice;

      if (game.choiceA && game.choiceB) {
        const a = game.choiceA;
        const b = game.choiceB;

        if (a === b) {
          game.result = 'draw';
          game.rewardA = 5;
          game.rewardB = 5;
        } else if (
          (a === 'rock' && b === 'scissors') ||
          (a === 'paper' && b === 'rock') ||
          (a === 'scissors' && b === 'paper')
        ) {
          game.result = 'A';
          game.rewardA = 20;
          game.rewardB = 0;
        } else {
          game.result = 'B';
          game.rewardA = 0;
          game.rewardB = 20;
        }

        io.to(game.playerA).emit('rps:result', {
          gameId: game.id,
          myChoice: game.choiceA,
          theirChoice: game.choiceB,
          winner: game.result === 'A' ? 'you' : game.result === 'B' ? 'them' : 'draw',
          reward: game.rewardA,
        });
        io.to(game.playerB).emit('rps:result', {
          gameId: game.id,
          myChoice: game.choiceB,
          theirChoice: game.choiceA,
          winner: game.result === 'B' ? 'you' : game.result === 'A' ? 'them' : 'draw',
          reward: game.rewardB,
        });

        rpsGames.delete(game.id);
      }
    });

    socket.on('rps:cancel', (data: { gameId: string }) => {
      const game = rpsGames.get(data.gameId);
      if (!game) return;

      const otherId = game.playerA === socket.id ? game.playerB : game.playerA;
      io.to(otherId).emit('rps:cancelled', { gameId: data.gameId });
      rpsGames.delete(data.gameId);
    });

    // === Emoji sync ===
    socket.on('emoji:send', (data: { emoji: string }) => {
      socket.broadcast.emit('emoji:show', { playerId: socket.id, emoji: data.emoji });
    });

    // === Card Game (OKIЯ) ===
    socket.on('cardgame:create', () => {
      const player = onlinePlayers.get(socket.id);
      if (!player) return;
      if (playerCardGames.has(socket.id)) return;

      const game = createGame(socket.id, player.name);
      cardGames.set(game.id, game);
      playerCardGames.set(socket.id, game.id);

      socket.emit('cardgame:state', game);
    });

    socket.on('cardgame:join', (gameId: string) => {
      const player = onlinePlayers.get(socket.id);
      if (!player) return;
      if (playerCardGames.has(socket.id)) return;

      const game = cardGames.get(gameId);
      if (!game) return;

      const ok = joinGame(game, socket.id, player.name);
      if (!ok) return;

      playerCardGames.set(socket.id, game.id);

      for (const p of game.players) {
        io.to(p.id).emit('cardgame:state', game);
      }
    });

    socket.on('cardgame:play', (data: { cardId: string; chosenColor?: string }) => {
      const gameId = playerCardGames.get(socket.id);
      if (!gameId) return;

      const game = cardGames.get(gameId);
      if (!game || game.status !== 'playing') return;

      const result = playCard(game, socket.id, data.cardId, data.chosenColor as any);
      if (!result.ok) {
        socket.emit('cardgame:error', result.error);
        return;
      }

      for (const p of game.players) {
        io.to(p.id).emit('cardgame:state', game);
      }
    });

    socket.on('cardgame:draw', () => {
      const gameId = playerCardGames.get(socket.id);
      if (!gameId) return;

      const game = cardGames.get(gameId);
      if (!game || game.status !== 'playing') return;

      drawCard(game, socket.id);

      for (const p of game.players) {
        io.to(p.id).emit('cardgame:state', game);
      }
    });

    socket.on('cardgame:leave', () => {
      const gameId = playerCardGames.get(socket.id);
      if (!gameId) return;

      const game = cardGames.get(gameId);
      if (!game) return;

      game.players = game.players.filter(p => p.id !== socket.id);
      playerCardGames.delete(socket.id);

      if (game.players.length === 0) {
        cardGames.delete(gameId);
      } else {
        if (game.currentTurn >= game.players.length) {
          game.currentTurn = 0;
        }
        if (game.status === 'playing' && game.players.length < 2) {
          game.status = 'finished';
          game.winner = game.players[0].id;
          game.lastAction = `${game.players[0].name} wins (opponent left)!`;
        }
        for (const p of game.players) {
          io.to(p.id).emit('cardgame:state', game);
        }
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[-] Player disconnected: ${socket.id}`);
      for (const [id, game] of rpsGames) {
        if (game.playerA === socket.id || game.playerB === socket.id) {
          const otherId = game.playerA === socket.id ? game.playerB : game.playerA;
          io.to(otherId).emit('rps:cancelled', { gameId: id });
          rpsGames.delete(id);
        }
      }
      const cardGameId = playerCardGames.get(socket.id);
      if (cardGameId) {
        const cg = cardGames.get(cardGameId);
        if (cg) {
          const player = cg.players.find(p => p.id === socket.id);
          if (player) player.connected = false;
          for (const p of cg.players) {
            io.to(p.id).emit('cardgame:state', cg);
          }
        }
        playerCardGames.delete(socket.id);
      }
      onlinePlayers.delete(socket.id);
      broadcastPlayers();
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
