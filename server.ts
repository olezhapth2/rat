import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { type CardGameState, createGame, joinGame, playCard, drawCard } from './src/game/cardgame';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

// === Persistence ===
const DATA_DIR = join(process.cwd(), '.game-data');
const STATE_FILE = join(DATA_DIR, 'game-state.json');
const PLAYERS_FILE = join(DATA_DIR, 'players.json');
const ACHIEVEMENTS_FILE = join(DATA_DIR, 'custom-achievements.json');
const USERS_FILE = join(DATA_DIR, 'users.json');

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

interface CustomAchievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

interface UserAccount {
  login: string;
  password: string;
  name: string;
  charId: string;
  color: string;
  role: string;
  avatar: string; // path to avatar sprite
  photoTaken?: boolean;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    const fs = require('fs');
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  // Ensure custom sprites directory exists
  const spritesDir = join(DATA_DIR, 'custom-sprites');
  if (!existsSync(spritesDir)) {
    mkdirSync(spritesDir, { recursive: true });
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

function loadCustomAchievements(): CustomAchievement[] {
  ensureDataDir();
  try {
    if (existsSync(ACHIEVEMENTS_FILE)) {
      const raw = readFileSync(ACHIEVEMENTS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Data] Failed to load custom achievements:', e);
  }
  return [];
}

function saveCustomAchievements(achievements: CustomAchievement[]) {
  ensureDataDir();
  try {
    writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify(achievements, null, 2));
  } catch (e) {
    console.error('[Data] Failed to save custom achievements:', e);
  }
}

function loadUsers(): Record<string, UserAccount> {
  ensureDataDir();
  try {
    if (existsSync(USERS_FILE)) {
      const raw = readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Data] Failed to load users:', e);
  }
  // Default users
  return {
    'олег':   { login: 'олег',   password: '123456', name: 'Олег',   charId: 'pers1', color: '#4ecca3', role: 'Разработчик', avatar: '' },
    'аня':    { login: 'аня',    password: '123456', name: 'Аня',    charId: 'pers2', color: '#ffa726', role: 'Дизайнер',   avatar: '' },
    'алиса':  { login: 'алиса',  password: '123456', name: 'Алиса',  charId: 'pers3', color: '#9c27b0', role: 'HR',         avatar: '' },
    'кирилл': { login: 'кирилл', password: '123456', name: 'Кирилл', charId: 'pers4', color: '#2196f3', role: 'QA',         avatar: '' },
    'саша':   { login: 'саша',   password: '123456', name: 'Саша',   charId: 'pers5', color: '#e94560', role: 'PM',         avatar: '' },
  };
}

function saveUsers(users: Record<string, UserAccount>) {
  ensureDataDir();
  try {
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('[Data] Failed to save users:', e);
  }
}

// Load persisted data
const persistedState = loadState();
const playersDb = loadPlayers();
const customAchievements = loadCustomAchievements();
const usersDb = loadUsers();

// One-time migration: capitalize all names in DB
let namesFixed = false;
for (const [key, u] of Object.entries(usersDb)) {
  if (u.name && u.name !== u.name.charAt(0).toUpperCase() + u.name.slice(1)) {
    u.name = u.name.charAt(0).toUpperCase() + u.name.slice(1);
    namesFixed = true;
  }
  if (u.role && u.role !== u.role.charAt(0).toUpperCase() + u.role.slice(1)) {
    u.role = u.role.charAt(0).toUpperCase() + u.role.slice(1);
    namesFixed = true;
  }
}
if (namesFixed) saveUsers(usersDb);

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
    // Serve custom sprites from .game-data/custom-sprites/
    if (parsedUrl.pathname?.startsWith('/custom-sprites/')) {
      const fileName = parsedUrl.pathname.replace('/custom-sprites/', '');
      const filePath = join(DATA_DIR, 'custom-sprites', fileName);
      if (existsSync(filePath)) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
        };
        res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const fileContent = readFileSync(filePath);
        res.end(fileContent);
        return;
      }
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    // Avatar upload endpoint
    if (req.method === 'POST' && parsedUrl.pathname === '/api/upload-avatar') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const body = Buffer.concat(chunks);
          const boundary = req.headers['content-type']?.split('boundary=')[1];
          if (!boundary) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'No boundary' }));
            return;
          }
          // Parse multipart form data
          const parts = body.toString('binary').split('--' + boundary);
          let fileData: Buffer | null = null;
          let fileName = '';
          for (const part of parts) {
            if (part.includes('filename="')) {
              const match = part.match(/filename="([^"]+)"/);
              if (match) fileName = match[1];
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd >= 0) {
                const content = part.slice(headerEnd + 4);
                // Remove trailing \r\n
                const cleanContent = content.slice(0, content.lastIndexOf('\r\n') > 0 ? content.lastIndexOf('\r\n') : content.length);
                fileData = Buffer.from(cleanContent, 'binary');
              }
            }
          }
          if (!fileData || !fileName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'No file' }));
            return;
          }
          // Save as webp
          const outName = `avatar_${Date.now()}.webp`;
          const outPath = join(DATA_DIR, 'custom-sprites', outName);
          const sharp = require('sharp');
          await sharp(fileData).resize(120, 120).webp({ quality: 90 }).toFile(outPath);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ url: `/custom-sprites/${outName}` }));
        } catch (e) {
          console.error('[Upload] Error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Upload failed' }));
        }
      });
      return;
    }

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
  const loggedInUsers = new Map<string, string>(); // socketId → login key
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
            const key = `${data.type}:${x},${y}`;
            tileOverrides[key] = { type: data.type, textureIndex: data.textureIndex };
          }
        }
      }
      io.emit('tile:sync', tileOverrides);
      scheduleSave();
    });

    socket.on('tile:remove', (data: { x: number; y: number; type: 'floor' | 'wall' }) => {
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const key = `${data.type}:${data.x + dx},${data.y + dy}`;
          delete tileOverrides[key];
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

    // === ADMIN EVENTS ===
    const ADMIN_LOGINS = ['olegdevyatow@gmail.com'];
    function isAdmin(): boolean {
      // Check by login email
      const loginKey = loggedInUsers.get(socket.id);
      if (loginKey && ADMIN_LOGINS.includes(loginKey)) return true;
      // Check by charId (legacy pers5)
      const player = onlinePlayers.get(socket.id);
      return player?.charId === 'pers5';
    }

    // Get all players list
    socket.on('admin:get-players', () => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const list = Object.entries(playersDb).map(([key, data]) => ({
        key,
        name: data.name,
        charId: data.charId,
        coins: data.coins,
        level: data.level,
        achievements: data.achievements,
      }));
      socket.emit('admin:players-list', list);
    });

    // Add new player
    socket.on('admin:add-player', (data: { name: string; charId: string; password?: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const key = data.name.toLowerCase();
      if (playersDb[key]) return socket.emit('admin:error', 'Player already exists');
      playersDb[key] = {
        name: data.name,
        charId: data.charId,
        hatId: 'none',
        coins: 100,
        xp: 0,
        level: 1,
        furniture: [],
        placedItems: [],
        achievements: [],
        petId: '',
        petPetCount: 0,
        wallColor: '#2a2a4a',
        doorName: '',
        av: '🧑‍🚀',
        role: 'Разработчик',
        visitedRooms: [],
        dailyQuests: { date: '', progress: {}, claimed: [] },
      };
      savePlayers(playersDb);
      socket.emit('admin:player-added', { name: data.name, charId: data.charId });
      // Refresh list
      const list = Object.entries(playersDb).map(([k, d]) => ({
        key: k, name: d.name, charId: d.charId, coins: d.coins, level: d.level, achievements: d.achievements,
      }));
      socket.emit('admin:players-list', list);
    });

    // Delete player
    socket.on('admin:delete-player', (data: { key: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      if (!playersDb[data.key]) return socket.emit('admin:error', 'Player not found');
      delete playersDb[data.key];
      savePlayers(playersDb);
      socket.emit('admin:player-deleted', { key: data.key });
      const list = Object.entries(playersDb).map(([k, d]) => ({
        key: k, name: d.name, charId: d.charId, coins: d.coins, level: d.level, achievements: d.achievements,
      }));
      socket.emit('admin:players-list', list);
    });

    // Adjust money
    socket.on('admin:adjust-money', (data: { key: string; amount: number }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const player = playersDb[data.key];
      if (!player) return socket.emit('admin:error', 'Player not found');
      player.coins = Math.max(0, player.coins + data.amount);
      savePlayers(playersDb);
      socket.emit('admin:money-adjusted', { key: data.key, coins: player.coins });
      // If player is online, sync to them
      for (const [sid, sp] of onlinePlayers) {
        if (sp.name.toLowerCase() === data.key) {
          io.to(sid).emit('player:data_sync', player);
        }
      }
    });

    // Get custom achievements
    socket.on('admin:get-achievements', () => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      socket.emit('admin:achievements-list', customAchievements);
    });

    // Create custom achievement
    socket.on('admin:create-achievement', (data: { name: string; icon: string; desc: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const id = `custom_${Date.now()}`;
      customAchievements.push({ id, name: data.name, icon: data.icon, desc: data.desc });
      saveCustomAchievements(customAchievements);
      socket.emit('admin:achievement-created', { id, name: data.name, icon: data.icon, desc: data.desc });
      socket.emit('admin:achievements-list', customAchievements);
    });

    // Grant achievement to player
    socket.on('admin:grant-achievement', (data: { key: string; achievementId: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const player = playersDb[data.key];
      if (!player) return socket.emit('admin:error', 'Player not found');
      if (!player.achievements.includes(data.achievementId)) {
        player.achievements.push(data.achievementId);
        savePlayers(playersDb);
      }
      socket.emit('admin:achievement-granted', { key: data.key, achievementId: data.achievementId });
      for (const [sid, sp] of onlinePlayers) {
        if (sp.name.toLowerCase() === data.key) {
          io.to(sid).emit('player:data_sync', player);
        }
      }
    });

    // === AUTH EVENTS ===
    socket.on('auth:login', (data: { login: string; password: string }) => {
      const key = data.login.trim().toLowerCase();
      const user = usersDb[key];
      if (!user) return socket.emit('auth:result', { ok: false, msg: 'Логин не найден' });
      if (user.password !== data.password) return socket.emit('auth:result', { ok: false, msg: 'Неверный пароль' });
      loggedInUsers.set(socket.id, key);
      // Capitalize name on the fly
      const capName = user.name.charAt(0).toUpperCase() + user.name.slice(1);
      socket.emit('auth:result', { ok: true, user: { login: user.login, name: capName, charId: user.charId, color: user.color, role: user.role, avatar: user.avatar, photoTaken: user.photoTaken || false } });
    });

    socket.on('auth:register', (data: { login: string; password: string; name: string; charId: string; color: string; role: string; avatar: string }) => {
      const key = data.login.trim().toLowerCase();
      const capName = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      const capRole = data.role.charAt(0).toUpperCase() + data.role.slice(1);
      if (usersDb[key]) return socket.emit('auth:result', { ok: false, msg: 'Логин уже занят' });
      usersDb[key] = {
        login: key,
        password: data.password,
        name: capName,
        charId: data.charId,
        color: data.color,
        role: capRole,
        avatar: data.avatar || '',
        photoTaken: false,
      };
      saveUsers(usersDb);
      loggedInUsers.set(socket.id, key);
      socket.emit('auth:result', { ok: true, user: { login: key, name: capName, charId: data.charId, color: data.color, role: capRole, avatar: data.avatar, photoTaken: false } });
    });

    socket.on('auth:get-users', () => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const list = Object.entries(usersDb).map(([key, u]) => ({
        login: key, name: u.name, charId: u.charId, color: u.color, role: u.role, avatar: u.avatar,
      }));
      socket.emit('auth:users-list', list);
    });

    socket.on('auth:photo-taken', () => {
      const key = loggedInUsers.get(socket.id);
      if (!key) return;
      const user = usersDb[key];
      if (user) {
        user.photoTaken = true;
        saveUsers(usersDb);
      }
    });

    socket.on('auth:profile-setup', (data: { name: string; role: string }) => {
      const key = loggedInUsers.get(socket.id);
      if (!key) return;
      const user = usersDb[key];
      if (user) {
        if (data.name) user.name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
        if (data.role) user.role = data.role.charAt(0).toUpperCase() + data.role.slice(1);
        user.photoTaken = true;
        saveUsers(usersDb);
      }
    });

    socket.on('auth:update-user', (data: { login: string; name?: string; charId?: string; color?: string; role?: string; avatar?: string; password?: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const key = data.login.trim().toLowerCase();
      const user = usersDb[key];
      if (!user) return socket.emit('admin:error', 'User not found');
      if (data.name !== undefined) user.name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      if (data.charId !== undefined) user.charId = data.charId;
      if (data.color !== undefined) user.color = data.color;
      if (data.role !== undefined) user.role = data.role.charAt(0).toUpperCase() + data.role.slice(1);
      if (data.avatar !== undefined) user.avatar = data.avatar;
      if (data.password !== undefined && data.password.length > 0) user.password = data.password;
      saveUsers(usersDb);
      // Sync to online player if connected
      for (const [sid, sp] of onlinePlayers) {
        if (sp.name.toLowerCase() === key) {
          io.to(sid).emit('auth:user-updated', { name: user.name, charId: user.charId, color: user.color, role: user.role, avatar: user.avatar });
        }
      }
      socket.emit('admin:user-updated', { login: key });
    });

    socket.on('auth:delete-user', (data: { login: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const key = data.login.trim().toLowerCase();
      if (!usersDb[key]) return socket.emit('admin:error', 'User not found');
      delete usersDb[key];
      saveUsers(usersDb);
      socket.emit('admin:user-deleted', { login: key });
      const list = Object.entries(usersDb).map(([k, u]) => ({
        login: k, name: u.name, charId: u.charId, color: u.color, role: u.role, avatar: u.avatar,
      }));
      socket.emit('auth:users-list', list);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[-] Player disconnected: ${socket.id}`);
      loggedInUsers.delete(socket.id);
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
