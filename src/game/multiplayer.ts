import { io, type Socket } from 'socket.io-client';

// === Types ===
export interface RemotePlayer {
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

export interface RpsInvite {
  gameId: string;
  fromId: string;
  fromName: string;
}

export interface RpsStarted {
  gameId: string;
  opponentName: string;
}

export interface RpsResult {
  gameId: string;
  myChoice: string;
  theirChoice: string;
  winner: 'you' | 'them' | 'draw';
  reward: number;
}

// === Singleton ===
let socket: Socket | null = null;
let myId: string | null = null;
let registered = false;

// === Shared item types ===
export interface SharedItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}

// === Callbacks ===
let onPlayersUpdate: ((players: RemotePlayer[]) => void) | null = null;
let onPlayerMoved: ((data: { id: string; x: number; y: number }) => void) | null = null;
let onRpsInviteReceived: ((data: RpsInvite) => void) | null = null;
let onRpsStarted: ((data: RpsStarted) => void) | null = null;
let onRpsResult: ((data: RpsResult) => void) | null = null;
let onRpsDeclined: ((data: { gameId: string }) => void) | null = null;
let onRpsCancelled: ((data: { gameId: string }) => void) | null = null;
let onRpsInviteSent: ((data: { gameId: string; targetId: string; targetName: string }) => void) | null = null;
let onConnect: (() => void) | null = null;
let onDisconnect: (() => void) | null = null;
let onItemsSync: ((items: SharedItem[]) => void) | null = null;
let onEmojiShow: ((data: { playerId: string; emoji: string }) => void) | null = null;
let onWhiteboardSync: ((data: string) => void) | null = null;
let onCardGameStateUpdate: ((game: any) => void) | null = null;
let onCardGameErrorUpdate: ((error: string) => void) | null = null;
let onTileSyncUpdate: ((overrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>) => void) | null = null;
let onPlayerDataSyncCb: ((data: any) => void) | null = null;

// === Public API ===

let onAuthReadyCb: (() => void) | null = null;
let authReady = false;

export function onAuthReady(cb: () => void): void { onAuthReadyCb = cb; }
export function isAuthReady(): boolean { return authReady; }

export function connectAuth(): void {
  if (socket) {
    // If already connected and reconnect was done, fire ready
    if (socket.connected && authReady) {
      onAuthReadyCb?.();
    }
    return;
  }
  socket = io(process.env.NEXT_PUBLIC_SERVER_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    myId = socket!.id!;
    authReady = false;
    console.log('[MP] Auth socket connected:', myId);
    // Re-auth from localStorage session
    try {
      const raw = localStorage.getItem('auth_session');
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.login) {
          socket!.emit('auth:reconnect', { login: session.login });
          // Server processes reconnect synchronously; fire ready on next tick
          setTimeout(() => { authReady = true; onAuthReadyCb?.(); }, 0);
        } else {
          authReady = true;
          onAuthReadyCb?.();
        }
      } else {
        authReady = true;
        onAuthReadyCb?.();
      }
    } catch {
      authReady = true;
      onAuthReadyCb?.();
    }
  });
  socket.on('disconnect', () => {
    console.log('[MP] Auth socket disconnected');
    authReady = false;
  });

  // Auth events — needed before login
  socket.on('auth:result', (data: { ok: boolean; msg?: string; user?: any; firstLogin?: boolean }) => {
    onAuthResultCb?.(data);
  });
  socket.on('auth:users-list', (list: any[]) => {
    onAuthUsersListCb?.(list);
  });
  socket.on('auth:user-updated', (data: any) => {
    onAuthUserSyncCb?.(data);
  });
  socket.on('admin:user-updated', (data: any) => {
    onAuthUserUpdatedCb?.(data);
  });
  socket.on('admin:user-deleted', (data: any) => {
    onAuthUserDeletedCb?.(data);
  });
  socket.on('auth:force-kick', (data: { reason: string }) => {
    localStorage.removeItem('auth_session');
    window.location.reload();
  });
}

let gameListenersRegistered = false;

function registerGameListeners(): void {
  if (!socket || gameListenersRegistered) return;
  gameListenersRegistered = true;

  socket.on('disconnect', () => {
    console.log('[MP] Disconnected');
    registered = false;
    onDisconnect?.();
  });

  socket.on('players:list', (players: RemotePlayer[]) => {
    onPlayersUpdate?.(players);
  });

  socket.on('player:moved', (data: { id: string; x: number; y: number }) => {
    onPlayerMoved?.(data);
  });

  socket.on('rps:invite_received', (data: RpsInvite) => {
    onRpsInviteReceived?.(data);
  });

  socket.on('rps:invite_sent', (data: { gameId: string; targetId: string; targetName: string }) => {
    onRpsInviteSent?.(data);
  });

  socket.on('rps:started', (data: RpsStarted) => {
    onRpsStarted?.(data);
  });

  socket.on('rps:result', (data: RpsResult) => {
    onRpsResult?.(data);
  });

  socket.on('rps:declined', (data: { gameId: string }) => {
    onRpsDeclined?.(data);
  });

  socket.on('rps:cancelled', (data: { gameId: string }) => {
    onRpsCancelled?.(data);
  });

  socket.on('items:sync', (items: SharedItem[]) => {
    onItemsSync?.(items);
  });

  socket.on('emoji:show', (data: { playerId: string; emoji: string }) => {
    onEmojiShow?.(data);
  });

    socket.on('whiteboard:sync', (data: string) => {
      onWhiteboardSync?.(data);
    });

    socket.on('cardgame:state', (game: any) => {
      onCardGameStateUpdate?.(game);
    });

    socket.on('cardgame:error', (error: string) => {
      onCardGameErrorUpdate?.(error);
    });

    socket.on('tile:sync', (overrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>) => {
      onTileSyncUpdate?.(overrides);
    });

    socket.on('player:data_sync', (data: any) => {
      onPlayerDataSyncCb?.(data);
    });

    // OKIYA events
    socket.on('okiya:state', (game: any) => {
      onOkiyaStateCb?.(game);
    });
    socket.on('okiya:error', (error: string) => {
      onOkiyaErrorCb?.(error);
    });

    // Leaderboard events
    socket.on('leaderboard:sync', (data: Record<string, any[]>) => {
      onLeaderboardSyncCb?.(data);
    });
    socket.on('leaderboard:updated', (data: { game: string; entries: any[] }) => {
      onLeaderboardUpdatedCb?.(data);
    });

    // Admin events
    socket.on('admin:players-list', (list: any[]) => {
      onAdminPlayersListCb?.(list);
    });
    socket.on('admin:achievements-list', (list: any[]) => {
      onAdminAchievementsListCb?.(list);
    });
    socket.on('admin:error', (msg: string) => {
      onAdminErrorCb?.(msg);
    });
    socket.on('admin:player-added', (data: any) => {
      onAdminPlayerAddedCb?.(data);
    });
    socket.on('admin:player-deleted', (data: any) => {
      onAdminPlayerDeletedCb?.(data);
    });
    socket.on('admin:money-adjusted', (data: any) => {
      onAdminMoneyAdjustedCb?.(data);
    });
  }

export function connectMultiplayer(name: string, charId: string, hatId: string): void {
  if (socket?.connected) {
    myId = socket.id!;
    registerGameListeners();
    socket.emit('player:register', { name, charId, hatId });
    registered = true;
    onConnect?.();
    return;
  }

  socket = io(process.env.NEXT_PUBLIC_SERVER_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    myId = socket!.id!;
    console.log('[MP] Connected:', myId);
    registerGameListeners();
    socket!.emit('player:register', { name, charId, hatId });
    registered = true;
    onConnect?.();
  });
}

export function disconnectMultiplayer(): void {
  socket?.disconnect();
  socket = null;
  myId = null;
  registered = false;
  gameListenersRegistered = false;
}

export function sendPosition(x: number, y: number): void {
  if (!socket?.connected) return;
  socket.emit('player:move', { x, y });
}

export function sendRpsInvite(targetId: string): void {
  if (!socket?.connected) return;
  socket.emit('rps:invite', { targetId });
}

export function acceptRpsInvite(gameId: string): void {
  if (!socket?.connected) return;
  socket.emit('rps:accept', { gameId });
}

export function declineRpsInvite(gameId: string): void {
  if (!socket?.connected) return;
  socket.emit('rps:decline', { gameId });
}

export function sendRpsChoice(gameId: string, choice: 'rock' | 'paper' | 'scissors'): void {
  if (!socket?.connected) return;
  socket.emit('rps:choice', { gameId, choice });
}

export function cancelRps(gameId: string): void {
  if (!socket?.connected) return;
  socket.emit('rps:cancel', { gameId });
}

export function sendItemPlace(item: SharedItem): void {
  if (!socket?.connected) return;
  socket.emit('item:place', item);
}

export function sendItemRemove(index: number, id: string): void {
  if (!socket?.connected) return;
  socket.emit('item:remove', { index, id });
}

export function updateWhiteboard(data: string): void {
  if (!socket?.connected) return;
  socket.emit('whiteboard:update', data);
}

export function sendEmoji(emoji: string): void {
  if (!socket?.connected) return;
  socket.emit('emoji:send', { emoji });
}

export function createCardGame(): void {
  socket?.emit('cardgame:create');
}

export function joinCardGame(gameId: string): void {
  socket?.emit('cardgame:join', gameId);
}

export function playCardGame(cardId: string, chosenColor?: string): void {
  socket?.emit('cardgame:play', { cardId, chosenColor });
}

export function drawCardGame(): void {
  socket?.emit('cardgame:draw');
}

export function leaveCardGame(): void {
  socket?.emit('cardgame:leave');
}

export function onCardGameState(cb: (game: any) => void): void {
  onCardGameStateUpdate = cb;
}

export function onCardGameError(cb: (error: string) => void): void {
  onCardGameErrorUpdate = cb;
}

export function requestWhiteboardSync(callback?: (data: string) => void): void {
  if (!socket?.connected) return;
  if (callback) {
    onWhiteboardSync = callback;
  }
  socket.emit('whiteboard:request_sync');
}

export function onWhiteboardUpdate(callback: (data: string) => void): void {
  onWhiteboardSync = callback;
}

export function getMyId(): string | null {
  return myId;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

// === Callback setters ===

export function onPlayers(cb: (players: RemotePlayer[]) => void): void {
  onPlayersUpdate = cb;
}

export function onPlayerMove(cb: (data: { id: string; x: number; y: number }) => void): void {
  onPlayerMoved = cb;
}

export function onInviteReceived(cb: (data: RpsInvite) => void): void {
  onRpsInviteReceived = cb;
}

export function onInviteSent(cb: (data: { gameId: string; targetId: string; targetName: string }) => void): void {
  onRpsInviteSent = cb;
}

export function onGameStarted(cb: (data: RpsStarted) => void): void {
  onRpsStarted = cb;
}

export function onGameResult(cb: (data: RpsResult) => void): void {
  onRpsResult = cb;
}

export function onGameDeclined(cb: (data: { gameId: string }) => void): void {
  onRpsDeclined = cb;
}

export function onGameCancelled(cb: (data: { gameId: string }) => void): void {
  onRpsCancelled = cb;
}

export function onConnected(cb: () => void): void {
  onConnect = cb;
}

export function onDisconnected(cb: () => void): void {
  onDisconnect = cb;
}

export function onItems(cb: (items: SharedItem[]) => void): void {
  onItemsSync = cb;
}

export function onWhiteboard(cb: (data: string) => void): void {
  onWhiteboardSync = cb;
}

export function onEmoji(cb: (data: { playerId: string; emoji: string }) => void): void {
  onEmojiShow = cb;
}

export function sendTilePaint(x: number, y: number, type: 'floor' | 'wall', textureIndex: number): void {
  if (!socket?.connected) return;
  socket.emit('tile:paint', { x, y, type, textureIndex });
}

export function sendTileRemove(x: number, y: number, type: 'floor' | 'wall'): void {
  if (!socket?.connected) return;
  socket.emit('tile:remove', { x, y, type });
}

export function sendTileReset(): void {
  if (!socket?.connected) return;
  socket.emit('tile:reset');
}

export function onTileSync(cb: (overrides: Record<string, { type: 'floor' | 'wall'; textureIndex: number }>) => void): void {
  onTileSyncUpdate = cb;
}

export function sendPlayerSave(data: any): void {
  if (!socket?.connected) return;
  socket.emit('player:save', data);
}

export function onPlayerDataSync(cb: (data: any) => void): void {
  onPlayerDataSyncCb = cb;
}

// === ADMIN API ===
export function adminGetPlayers(): void {
  socket?.emit('admin:get-players');
}

export function adminAddPlayer(name: string, charId: string): void {
  socket?.emit('admin:add-player', { name, charId });
}

export function adminDeletePlayer(key: string): void {
  socket?.emit('admin:delete-player', { key });
}

export function adminAdjustMoney(key: string, amount: number): void {
  socket?.emit('admin:adjust-money', { key, amount });
}

export function adminGetAchievements(): void {
  socket?.emit('admin:get-achievements');
}

export function adminCreateAchievement(name: string, icon: string, desc: string): void {
  socket?.emit('admin:create-achievement', { name, icon, desc });
}

export function adminGrantAchievement(key: string, achievementId: string): void {
  socket?.emit('admin:grant-achievement', { key, achievementId });
}

// Admin callbacks
let onAdminPlayersListCb: ((list: any[]) => void) | null = null;
let onAdminAchievementsListCb: ((list: any[]) => void) | null = null;
let onAdminErrorCb: ((msg: string) => void) | null = null;
let onAdminPlayerAddedCb: ((data: any) => void) | null = null;
let onAdminPlayerDeletedCb: ((data: any) => void) | null = null;
let onAdminMoneyAdjustedCb: ((data: any) => void) | null = null;

export function onAdminPlayersList(cb: (list: any[]) => void): void { onAdminPlayersListCb = cb; }
export function onAdminAchievementsList(cb: (list: any[]) => void): void { onAdminAchievementsListCb = cb; }
export function onAdminError(cb: (msg: string) => void): void { onAdminErrorCb = cb; }
export function onAdminPlayerAdded(cb: (data: any) => void): void { onAdminPlayerAddedCb = cb; }
export function onAdminPlayerDeleted(cb: (data: any) => void): void { onAdminPlayerDeletedCb = cb; }
export function onAdminMoneyAdjusted(cb: (data: any) => void): void { onAdminMoneyAdjustedCb = cb; }

// === AUTH API ===
export function authLogin(login: string, password: string): void {
  socket?.emit('auth:login', { login, password });
}

export function authFirstLogin(login: string, password: string, name: string, role: string): void {
  socket?.emit('auth:first-login', { login, password, name, role });
}

export function authCreateUser(data: { login: string; charId: string; avatar: string; admin?: boolean }): void {
  socket?.emit('auth:create-user', data);
}

export function authGetUsers(): void {
  socket?.emit('auth:get-users');
}

export function authUpdateUser(data: { login: string; name?: string; charId?: string; role?: string; avatar?: string; password?: string; admin?: boolean }): void {
  socket?.emit('auth:update-user', data);
}

export function authDeleteUser(login: string): void {
  socket?.emit('auth:delete-user', { login });
}

export function markPhotoTaken(): void {
  socket?.emit('auth:photo-taken');
}

export function saveProfileSetup(name: string, role: string): void {
  socket?.emit('auth:profile-setup', { name, role });
}

// Auth callbacks
let onAuthResultCb: ((data: { ok: boolean; msg?: string; user?: any; firstLogin?: boolean }) => void) | null = null;
let onAuthUsersListCb: ((list: any[]) => void) | null = null;
let onAuthUserUpdatedCb: ((data: any) => void) | null = null;
let onAuthUserDeletedCb: ((data: any) => void) | null = null;
let onAuthUserSyncCb: ((data: any) => void) | null = null;

export function onAuthResult(cb: (data: { ok: boolean; msg?: string; user?: any; firstLogin?: boolean }) => void): void { onAuthResultCb = cb; }
export function onAuthUsersList(cb: (list: any[]) => void): void { onAuthUsersListCb = cb; }
export function onAuthUserUpdated(cb: (data: any) => void): void { onAuthUserUpdatedCb = cb; }
export function onAuthUserDeleted(cb: (data: any) => void): void { onAuthUserDeletedCb = cb; }
export function onAuthUserSync(cb: (data: any) => void): void { onAuthUserSyncCb = cb; }

// === LEADERBOARD API ===
export function submitLeaderboard(game: string, score: number): void {
  socket?.emit('leaderboard:submit', { game, score });
}

let onLeaderboardSyncCb: ((data: Record<string, any[]>) => void) | null = null;
let onLeaderboardUpdatedCb: ((data: { game: string; entries: any[] }) => void) | null = null;

export function onLeaderboardSync(cb: (data: Record<string, any[]>) => void): void { onLeaderboardSyncCb = cb; }
export function onLeaderboardUpdated(cb: (data: { game: string; entries: any[] }) => void): void { onLeaderboardUpdatedCb = cb; }

// === OKIYA API ===
export function createOkiyaGameMp(): void {
  socket?.emit('okiya:create');
}

export function joinOkiyaGameMp(gameId: string): void {
  socket?.emit('okiya:join', gameId);
}

export function playOkiyaMoveMp(gameId: string, r: number, c: number): void {
  socket?.emit('okiya:play', { gameId, r, c });
}

export function leaveOkiyaGame(): void {
  socket?.emit('okiya:leave');
}

let onOkiyaStateCb: ((game: any) => void) | null = null;
let onOkiyaErrorCb: ((error: string) => void) | null = null;

export function onOkiyaState(cb: (game: any) => void): void { onOkiyaStateCb = cb; }
export function onOkiyaError(cb: (error: string) => void): void { onOkiyaErrorCb = cb; }
