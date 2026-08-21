import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { type CardGameState, createGame, joinGame, startGame, playCard, drawCard } from './src/game/cardgame';
import { type OkiyaGameState, createOkiyaGame, joinOkiyaGame, playOkiyaMove } from './src/game/okiya';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

// === Persistence ===
const DATA_DIR = join(process.cwd(), '.game-data');
const STATE_FILE = join(DATA_DIR, 'game-state.json');
const PLAYERS_FILE = join(DATA_DIR, 'players.json');
const ACHIEVEMENTS_FILE = join(DATA_DIR, 'custom-achievements.json');
const USERS_FILE = join(DATA_DIR, 'users.json');
const LEADERBOARDS_FILE = join(DATA_DIR, 'leaderboards.json');

interface PersistedState {
  tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>;
  sharedItems: Array<{ id: string; x: number; y: number; w: number; h: number; color?: string }>;
  whiteboardData: string;
}

// === Leaderboards ===
interface LeaderboardEntry {
  name: string;
  charId: string;
  score: number;
  date: string;
}
type LeaderboardKey = 'smoking' | 'microwave' | 'basketball' | 'rps' | 'cardgame' | 'furniture_toss';
type LeaderboardData = Record<LeaderboardKey, LeaderboardEntry[]>;
const LEADERBOARD_MAX = 20;

function loadLeaderboards(): LeaderboardData {
  ensureDataDir();
  try {
    if (existsSync(LEADERBOARDS_FILE)) {
      return JSON.parse(readFileSync(LEADERBOARDS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Data] Failed to load leaderboards:', e);
  }
  return { smoking: [], microwave: [], basketball: [], rps: [], cardgame: [], furniture_toss: [] };
}

function saveLeaderboards(data: LeaderboardData) {
  ensureDataDir();
  try {
    writeFileSync(LEADERBOARDS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Data] Failed to save leaderboards:', e);
  }
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
  wallColor: string;
  doorName: string;
  av: string;
  role: string;
  visitedRooms: string[];
  dailyQuests: { date: string; progress: Record<string, number>; claimed: string[] };
  pets: string[];
  activePet: string | null;
  tileOverrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>;
  posX: number;
  posY: number;
  myRoom: string[];
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
  role: string;
  avatar: string;
  photoTaken?: boolean;
  admin?: boolean;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
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
  // Default: only admin
  const defaultHash = bcrypt.hashSync('123456', 10);
  return {
    'olegdevyatow@gmail.com': { login: 'olegdevyatow@gmail.com', password: defaultHash, name: 'Олег', charId: 'pers1', role: 'Дизайнер', avatar: '', photoTaken: true, admin: true },
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
let leaderboards: LeaderboardData = { smoking: [], microwave: [], basketball: [], rps: [], cardgame: [], furniture_toss: [] };
leaderboards = loadLeaderboards();

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
          // Save as character sprite
          const outName = `sprite_${Date.now()}.webp`;
          const outPath = join(DATA_DIR, 'custom-sprites', outName);
          await sharp(fileData).resize(80, 160).webp({ quality: 90 }).toFile(outPath);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ url: `/custom-sprites/${outName}`, charId: outName.replace('.webp', '') }));
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

  // Daily whiteboard reset at 00:00 Moscow time (UTC+3)
  function scheduleWhiteboardReset() {
    const now = new Date();
    const mskOffset = 3 * 60 * 60 * 1000;
    const mskNow = new Date(now.getTime() + mskOffset);
    const nextMidnight = new Date(Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate() + 1, 0, 0, 0));
    const nextMidnightLocal = new Date(nextMidnight.getTime() - mskOffset);
    const delay = nextMidnightLocal.getTime() - now.getTime();
    console.log(`[Whiteboard] Next reset in ${Math.round(delay / 1000 / 60)} min`);
    setTimeout(() => {
      whiteboardData = '';
      scheduleSave();
      io.emit('whiteboard:sync', '');
      console.log('[Whiteboard] Daily reset at 00:00 MSK');
      scheduleWhiteboardReset();
    }, delay);
  }
  scheduleWhiteboardReset();

  // === Player state ===
  interface ServerPlayer {
    id: string;
    name: string;
    charId: string;
    hatId: string;
    x: number;
    y: number;
    coins?: number;
    level?: number;
    achievements?: string[];
    role?: string;
    avatar?: string;
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

  // === OKIYA game state ===
  const okiyaGames = new Map<string, OkiyaGameState>();
  const playerOkiyaGames = new Map<string, string>();

  // === Shared state (loaded from disk) ===
  whiteboardData = persistedState.whiteboardData;
  Object.assign(tileOverrides, persistedState.tileOverrides);
  sharedItems.push(...persistedState.sharedItems);

  console.log(`[Data] Loaded: ${Object.keys(tileOverrides).length} tile overrides, ${sharedItems.length} items`);

  function buildPlayersList() {
    return Object.entries(playersDb).map(([key, data]) => {
      const userEntry = Object.entries(usersDb).find(([_, u]) => u.name?.toLowerCase() === key);
      return {
        key, name: data.name, charId: data.charId, coins: data.coins,
        level: data.level, achievements: data.achievements,
        login: userEntry?.[0] || '', admin: userEntry?.[1]?.admin || false,
      };
    });
  }

  function broadcastPlayers() {
    const list = Array.from(onlinePlayers.values()).map(p => {
      const playerData = playersDb[p.name.toLowerCase()];
      const userData = Object.values(usersDb).find(u => u.name.toLowerCase() === p.name.toLowerCase());
      return {
        ...p,
        coins: playerData?.coins,
        level: playerData?.level,
        achievements: playerData?.achievements,
        role: userData?.role,
        avatar: userData?.avatar,
        activePet: playerData?.activePet || null,
      };
    });
    io.emit('players:list', list);
  }

  function broadcastOkiyaLobby() {
    const waiting = Array.from(okiyaGames.values())
      .filter(g => g.status === 'waiting')
      .map(g => ({
        id: g.id,
        creator: g.players[0]?.name || '?',
        players: g.players.length,
        maxPlayers: 2,
      }));
    io.emit('okiya:lobby', waiting);
  }

  function broadcastCardgameLobby() {
    const waiting = Array.from(cardGames.values())
      .filter(g => g.status === 'waiting')
      .map(g => ({
        id: g.id,
        creator: g.players[0]?.name || '?',
        players: g.players.length,
        maxPlayers: 4,
      }));
    io.emit('cardgame:lobby', waiting);
  }

  io.on('connection', (socket) => {
    console.log(`[+] Player connected: ${socket.id}`);

    // Send current shared state to new player
    socket.emit('items:sync', sharedItems);
    if (whiteboardData) {
      socket.emit('whiteboard:sync', whiteboardData);
    }
    socket.emit('tile:sync', tileOverrides);

    // Send user list for bot generation
    const userList = Object.entries(usersDb)
      .filter(([_, u]) => u.password) // only users who completed first login
      .map(([key, u]) => ({
        login: key,
        name: u.name,
        charId: u.charId,
        avatar: u.avatar || '',
      }));
    socket.emit('users:list', userList);

    // Player registers
    socket.on('player:register', (data: { name: string; charId: string; hatId: string }) => {
      // Remove any existing entry with the same name (e.g. reconnect from another tab)
      for (const [sid, sp] of onlinePlayers) {
        if (sp.name.toLowerCase() === data.name.toLowerCase() && sid !== socket.id) {
          onlinePlayers.delete(sid);
        }
      }
      const player: ServerPlayer = {
        id: socket.id,
        name: data.name,
        charId: data.charId,
        hatId: data.hatId,
        x: 16 * 40 + 20,
        y: 13 * 40 + 20,
      };
      onlinePlayers.set(socket.id, player);
      broadcastPlayers();

      // Send saved player data back to client
      const playerKey = data.name.toLowerCase();
      const saved = playersDb[playerKey];
      if (saved) {
        socket.emit('player:data_sync', saved);
        if (saved.posX !== undefined && saved.posY !== undefined) {
          player.x = saved.posX;
          player.y = saved.posY;
        }
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
      broadcastCardgameLobby();
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
      broadcastCardgameLobby();
    });

    socket.on('cardgame:start', () => {
      const gameId = playerCardGames.get(socket.id);
      if (!gameId) return;
      const game = cardGames.get(gameId);
      if (!game || game.status !== 'waiting') return;
      if (game.players.length < 2) return;
      if (game.players[0].id !== socket.id) return;

      startGame(game);
      for (const p of game.players) {
        io.to(p.id).emit('cardgame:state', game);
      }
      broadcastCardgameLobby();
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
      broadcastCardgameLobby();
    });

    // === OKIYA EVENTS ===
    socket.on('okiya:create', () => {
      const loginKey = loggedInUsers.get(socket.id);
      if (!loginKey) return;
      const user = usersDb[loginKey];
      if (!user) return;
      if (playerOkiyaGames.has(socket.id)) return;

      const game = createOkiyaGame(socket.id, user.name || loginKey);
      okiyaGames.set(game.id, game);
      playerOkiyaGames.set(socket.id, game.id);
      io.to(socket.id).emit('okiya:state', game);
      broadcastOkiyaLobby();
    });

    socket.on('okiya:join', (gameId: string) => {
      const loginKey = loggedInUsers.get(socket.id);
      if (!loginKey) return;
      const user = usersDb[loginKey];
      if (!user) return;
      if (playerOkiyaGames.has(socket.id)) return;

      const game = okiyaGames.get(gameId);
      if (!game) return;

      const ok = joinOkiyaGame(game, socket.id, user.name || loginKey);
      if (!ok) return;

      playerOkiyaGames.set(socket.id, game.id);
      for (const p of game.players) {
        io.to(p.id).emit('okiya:state', game);
      }
      broadcastOkiyaLobby();
    });

    socket.on('okiya:start', () => {
      const gameId = playerOkiyaGames.get(socket.id);
      if (!gameId) return;
      const game = okiyaGames.get(gameId);
      if (!game || game.status !== 'waiting') return;
      if (game.players.length < 2) return;
      if (game.players[0].id !== socket.id) return;

      game.status = 'playing';
      game.currentTurn = 0;
      for (const p of game.players) {
        io.to(p.id).emit('okiya:state', game);
      }
      broadcastOkiyaLobby();
    });

    socket.on('okiya:play', (data: { gameId: string; r: number; c: number }) => {
      const game = okiyaGames.get(data.gameId);
      if (!game) return;

      const result = playOkiyaMove(game, socket.id, data.r, data.c);
      if (!result.ok) {
        io.to(socket.id).emit('okiya:error', result.error);
        return;
      }

      for (const p of game.players) {
        io.to(p.id).emit('okiya:state', game);
      }
    });

    socket.on('okiya:leave', () => {
      const gameId = playerOkiyaGames.get(socket.id);
      if (!gameId) return;
      const game = okiyaGames.get(gameId);
      if (!game) return;

      game.players = game.players.filter(p => p.id !== socket.id);
      playerOkiyaGames.delete(socket.id);

      if (game.players.length === 0) {
        okiyaGames.delete(gameId);
      } else {
        if (game.status === 'playing') {
          game.status = 'finished';
          game.winner = game.players[0].id;
          game.winReason = 'Opponent left';
        }
        for (const p of game.players) {
          io.to(p.id).emit('okiya:state', game);
        }
      }
      broadcastOkiyaLobby();
    });

    // === ADMIN EVENTS ===
    function isAdmin(): boolean {
      const loginKey = loggedInUsers.get(socket.id);
      if (loginKey && usersDb[loginKey]?.admin) return true;
      return false;
    }

    // Get all players list
    socket.on('admin:get-players', () => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const list = Object.entries(playersDb).map(([key, data]) => {
        const userEntry = Object.entries(usersDb).find(([_, u]) => u.name?.toLowerCase() === key);
        return {
          key,
          name: data.name,
          charId: data.charId,
          coins: data.coins,
          level: data.level,
          achievements: data.achievements,
          login: userEntry?.[0] || '',
          admin: userEntry?.[1]?.admin || false,
        };
      });
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
        wallColor: '#2a2a4a',
        doorName: '',
        av: '🧑‍🚀',
        role: 'Разработчик',
        visitedRooms: [],
        dailyQuests: { date: '', progress: {}, claimed: [] },
        pets: [],
        activePet: null,
        tileOverrides: {},
        posX: 16 * 40 + 20,
        posY: 13 * 40 + 20,
        myRoom: [],
      };
      savePlayers(playersDb);
      socket.emit('admin:player-added', { name: data.name, charId: data.charId });
      socket.emit('admin:players-list', buildPlayersList());
    });

    // Delete player
    socket.on('admin:delete-player', (data: { key: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      if (!playersDb[data.key]) return socket.emit('admin:error', 'Player not found');
      // Also delete associated user
      const userKey = Object.keys(usersDb).find(k => usersDb[k].name?.toLowerCase() === data.key);
      if (userKey) {
        delete usersDb[userKey];
        saveUsers(usersDb);
      }
      delete playersDb[data.key];
      savePlayers(playersDb);
      // Kick online player if connected
      for (const [sid, loginEmail] of loggedInUsers) {
        if (userKey && loginEmail === userKey) {
          io.to(sid).emit('auth:force-kick', { reason: 'Player deleted' });
          loggedInUsers.delete(sid);
        }
      }
      socket.emit('admin:player-deleted', { key: data.key });
      socket.emit('admin:players-list', buildPlayersList());
      const uList = Object.entries(usersDb).map(([k, u]) => ({
        login: k, name: u.name, charId: u.charId, role: u.role, avatar: u.avatar, admin: u.admin || false,
      }));
      socket.emit('auth:users-list', uList);
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

    // Clear player inventory (furniture + placedItems)
    socket.on('admin:clear-inventory', (data: { key: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const player = playersDb[data.key];
      if (!player) return socket.emit('admin:error', 'Player not found');
      player.furniture = [];
      player.placedItems = [];
      savePlayers(playersDb);
      socket.emit('admin:inventory-cleared', { key: data.key });
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
      // First login: user has no password yet
      if (!user.password) {
        loggedInUsers.set(socket.id, key);
        return socket.emit('auth:result', { ok: true, firstLogin: true, user: { login: user.login, name: '', charId: user.charId, role: '', avatar: user.avatar, photoTaken: false, admin: !!user.admin } });
      }
      // Support both bcrypt hashes and legacy plaintext (migration)
      const passwordMatch = user.password.startsWith('$2')
        ? bcrypt.compareSync(data.password, user.password)
        : user.password === data.password;
      // Migrate plaintext to bcrypt on successful login
      if (!user.password.startsWith('$2') && passwordMatch) {
        user.password = bcrypt.hashSync(data.password, 10);
        saveUsers(usersDb);
      }
      if (!passwordMatch) return socket.emit('auth:result', { ok: false, msg: 'Неверный пароль' });
      loggedInUsers.set(socket.id, key);
      const capName = user.name.charAt(0).toUpperCase() + user.name.slice(1);
      socket.emit('auth:result', { ok: true, user: { login: user.login, name: capName, charId: user.charId, role: user.role, avatar: user.avatar, photoTaken: user.photoTaken || false, admin: !!user.admin } });
    });

    socket.on('auth:reconnect', (data: { login: string }) => {
      const key = data.login.trim().toLowerCase();
      if (usersDb[key]) {
        loggedInUsers.set(socket.id, key);
      }
    });

    socket.on('auth:create-user', (data: { login: string; charId: string; avatar: string; admin?: boolean }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const key = data.login.trim().toLowerCase();
      if (usersDb[key]) return socket.emit('admin:error', 'Логин уже занят');
      usersDb[key] = {
        login: key,
        password: '',
        name: '',
        charId: data.charId,
        role: '',
        avatar: data.avatar || '',
        photoTaken: false,
        admin: data.admin || false,
      };
      saveUsers(usersDb);
      socket.emit('admin:user-added', { login: key });
      // Send updated user list
      const list = Object.entries(usersDb).map(([k, u]) => ({
        login: k, name: u.name, charId: u.charId, role: u.role, avatar: u.avatar, admin: u.admin || false,
      }));
      socket.emit('auth:users-list', list);
    });

    socket.on('auth:first-login', (data: { login: string; password: string; name: string; role: string }) => {
      const key = data.login.trim().toLowerCase();
      const user = usersDb[key];
      if (!user) return socket.emit('auth:result', { ok: false, msg: 'Логин не найден' });
      if (user.password) return socket.emit('auth:result', { ok: false, msg: 'Пароль уже установлен' });
      user.password = bcrypt.hashSync(data.password, 10);
      user.name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      user.role = data.role.charAt(0).toUpperCase() + data.role.slice(1);
      saveUsers(usersDb);
      loggedInUsers.set(socket.id, key);
      socket.emit('auth:result', { ok: true, user: { login: user.login, name: user.name, charId: user.charId, role: user.role, avatar: user.avatar, photoTaken: false, admin: !!user.admin } });
    });

    socket.on('auth:get-users', () => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const list = Object.entries(usersDb).map(([key, u]) => ({
        login: key, name: u.name, charId: u.charId, role: u.role, avatar: u.avatar, admin: u.admin || false,
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

    socket.on('auth:update-user', (data: { login: string; name?: string; charId?: string; role?: string; avatar?: string; password?: string; admin?: boolean }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const key = data.login.trim().toLowerCase();
      const user = usersDb[key];
      if (!user) return socket.emit('admin:error', 'User not found');
      if (data.name !== undefined) user.name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      if (data.charId !== undefined) user.charId = data.charId;
      if (data.role !== undefined) user.role = data.role.charAt(0).toUpperCase() + data.role.slice(1);
      if (data.avatar !== undefined) user.avatar = data.avatar;
      if (data.password !== undefined && data.password.length > 0) user.password = bcrypt.hashSync(data.password, 10);
      if (data.admin !== undefined) user.admin = data.admin;
      saveUsers(usersDb);
      // Sync to online player by login email via loggedInUsers
      for (const [sid, loginEmail] of loggedInUsers) {
        if (loginEmail === key) {
          io.to(sid).emit('auth:user-updated', { name: user.name, charId: user.charId, role: user.role, avatar: user.avatar, admin: !!user.admin });
        }
      }
      // Confirm to admin panel
      socket.emit('admin:user-updated', { login: key });
      // Refresh user list for admin
      const list = Object.entries(usersDb).map(([k, u]) => ({
        login: k, name: u.name, charId: u.charId, role: u.role, avatar: u.avatar, admin: u.admin || false,
      }));
      socket.emit('auth:users-list', list);
    });

    socket.on('auth:delete-user', (data: { login: string }) => {
      if (!isAdmin()) return socket.emit('admin:error', 'Access denied');
      const key = data.login.trim().toLowerCase();
      if (!usersDb[key]) return socket.emit('admin:error', 'User not found');
      if (usersDb[key].admin) return socket.emit('admin:error', 'Нельзя удалить админа');
      // Also delete associated player
      if (usersDb[key].name) {
        const playerKey = usersDb[key].name.toLowerCase();
        if (playersDb[playerKey]) {
          delete playersDb[playerKey];
          savePlayers(playersDb);
        }
      }
      delete usersDb[key];
      saveUsers(usersDb);
      // Kick online player if connected
      for (const [sid, loginEmail] of loggedInUsers) {
        if (loginEmail === key) {
          io.to(sid).emit('auth:force-kick', { reason: 'Account deleted' });
          loggedInUsers.delete(sid);
        }
      }
      socket.emit('admin:user-deleted', { login: key });
      const list = Object.entries(usersDb).map(([k, u]) => ({
        login: k, name: u.name, charId: u.charId, role: u.role, avatar: u.avatar, admin: u.admin || false,
      }));
      socket.emit('auth:users-list', list);
      socket.emit('admin:players-list', buildPlayersList());
    });

    // === Kryska daily steal ===
    socket.on('kryska:steal', (data: { playerKey: string }) => {
      const pd = playersDb[data.playerKey];
      if (!pd) return socket.emit('kryska:steal-result', { ok: false });
      const today = new Date().toISOString().slice(0, 10);
      const lastStealDate = (pd as any)._kryskaLastStealDate || '';
      if (lastStealDate === today) return socket.emit('kryska:steal-result', { ok: false });
      if (pd.coins < 1) return socket.emit('kryska:steal-result', { ok: false });
      pd.coins -= 1;
      (pd as any)._kryskaLastStealDate = today;
      savePlayers(playersDb);
      socket.emit('kryska:steal-result', { ok: true });
    });

    // === Player profile lookup ===
    socket.on('players:get-profile', (data: { name: string }) => {
      const key = data.name?.toLowerCase();
      if (!key) return;
      const pd = playersDb[key];
      if (!pd) return socket.emit('players:profile', null);
      const userEntry = Object.entries(usersDb).find(([_, u]) => u.name?.toLowerCase() === key);
      socket.emit('players:profile', {
        name: pd.name, charId: pd.charId, coins: pd.coins,
        level: pd.level, achievements: pd.achievements, role: pd.role || '',
        avatar: userEntry?.[1]?.avatar || '',
      });
    });

    // === Leaderboards ===
    socket.on('leaderboard:submit', (data: { game: LeaderboardKey; score: number }) => {
      const { game, score } = data;
      if (!['smoking', 'microwave', 'basketball', 'rps', 'cardgame', 'furniture_toss'].includes(game)) return;
      if (typeof score !== 'number' || isNaN(score)) return;

      const loginKey = loggedInUsers.get(socket.id);
      if (!loginKey) return;
      const user = usersDb[loginKey];
      if (!user) return;

      const entry: LeaderboardEntry = {
        name: user.name || loginKey,
        charId: user.charId || 'char1',
        score,
        date: new Date().toISOString(),
      };

      if (!leaderboards[game]) leaderboards[game] = [];
      const board = leaderboards[game];

      // For smoking, lower is better; for everything else, higher is better
      if (game === 'smoking') {
        board.push(entry);
        board.sort((a, b) => a.score - b.score);
      } else {
        board.push(entry);
        board.sort((a, b) => b.score - a.score);
      }

      // Keep top entries
      leaderboards[game] = board.slice(0, LEADERBOARD_MAX);
      saveLeaderboards(leaderboards);

      io.emit('leaderboard:updated', { game, entries: leaderboards[game] });
    });

    socket.emit('leaderboard:sync', leaderboards);

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
      const okiyaGameId = playerOkiyaGames.get(socket.id);
      if (okiyaGameId) {
        const og = okiyaGames.get(okiyaGameId);
        if (og) {
          og.players = og.players.filter(p => p.id !== socket.id);
          if (og.players.length === 0) {
            okiyaGames.delete(okiyaGameId);
          } else {
            if (og.status === 'playing') {
              og.status = 'finished';
              og.winner = og.players[0].id;
              og.winReason = 'Opponent disconnected';
            }
            for (const p of og.players) {
              io.to(p.id).emit('okiya:state', og);
            }
          }
        }
        playerOkiyaGames.delete(socket.id);
      }
      onlinePlayers.delete(socket.id);
      broadcastPlayers();
      broadcastOkiyaLobby();
      broadcastCardgameLobby();
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
