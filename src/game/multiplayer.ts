import { io, type Socket } from 'socket.io-client';

// === Types ===
export interface RemotePlayer {
  id: string;
  name: string;
  charId: string;
  hatId: string;
  x: number;
  y: number;
  color: string;
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

// === Public API ===

export function connectMultiplayer(name: string, charId: string, hatId: string, color: string): void {
  if (socket?.connected) return;

  socket = io(process.env.NEXT_PUBLIC_SERVER_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    myId = socket!.id!;
    console.log('[MP] Connected:', myId);
    // Register player
    socket!.emit('player:register', { name, charId, hatId, color });
    registered = true;
    onConnect?.();
  });

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
}

export function disconnectMultiplayer(): void {
  socket?.disconnect();
  socket = null;
  myId = null;
  registered = false;
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
