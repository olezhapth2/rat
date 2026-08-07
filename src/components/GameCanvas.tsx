'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { TILE, EMOJI_CHAT, ALL_ITEMS, ACHIEVEMENTS, DAILY_QUESTS } from '../game/constants';
import type { GameObject } from '../game/constants';
import { createInputState, setupInputListeners, updatePlayer } from '../game/input';
import { createCamera, updateCamera, render } from '../game/renderer';
import { createInitialState, persistState, persistStateDebounced, updateBots, logActivity, unlockAchievement, addCoins, addXP, rpsGame, microwaveGame, buyItem, trackQuestProgress, claimQuestReward, getQuestProgress, getPlacedObjectsAsGameObjects, pickUpItem, dropItem, canPlaceItem, getItemEmoji, updateDropPreview, takeBackFromKryska, paintTile, removeTilePaint, resetAllTileOverrides, enterTilePaintMode, exitTilePaintMode, updateTilePaintPreview, setTilePaintTexture, findWallSnap, findFloorSnap } from '../game/state';
import type { GameState, Activity } from '../game/state';
import { preloadCharacterSprites, updateAnimState } from '../game/sprites';
import { preloadTileTextures } from '../game/tiles';
import {
  connectMultiplayer, disconnectMultiplayer, sendPosition,
  sendRpsInvite, acceptRpsInvite, declineRpsInvite, sendRpsChoice, cancelRps,
  sendItemPlace, sendItemRemove,
  onPlayers, onPlayerMove, onInviteReceived, onInviteSent, onGameStarted, onGameResult, onGameDeclined, onGameCancelled,
  onConnected, onDisconnected, onItems,
  updateWhiteboard, requestWhiteboardSync, onWhiteboardUpdate,
  sendEmoji as mpSendEmoji, onEmoji,
  createCardGame as mpCreateCardGame, joinCardGame as mpJoinCardGame,
  playCardGame as mpPlayCardGame, drawCardGame as mpDrawCardGame,
  leaveCardGame as mpLeaveCardGame, onCardGameState, onCardGameError,
  onTileSync,
  sendTilePaint, sendTileRemove, sendTileReset,
  sendPlayerSave, onPlayerDataSync,
  type RemotePlayer, type RpsInvite, type RpsStarted, type RpsResult, type SharedItem,
} from '../game/multiplayer';
import { loginAsync, firstLoginAsync, getCurrentUser, logout, initAuth, markPhotoTaken, type UserData } from '../game/auth';
import { checkInteractions, getSmokingLeaderboard, saveSmokingRecord, BOOK_PREDICTIONS, type InteractionZone } from '../game/interactions';
import AdminPanel from './AdminPanel';
import { GameIcon, ICONS, type IconKey } from '../game/icons';
import { Icon } from '@iconify/react';
import RetroEffects from './RetroEffects';
import RetroPanel from './RetroPanel';
import { loadRetroSettings, RETRO_DEFAULTS, getColorFilter, getCrtIntensity, type RetroSettings } from '../game/retro';

interface CtxItem {
  icon: IconKey;
  text: string;
  fn: () => void;
}

export default function GameCanvas() {
  const [authUser, setAuthUser] = useState<UserData | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  const [secretToast, setSecretToast] = useState('');
  const [firstLogin, setFirstLogin] = useState(false);
  const [firstLoginEmail, setFirstLoginEmail] = useState('');
  // Onboarding state
  const [onboardingPhase, setOnboardingPhase] = useState<'none' | 'photo' | 'flash' | 'zoom'>('none');

  useEffect(() => {
    initAuth();
    setAuthUser(getCurrentUser());
    setReady(true);
  }, []);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    const res = await loginAsync(authEmail, authPass);
    setAuthLoading(false);
    if (res.ok && res.user) {
      if (res.firstLogin) {
        // Don't set authUser yet — first-login form needs authUser to be null
        setFirstLogin(true);
        setFirstLoginEmail(authEmail);
      } else {
        setAuthUser(res.user);
        setAuthError('');
        if (!res.user.photoTaken) {
          setOnboardingPhase('flash');
          setTimeout(() => setOnboardingPhase('zoom'), 400);
        }
      }
    } else {
      setAuthError(res.msg || 'Ошибка');
    }
  };

  const handleFirstLogin = async (password: string, name: string, role: string) => {
    setAuthLoading(true);
    setAuthError('');
    const res = await firstLoginAsync(firstLoginEmail, password, name, role);
    setAuthLoading(false);
    if (res.ok && res.user) {
      setFirstLogin(false);
      setAuthUser(res.user);
      setOnboardingPhase('flash');
      setTimeout(() => setOnboardingPhase('zoom'), 400);
    } else {
      setAuthError(res.msg || 'Ошибка');
    }
  };

  if (!authUser) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Press Start 2P', monospace" }}>
        <div className="px-panel" style={{ padding: 0, width: 420 }}>
          {/* Title bar */}
          <div className="px-panel-header">
            <span>SECRET GANG v1.0</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <button className="win-btn" style={{ fontWeight: 'bold', visibility: 'hidden' }}>_</button>
              <button className="win-btn" style={{ fontWeight: 'bold', visibility: 'hidden' }}>□</button>
              <button className="win-btn" style={{ fontWeight: 'bold', visibility: 'hidden' }}>X</button>
            </div>
          </div>
          {/* Content */}
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                onClick={() => {
                  setSecretClicks(prev => {
                    if (prev + 1 >= 5) {
                      try {
                        const raw = localStorage.getItem('secretgang');
                        const saved = raw ? JSON.parse(raw) : {};
                        saved.coins = (saved.coins || 100) + 50;
                        localStorage.setItem('secretgang', JSON.stringify(saved));
                      } catch {}
                      setSecretToast('🎁 СЕКРЕТ! +50 алт');
                      setTimeout(() => setSecretToast(''), 2500);
                      return 0;
                    }
                    return prev + 1;
                  });
                }}
                style={{ fontSize: 20, color: 'var(--px-text)', marginBottom: 8, letterSpacing: 2, cursor: 'pointer', userSelect: 'none' }}
              >
                SECRET GANG
              </div>
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', letterSpacing: 1 }}>
                OFFICE SIMULATOR
              </div>
            </div>

            {!firstLogin ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <input type="email" placeholder="EMAIL" className="px-input" value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />
                  <input type="password" placeholder="PASSWORD" className="px-input" value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />
                </div>
                {authError && (
                  <div style={{ color: 'var(--px-danger)', fontSize: 9, marginBottom: 14, textAlign: 'center', padding: '7px 10px', background: 'var(--px-panel)', border: '1px solid var(--px-danger)' }}>
                    {authError}
                  </div>
                )}
                <button onClick={handleAuth} disabled={authLoading} className="px-btn accent" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 12 }}>
                  {authLoading ? '...' : 'LOGIN'}
                </button>
              </>
            ) : (
              <FirstLoginForm email={firstLoginEmail} onSubmit={handleFirstLogin} error={authError} loading={authLoading} />
            )}

            {secretToast && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--px-panel)', border: '1px solid var(--px-accent)', color: 'var(--px-accent)', fontSize: 10, textAlign: 'center' }}>
                {secretToast}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Onboarding flow — flash + zoom after first login or photo
  if (onboardingPhase === 'flash' || onboardingPhase === 'zoom') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden', fontFamily: "'Press Start 2P', monospace" }}>
        {/* Camera flash */}
        {onboardingPhase === 'flash' && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 100, animation: 'fadeOut 0.4s ease-out forwards' }} />
        )}
        {/* Zoom animation */}
        {onboardingPhase === 'zoom' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              animation: 'zoomOut 2s ease-out forwards',
              transformOrigin: 'center center',
            }}>
              <img src={authUser!.avatar || `/sprites/pers/${authUser!.charId}.png`} alt="" style={{ width: 200, height: 200, imageRendering: 'pixelated' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)' }}>
              <div style={{ fontSize: 9, color: '#888', animation: 'pulse 1s infinite' }}>LOADING...</div>
            </div>
          </div>
        )}
        {/* After zoom completes, transition to game */}
        {onboardingPhase === 'zoom' && (
          <OnboardingLoader onComplete={() => {
            markPhotoTaken();
            setOnboardingPhase('none');
          }} />
        )}
      </div>
    );
  }

  return <GameInner authUser={authUser} />;
}

function GameInner({ authUser }: { authUser: UserData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(createCamera());
  const inputRef = useRef(createInputState());
  const frameRef = useRef(0);
  const stateRef = useRef<GameState>(createInitialState(authUser));
  const [, setTick] = useState(0);
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Record<string, unknown>>({});
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'info'>('info');
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  // Multiplayer state
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  const remotePlayersRef = useRef<RemotePlayer[]>([]);
  const [mpConnected, setMpConnected] = useState(false);
  const [rpsInvite, setRpsInvite] = useState<RpsInvite | null>(null);
  const [rpsGameState, setRpsGameState] = useState<RpsStarted | null>(null);
  const [rpsResult, setRpsResult] = useState<RpsResult | null>(null);
  const [rpsMyChoice, setRpsMyChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [rpsSentChoice, setRpsSentChoice] = useState(false);
  const lastPosSentRef = useRef(0);
  const remoteEmojisRef = useRef<Record<string, { emoji: string; time: number }>>({});
  const cardGameRef = useRef<any>(null);
  const cardGameMyHandRef = useRef<any[]>([]);
  const cardGameSelectedCardRef = useRef<string | null>(null);
  const cardGameShowColorPickerRef = useRef(false);
  const cardGamePendingWildRef = useRef<string | null>(null);

  // Interaction + smoking minigame
  const [nearInteraction, setNearInteraction] = useState<InteractionZone | null>(null);
  const [smokingGame, setSmokingGame] = useState<{ active: boolean; startTime: number; taps: number; targetTaps: number } | null>(null);
  const [smokingResult, setSmokingResult] = useState<{ time: number; board: ReturnType<typeof getSmokingLeaderboard> } | null>(null);

  // Card game state
  const [cardGame, setCardGame] = useState<any>(null);
  const [cardGameMyHand, setCardGameMyHand] = useState<any[]>([]);
  const [cardGameSelectedCard, setCardGameSelectedCard] = useState<string | null>(null);
  const [cardGameShowColorPicker, setCardGameShowColorPicker] = useState(false);
  const [cardGamePendingWild, setCardGamePendingWild] = useState<string | null>(null);

  // Active minigame overlay state
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const activeGameRef = useRef<string | null>(null);
  const saveToServerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToServer = useCallback(() => {
    if (saveToServerTimerRef.current) clearTimeout(saveToServerTimerRef.current);
    saveToServerTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      sendPlayerSave({
        name: s.player.name,
        charId: s.player.charId,
        hatId: s.player.hatId,
        coins: s.player.coins,
        xp: s.player.xp,
        level: s.player.level,
        furniture: s.player.furniture,
        achievements: s.player.achievements,
        wallColor: s.player.wallColor,
        doorName: s.player.doorName,
        av: s.player.av,
        role: s.player.role,
        dailyQuests: s.dailyQuests,
      });
    }, 2000);
  }, []);

  // Tile painting picker state
  const [tilePicker, setTilePicker] = useState<{ type: 'floor' | 'wall'; x: number; y: number } | null>(null);
  // Admin panel
  const [showAdmin, setShowAdmin] = useState(false);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: CtxItem[] } | null>(null);

  // Retro effects state — init with defaults, load from localStorage on client only
  const [retroSettings, setRetroSettings] = useState<RetroSettings>(RETRO_DEFAULTS);

  // Load retro settings from localStorage on client mount (avoid SSR hydration mismatch)
  useEffect(() => {
    setRetroSettings(loadRetroSettings());
  }, []);

  // Minigame canvas state refs
  const basketballRef = useRef({ score: 0, attempts: 10, frame: 0, ball: { x: 80, y: 320, vx: 0, vy: 0, flying: false, scored: false }, dragStart: null as { x: number; y: number } | null });
  const furnitureTossRef = useRef({ score: 0, attempts: 8, items: [] as { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; landed: boolean; prevY: number }[], targetZone: { x: 140, y: 140, w: 120, h: 80 }, dragging: null as { x: number; y: number } | null, currentItem: null as { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; landed: boolean; prevY: number } | null, spawnTimer: 0 });
  const microwaveRef = useRef({ status: 'waiting' as 'waiting' | 'running' | 'done', startTime: 0, elapsed: 0, result: null as { stoppedAt: string; diff: number; result: string; reward: number } | null });
  const smokeCanvasRef = useRef({ taps: 0, targetTaps: 30, startTime: 0, active: false, done: false, won: false, timeLeft: 20, lastTick: 0 });
  const minigameMouseRef = useRef({ x: 0, y: 0, down: false, clicked: false, released: false });
  const cachedPlacedObjsRef = useRef<GameObject[]>([]);
  const cachedPlacedVersionRef = useRef(-1);

  const state = stateRef.current;
  const player = state.player;

  const openModal = useCallback((type: string, data: Record<string, unknown> = {}) => {
    setModalType(type);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    setModalData({});
  }, []);

  const toast = useCallback((msg: string, type: 'ok' | 'info' = 'info') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 2500);
  }, []);

  const confetti = useCallback(() => {
    setConfettiTrigger((t) => t + 1);
  }, []);

  const sendEmoji = useCallback((emoji: string) => {
    stateRef.current.player._lastEmoji = emoji;
    stateRef.current.player._emojiTime = Date.now();
    logActivity(stateRef.current, emoji, 'использовал эмодзи');
    trackQuestProgress(stateRef.current, 'emoji_5');
    mpSendEmoji(emoji);
  }, []);

  const openTilePicker = useCallback((type: 'floor' | 'wall', x: number, y: number) => {
    // Enter paint mode instead of popup
    const state = stateRef.current;
    enterTilePaintMode(state, type, 0);
    setTilePicker(null);
    setCtxMenu(null);
  }, []);

  // Input listeners
  useEffect(() => {
    const cleanup = setupInputListeners(inputRef.current, canvasRef, (delta) => {
      const state = stateRef.current;
      if (state.tilePaintMode?.active) {
        const newIdx = state.tilePaintMode.textureIndex + delta;
        if (newIdx >= 0 && newIdx < 5) {
          setTilePaintTexture(state, newIdx);
        }
      }
    });
    return cleanup;
  }, []);

  // Sync activeGameRef
  useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);

  // ESC key handler for closing tile picker / exiting paint mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tilePicker) {
          setTilePicker(null);
          return;
        }
        const state = stateRef.current;
        if (state.tilePaintMode?.active) {
          exitTilePaintMode(state);
          return;
        }
      }
      // Number keys 1-5 to switch texture in paint mode
      const state = stateRef.current;
      if (state.tilePaintMode?.active && e.key >= '1' && e.key <= '5') {
        setTilePaintTexture(state, parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tilePicker]);

  // ESC key handler for closing minigames
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeGameRef.current) {
        const game = activeGameRef.current;
        if (game === 'basketball') {
          basketballRef.current = { score: 0, attempts: 10, frame: 0, ball: { x: 80, y: 320, vx: 0, vy: 0, flying: false, scored: false }, dragStart: null };
        } else if (game === 'furniture_toss') {
          furnitureTossRef.current = { score: 0, attempts: 8, items: [], targetZone: { x: 140, y: 140, w: 120, h: 80 }, dragging: null, currentItem: null, spawnTimer: 0 };
        } else if (game === 'microwave') {
          microwaveRef.current = { status: 'waiting', startTime: 0, elapsed: 0, result: null };
        } else if (game === 'smoke') {
          smokeCanvasRef.current = { taps: 0, targetTaps: 30, startTime: 0, active: false, done: false, won: false, timeLeft: 20, lastTick: 0 };
        }
        setActiveGame(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Sync card game state refs
  useEffect(() => { cardGameRef.current = cardGame; }, [cardGame]);
  useEffect(() => { cardGameMyHandRef.current = cardGameMyHand; }, [cardGameMyHand]);
  useEffect(() => { cardGameSelectedCardRef.current = cardGameSelectedCard; }, [cardGameSelectedCard]);
  useEffect(() => { cardGameShowColorPickerRef.current = cardGameShowColorPicker; }, [cardGameShowColorPicker]);
  useEffect(() => { cardGamePendingWildRef.current = cardGamePendingWild; }, [cardGamePendingWild]);

  // ESC key to close card game
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cardGameRef.current) {
        mpLeaveCardGame();
        setCardGame(null);
        setCardGameMyHand([]);
        setCardGameSelectedCard(null);
        setCardGameShowColorPicker(false);
        setCardGamePendingWild(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Left-click: place carried item OR click-to-move
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onLeftClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Ignore clicks on UI elements
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      // If a minigame is active, handle minigame click instead
      if (activeGameRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gx = (canvas.width - 400) / 2;
        const gy = (canvas.height - 400) / 2;
        const localX = e.clientX - gx;
        const localY = e.clientY - gy;
        handleMinigameClick(localX, localY);
        return;
      }
      const s = stateRef.current;
      const cam = cameraRef.current;
      const worldX = e.clientX / cam.zoom + cam.x;
      const worldY = e.clientY / cam.zoom + cam.y;

      // Paint mode: apply paint on click
      if (s.tilePaintMode?.active) {
        const tileX = Math.floor(worldX / TILE);
        const tileY = Math.floor(worldY / TILE);
        let snapX: number;
        let snapY: number;
        if (s.tilePaintMode.type === 'wall') {
          const wallSnap = findWallSnap(s.map, tileX, tileY);
          if (!wallSnap) return;
          snapX = wallSnap.x;
          snapY = wallSnap.y;
        } else {
          const floorSnap = findFloorSnap(s.map, tileX, tileY);
          if (!floorSnap) return;
          snapX = floorSnap.x;
          snapY = floorSnap.y;
        }
        paintTile(s, snapX, snapY, s.tilePaintMode.type, s.tilePaintMode.textureIndex);
        sendTilePaint(snapX, snapY, s.tilePaintMode.type, s.tilePaintMode.textureIndex);
        return;
      }

      if (s.player.carrying) {
        // Place carried item
        const def = ALL_ITEMS.find(i => i.id === s.player.carrying);
        if (!def) return;
        const dropX = worldX - (def.w * TILE) / 2;
        const dropY = worldY - (def.h * TILE) / 2;
        const res = dropItem(s, dropX, dropY);
        if (res.ok) {
          toast(res.msg, 'ok');
          const lastItem = s.player.placedItems[s.player.placedItems.length - 1];
          if (lastItem) {
            const d = ALL_ITEMS.find(i => i.id === lastItem.id);
            sendItemPlace({ id: lastItem.id, x: lastItem.x, y: lastItem.y, w: d?.w || 1, h: d?.h || 1 });
          }
        } else {
          toast(res.msg, 'info');
        }
      } else {
        // Click-to-move
        inputRef.current.clickTargetX = worldX;
        inputRef.current.clickTargetY = worldY;
      }
    };
    canvas.addEventListener('click', onLeftClick);
    return () => canvas.removeEventListener('click', onLeftClick);
  }, [toast]);

  // Minigame mouse/touch handlers
  const handleMinigameClick = useCallback((localX: number, localY: number) => {
    const game = activeGameRef.current;
    if (!game) return;
    if (game === 'basketball') {
      const g = basketballRef.current;
      const dx = localX - g.ball.x;
      const dy = localY - g.ball.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40 && !g.ball.flying && g.attempts > 0) {
        g.dragStart = { x: localX, y: localY };
      }
    } else if (game === 'furniture_toss') {
      const g = furnitureTossRef.current;
      if (g.currentItem && !g.currentItem.landed) {
        const dx = localX - g.currentItem.x;
        const dy = localY - g.currentItem.y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          g.dragging = { x: localX, y: localY };
        }
      }
    } else if (game === 'microwave') {
      const g = microwaveRef.current;
      const btnX = 200; const btnY = 320; const btnW = 120; const btnH = 40;
      if (localX > btnX - btnW / 2 && localX < btnX + btnW / 2 && localY > btnY - btnH / 2 && localY < btnY + btnH / 2) {
        if (g.status === 'waiting') {
          g.status = 'running';
          g.startTime = performance.now();
          g.elapsed = 0;
          g.result = null;
        } else if (g.status === 'running') {
          const stoppedAt = performance.now() - g.startTime;
          const res = microwaveGame(stateRef.current, stoppedAt);
          g.result = res;
          g.status = 'done';
          g.elapsed = stoppedAt;
          if (res.reward > 0) {
            if (res.reward >= 35) addXP(stateRef.current, 15);
            else if (res.reward >= 25) addXP(stateRef.current, 10);
            else addXP(stateRef.current, 5);
            toast(`+${res.reward} COINS`, 'ok');
          }
          logActivity(stateRef.current, '⏱️', `Heated lunch: ${res.stoppedAt}`);
        } else if (g.status === 'done') {
          g.status = 'waiting';
          g.elapsed = 0;
          g.result = null;
        }
      }
    } else if (game === 'smoke') {
      const g = smokeCanvasRef.current;
      if (g.done) {
        setActiveGame(null);
      } else if (g.active && !g.done) {
        const btnX = 200; const btnY = 260; const btnR = 55;
        const dx = localX - btnX;
        const dy = localY - btnY;
        if (Math.sqrt(dx * dx + dy * dy) < btnR) {
          g.taps++;
          if (g.taps >= g.targetTaps && !g.done) {
            g.done = true;
            g.won = true;
            const elapsed = Date.now() - g.startTime;
            const board = saveSmokingRecord(stateRef.current.player.name, elapsed);
            addCoins(stateRef.current, 20);
            addXP(stateRef.current, 15);
            unlockAchievement(stateRef.current, 'smoker');
            trackQuestProgress(stateRef.current, 'smoke_1');
            logActivity(stateRef.current, '🚬', 'Smoked in the smoking room');
            toast('+20 COINS SMOKED!', 'ok');
            setSmokingResult({ time: elapsed, board });
          }
        }
      }
    }
  }, [toast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      // Paint mode: update preview position
      const s = stateRef.current;
      if (s.tilePaintMode?.active) {
        const cam = cameraRef.current;
        const worldX = e.clientX / cam.zoom + cam.x;
        const worldY = e.clientY / cam.zoom + cam.y;
        const tileX = Math.floor(worldX / TILE);
        const tileY = Math.floor(worldY / TILE);
        let snapX: number;
        let snapY: number;
        if (s.tilePaintMode.type === 'wall') {
          const wallSnap = findWallSnap(s.map, tileX, tileY);
          if (!wallSnap) { updateTilePaintPreview(s, -1, -1); return; }
          snapX = wallSnap.x;
          snapY = wallSnap.y;
        } else {
          const floorSnap = findFloorSnap(s.map, tileX, tileY);
          if (!floorSnap) { updateTilePaintPreview(s, -1, -1); return; }
          snapX = floorSnap.x;
          snapY = floorSnap.y;
        }
        updateTilePaintPreview(s, snapX, snapY);
        return;
      }
      if (!activeGameRef.current) return;
      const gx = (canvas.width - 400) / 2;
      const gy = (canvas.height - 400) / 2;
      const localX = e.clientX - gx;
      const localY = e.clientY - gy;
      minigameMouseRef.current.x = localX;
      minigameMouseRef.current.y = localY;
      const game = activeGameRef.current;
      if (game === 'basketball' && basketballRef.current.dragStart) {
        basketballRef.current.dragStart = { x: localX, y: localY };
      } else if (game === 'furniture_toss' && furnitureTossRef.current.dragging) {
        furnitureTossRef.current.dragging = { x: localX, y: localY };
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!activeGameRef.current) return;
      const gx = (canvas.width - 400) / 2;
      const gy = (canvas.height - 400) / 2;
      const localX = e.clientX - gx;
      const localY = e.clientY - gy;
      const game = activeGameRef.current;
      if (game === 'basketball') {
        const g = basketballRef.current;
        if (!g.dragStart) return;
        const dx = g.ball.x - g.dragStart.x;
        const dy = g.ball.y - g.dragStart.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.12, 12);
        const angle = Math.atan2(dy, dx);
        g.ball.vx = Math.cos(angle) * power;
        g.ball.vy = Math.sin(angle) * power;
        g.ball.flying = true;
        g.ball.scored = false;
        g.dragStart = null;
      } else if (game === 'furniture_toss') {
        const g = furnitureTossRef.current;
        if (!g.dragging || !g.currentItem) return;
        const dx = g.currentItem.x - g.dragging.x;
        const dy = g.currentItem.y - g.dragging.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.1, 10);
        const angle = Math.atan2(dy, dx);
        g.currentItem.vx = Math.cos(angle) * power;
        g.currentItem.vy = Math.sin(angle) * power;
        g.items.push(g.currentItem);
        g.currentItem = null;
        g.dragging = null;
        g.attempts--;
        if (g.attempts <= 0) {
          setTimeout(() => {
            const coins = g.score * 10;
            addCoins(stateRef.current, coins);
            toast(g.score >= 5 ? `🏆 ОТЛИЧНО! ${g.score}/8 → +${coins} алт` : `${g.score}/8 → +${coins} алт`, g.score >= 5 ? 'ok' : 'info');
            if (g.score >= 5) { /* confetti handled via toast */ }
            g.score = 0;
            g.attempts = 8;
            g.items = [];
            spawnFurnitureItem(g);
          }, 500);
        } else {
          setTimeout(() => spawnFurnitureItem(g), 300);
        }
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!activeGameRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const gx = (canvas.width - 400) / 2;
      const gy = (canvas.height - 400) / 2;
      const localX = t.clientX - gx;
      const localY = t.clientY - gy;
      handleMinigameClick(localX, localY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!activeGameRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const gx = (canvas.width - 400) / 2;
      const gy = (canvas.height - 400) / 2;
      const localX = t.clientX - gx;
      const localY = t.clientY - gy;
      const game = activeGameRef.current;
      if (game === 'basketball' && basketballRef.current.dragStart) {
        basketballRef.current.dragStart = { x: localX, y: localY };
      } else if (game === 'furniture_toss' && furnitureTossRef.current.dragging) {
        furnitureTossRef.current.dragging = { x: localX, y: localY };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!activeGameRef.current) return;
      e.preventDefault();
      onMouseUp(new MouseEvent('mouseup'));
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [toast, handleMinigameClick]);

  // Card game canvas click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      const cg = cardGameRef.current;
      if (!cg || cg.status !== 'playing') return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = canvas.width;
      const H = canvas.height;
      const myId = (window as any).__mpMyId;
      const isMyTurn = cg.players[cg.currentTurn]?.id === myId;

      // Color picker
      if (cardGameShowColorPickerRef.current && cardGamePendingWildRef.current) {
        const colorMap: Record<string, string> = { red: '#c0392b', blue: '#2980b9', green: '#27ae60', yellow: '#f39c12' };
        const colors = ['red', 'blue', 'green', 'yellow'];
        const btnSize = 50;
        const btnGap = 16;
        const totalBtnW = colors.length * btnSize + (colors.length - 1) * btnGap;
        const btnStartX = (W - totalBtnW) / 2;
        const by = H / 2 - 30;

        for (let i = 0; i < colors.length; i++) {
          const bx = btnStartX + i * (btnSize + btnGap);
          if (mx >= bx && mx <= bx + btnSize && my >= by && my <= by + btnSize) {
            mpPlayCardGame(cardGamePendingWildRef.current, colors[i]);
            setCardGameShowColorPicker(false);
            setCardGamePendingWild(null);
            setCardGameSelectedCard(null);
            return;
          }
        }
        return;
      }

      // Close button
      if (mx >= W - 30 && mx <= W - 10 && my >= 10 && my <= 30) {
        mpLeaveCardGame();
        setCardGame(null);
        setCardGameMyHand([]);
        setCardGameSelectedCard(null);
        setCardGameShowColorPicker(false);
        setCardGamePendingWild(null);
        return;
      }

      if (!isMyTurn) return;

      // Draw button
      if (mx >= 20 && mx <= 100 && my >= H - 95 && my <= H - 63) {
        mpDrawCardGame();
        setCardGameSelectedCard(null);
        return;
      }

      // Play button
      if (cardGameSelectedCardRef.current && mx >= W - 100 && mx <= W - 20 && my >= H - 95 && my <= H - 63) {
        const selectedId = cardGameSelectedCardRef.current;
        const card = cardGameMyHandRef.current.find((c: any) => c.id === selectedId);
        if (card && card.color === null) {
          // Wild card - show color picker
          setCardGameShowColorPicker(true);
          setCardGamePendingWild(selectedId);
        } else {
          mpPlayCardGame(selectedId);
          setCardGameSelectedCard(null);
        }
        return;
      }

      // Card selection
      const cardW = 52;
      const cardH = 74;
      const gap = 8;
      const hand = cardGameMyHandRef.current;
      const totalW = hand.length * (cardW + gap) - gap;
      const startX = (W - totalW) / 2;

      for (let i = 0; i < hand.length; i++) {
        const x = startX + i * (cardW + gap);
        const y = H - 95;
        const isSelected = cardGameSelectedCardRef.current === hand[i].id;
        const cardY = isSelected ? y - 12 : y;
        if (mx >= x && mx <= x + cardW && my >= cardY && my <= cardY + cardH) {
          if (cardGameSelectedCardRef.current === hand[i].id) {
            // Double click = play
            if (hand[i].color === null) {
              setCardGameShowColorPicker(true);
              setCardGamePendingWild(hand[i].id);
            } else {
              mpPlayCardGame(hand[i].id);
              setCardGameSelectedCard(null);
            }
          } else {
            setCardGameSelectedCard(hand[i].id);
          }
          return;
        }
      }

      // Click on empty area = deselect
      setCardGameSelectedCard(null);
    };
    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, []);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Preload character sprites + tile textures
  useEffect(() => {
    preloadCharacterSprites(
      (loaded, total) => console.log(`Sprites: ${loaded}/${total}`),
      () => console.log('All sprites loaded')
    );
    preloadTileTextures();
  }, []);

  // Multiplayer connection
  useEffect(() => {
    const s = stateRef.current;
    connectMultiplayer(s.player.name, s.player.charId, s.player.hatId);

    onConnected(() => {
      setMpConnected(true);
      // Store my ID for filtering
      import('../game/multiplayer').then(mp => {
        (window as any).__mpMyId = mp.getMyId();
      });
    });
    onDisconnected(() => setMpConnected(false));

    onPlayers((players) => {
      // Filter out self
      const myId = (window as any).__mpMyId;
      const filtered = players.filter(p => p.id !== myId);
      remotePlayersRef.current = filtered;
      setRemotePlayers(filtered);
    });

    onPlayerMove((data) => {
      remotePlayersRef.current = remotePlayersRef.current.map(p =>
        p.id === data.id ? { ...p, x: data.x, y: data.y } : p
      );
      setRemotePlayers([...remotePlayersRef.current]);
    });

    onInviteReceived((data) => {
      setRpsInvite(data);
      toast(`🎮 ${data.fromName}邀请你 КНБ!`, 'info');
    });

    onGameStarted((data) => {
      setRpsGameState(data);
      setRpsInvite(null);
      setRpsMyChoice(null);
      setRpsSentChoice(false);
      openModal('mp_rps', { gameId: data.gameId, opponentName: data.opponentName });
    });

    onGameResult((data) => {
      setRpsResult(data);
      setRpsGameState(null);
      if (data.reward > 0) {
        addCoins(stateRef.current, data.reward);
        if (data.winner === 'you') addXP(stateRef.current, 20);
        toast(`+${data.reward} алт ${data.winner === 'you' ? 'Победа!' : data.winner === 'draw' ? 'Ничья' : ''}`, data.winner === 'you' ? 'ok' : 'info');
        if (data.winner === 'you') confetti();
      } else {
        toast(`${data.winner === 'them' ? 'Проиграл' : 'Ничья'}!`, 'info');
      }
      logActivity(stateRef.current, '🎮', `КНБ с ${data.gameId}: ${data.winner}`);
    });

    onGameDeclined(() => {
      toast('Игрок отказался', 'info');
      setRpsInvite(null);
    });

    onGameCancelled(() => {
      toast('Игра отменена', 'info');
      setRpsGameState(null);
      setRpsMyChoice(null);
      setRpsSentChoice(false);
    });

    const itemsMap = new Map(ALL_ITEMS.map(i => [i.id, i]));
    onItems((items: SharedItem[]) => {
      const s = stateRef.current;
      s.player.placedItems = items.map(si => {
        const def = itemsMap.get(si.id);
        return {
          id: si.id,
          x: si.x,
          y: si.y,
          surface: def?.surface || 'floor',
          placedBy: 'server',
        };
      });
      s._placedItemsVersion++;
      persistStateDebounced(s);
    });

    onEmoji((data) => {
      remoteEmojisRef.current[data.playerId] = { emoji: data.emoji, time: Date.now() };
    });

    onCardGameState((game) => {
      setCardGame(game);
      const myId = (window as any).__mpMyId;
      const me = game.players.find((p: any) => p.id === myId);
      if (me) setCardGameMyHand(me.hand);
    });

    onCardGameError((error) => {
      toast(error, 'info');
    });

    onTileSync((overrides) => {
      stateRef.current.tileOverrides = overrides;
    });

    onPlayerDataSync((data) => {
      const s = stateRef.current;
      // Apply server data to local state (NO placedItems — managed by items:sync)
      if (data.coins !== undefined) s.player.coins = data.coins;
      if (data.xp !== undefined) s.player.xp = data.xp;
      if (data.level !== undefined) s.player.level = data.level;
      if (data.furniture) s.player.furniture = data.furniture;
      if (data.achievements) s.player.achievements = data.achievements;
      if (data.wallColor) s.player.wallColor = data.wallColor;
      if (data.doorName) s.player.doorName = data.doorName;
      if (data.dailyQuests) s.dailyQuests = data.dailyQuests;
      console.log('[MP] Player data synced from server');
    });

    return () => disconnectMultiplayer();
  }, []);

  // Context menu
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (activeGameRef.current) return;
      const cam = cameraRef.current;
      const worldX = e.clientX / cam.zoom + cam.x;
      const worldY = e.clientY / cam.zoom + cam.y;
      const s = stateRef.current;

      let foundBot: (typeof s.bots)[0] | null = null;
      const onlineIdsCtx = new Set(remotePlayersRef.current.map(rp => rp.charId));
      onlineIdsCtx.add(s.player.charId);
      for (const bot of s.bots) {
        if (onlineIdsCtx.has(bot.id)) continue;
        const dx = worldX - bot.x;
        const dy = worldY - bot.y;
        if (Math.sqrt(dx * dx + dy * dy) < TILE * 1.5) {
          foundBot = bot;
          break;
        }
      }

      let foundObj: GameObject | null = null;
      for (const obj of s.objects) {
        if (!obj.solid) continue;
        if (worldX >= obj.x && worldX <= obj.x + obj.w * TILE && worldY >= obj.y && worldY <= obj.y + obj.h * TILE) {
          foundObj = obj;
          break;
        }
      }

      // Check placed items
      let foundPlacedIdx = -1;
      for (let i = 0; i < s.player.placedItems.length; i++) {
        const pi = s.player.placedItems[i];
        const piDef = ALL_ITEMS.find(item => item.id === pi.id);
        if (!piDef) continue;
        if (
          worldX >= pi.x && worldX <= pi.x + piDef.w * TILE &&
          worldY >= pi.y && worldY <= pi.y + piDef.h * TILE
        ) {
          foundPlacedIdx = i;
          break;
        }
      }

      // Check if player is near any placed item (for pick up)
      let nearestPlacedIdx = -1;
      let nearestPlacedDist = Infinity;
      for (let i = 0; i < s.player.placedItems.length; i++) {
        const pi = s.player.placedItems[i];
        const piDef = ALL_ITEMS.find(item => item.id === pi.id);
        if (!piDef) continue;
        const itemCX = pi.x + (piDef.w * TILE) / 2;
        const itemCY = pi.y + (piDef.h * TILE) / 2;
        const dx = s.player.x - itemCX;
        const dy = s.player.y - itemCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < TILE * 2.5 && dist < nearestPlacedDist) {
          nearestPlacedDist = dist;
          nearestPlacedIdx = i;
        }
      }

      const items: CtxItem[] = [];

      if (foundBot) {
        if (foundBot.id === 'kryska') {
          items.push({ icon: 'talk', text: 'Поговорить', fn: () => { addCoins(stateRef.current, 5); addXP(stateRef.current, 10); logActivity(stateRef.current, '🐀', 'Поговорил с Крыской'); unlockAchievement(stateRef.current, 'first_talk'); trackQuestProgress(stateRef.current, 'talk_3'); toast('+5 алт', 'ok'); } });
          if ((foundBot as any)._stolenCoins > 0) {
            const coins = (foundBot as any)._stolenCoins;
            items.push({ icon: 'coins', text: `Вернуть ${coins} алт`, fn: () => {
              const res = takeBackFromKryska(stateRef.current, 'kryska');
              toast(res.msg, res.ok ? 'ok' : 'info');
            }});
          }
        } else {
          items.push({ icon: 'talk', text: `Поговорить с ${foundBot.name}`, fn: () => { logActivity(stateRef.current, '💬', `Поговорил с ${foundBot.name}`); unlockAchievement(stateRef.current, 'first_talk'); addCoins(stateRef.current, 5); addXP(stateRef.current, 10); trackQuestProgress(stateRef.current, 'talk_3'); openModal('talk', { bot: foundBot }); } });
          items.push({ icon: 'rock', text: 'КНБ', fn: () => { trackQuestProgress(stateRef.current, 'rps_3'); openModal('rps', { bot: foundBot }); } });
          items.push({ icon: 'walk', text: 'Кабинет', fn: () => { logActivity(stateRef.current, '🚶', `Посетил кабинет ${foundBot.name}`); toast(`Ты у ${foundBot.name}`, 'ok'); } });
        }
      }

      // Check for remote players nearby
      for (const rp of remotePlayersRef.current) {
        const dx = worldX - rp.x;
        const dy = worldY - rp.y;
        if (Math.sqrt(dx * dx + dy * dy) < TILE * 1.5) {
          items.push({ icon: 'profile', text: `Профиль ${rp.name}`, fn: () => openModal('profile', { remotePlayer: rp }) });
          items.push({ icon: 'game', text: `КНБ с ${rp.name}`, fn: () => { sendRpsInvite(rp.id); toast(`Приглашение отправлено ${rp.name}`, 'info'); } });
          break;
        }
      }

      if (foundObj) {
        items.push({ icon: 'furniture', text: foundObj.label || foundObj.id, fn: () => {} });
      }

      // Placed item nearby — pick up option
      if (nearestPlacedIdx >= 0 && s.player.carrying === null) {
        const pi = s.player.placedItems[nearestPlacedIdx];
        const piDef = ALL_ITEMS.find(item => item.id === pi.id);
        items.push({
          icon: 'inventory',
          text: `Взять: ${piDef?.e || ''} ${piDef?.n || ''}`,
          fn: () => {
            const removedItem = s.player.placedItems[nearestPlacedIdx];
            const res = pickUpItem(s, nearestPlacedIdx);
            if (res.ok) { toast(res.msg, 'ok'); sendItemRemove(nearestPlacedIdx, removedItem?.id || ''); }
            else toast(res.msg, 'info');
          }
        });
        items.push({
          icon: 'move',
          text: `Переставить: ${piDef?.e || ''} ${piDef?.n || ''}`,
          fn: () => {
            const removedItem = s.player.placedItems[nearestPlacedIdx];
            const res = pickUpItem(s, nearestPlacedIdx);
            if (res.ok) {
              s.player.carrying = pi.id;
              sendItemRemove(nearestPlacedIdx, removedItem?.id || '');
              toast(`Переставь ${piDef?.e || ''}`, 'ok');
            } else toast(res.msg, 'info');
          }
        });
      }

      // Currently carrying — drop option
      if (s.player.carrying) {
        const carryDef = ALL_ITEMS.find(item => item.id === s.player.carrying);
        items.push({
          icon: 'place',
          text: `Поставить: ${carryDef?.e || ''}`,
          fn: () => {
            const dropX = s.player.x - (carryDef?.w || 1) * TILE / 2;
            const dropY = s.player.y + TILE * 0.3;
            const res = dropItem(s, dropX, dropY);
            if (res.ok) {
              toast(res.msg, 'ok');
              const lastItem = s.player.placedItems[s.player.placedItems.length - 1];
              if (lastItem) {
                const def = ALL_ITEMS.find(i => i.id === lastItem.id);
                sendItemPlace({ id: lastItem.id, x: lastItem.x, y: lastItem.y, w: def?.w || 1, h: def?.h || 1 });
              }
            } else toast(res.msg, 'info');
          }
        });
        items.push({
          icon: 'backpack',
          text: `Убрать в инвентарь: ${carryDef?.e || ''}`,
          fn: () => {
            s.player.carrying = null;
            s.player._dropPreview = null;
            logActivity(stateRef.current, '🎒', `Убрал: ${carryDef?.e || ''}`);
            toast(`${carryDef?.e || ''} в инвентаре`, 'ok');
          }
        });
      }

      // Tile painting — floor/wall (3x3 block)
      if (!foundBot && !foundObj && nearestPlacedIdx < 0 && !s.player.carrying) {
        const playerTileX = Math.floor(s.player.x / TILE);
        const playerTileY = Math.floor(s.player.y / TILE);
        const tileType = s.map[playerTileY]?.[playerTileX];

        if (tileType === 1 || tileType === 3) {
          const floorSnap = findFloorSnap(s.map, playerTileX, playerTileY);
          if (floorSnap) {
            items.push({ icon: 'paint', text: 'Покрасить пол', fn: () => openTilePicker('floor', floorSnap.x, floorSnap.y) });
          }
        }

        // Check current tile AND adjacent tiles for walls (S=3 or W=2)
        const tilesToCheck = [
          { x: playerTileX, y: playerTileY },
          { x: playerTileX, y: playerTileY - 1 },
          { x: playerTileX, y: playerTileY + 1 },
          { x: playerTileX - 1, y: playerTileY },
          { x: playerTileX + 1, y: playerTileY },
        ];
        let wallPaintAdded = false;
        for (const t of tilesToCheck) {
          const tt = s.map[t.y]?.[t.x];
          if (tt === 3) {
            const wallSnap = findWallSnap(s.map, t.x, t.y);
            if (wallSnap && !wallPaintAdded) {
              items.push({ icon: 'paint', text: 'Покрасить стену', fn: () => openTilePicker('wall', wallSnap.x, wallSnap.y) });
              wallPaintAdded = true;
            }
          }
        }

        const floorKey = `floor:${playerTileX},${playerTileY}`;
        const wallKey = `wall:${playerTileX},${playerTileY}`;
        const hasFloor = s.tileOverrides[floorKey];
        const hasWall = s.tileOverrides[wallKey];
        if (hasFloor) {
          items.push({
            icon: 'trash', text: 'Убрать покраску пола',
            fn: () => {
              removeTilePaint(s, playerTileX, playerTileY, 'floor');
              sendTileRemove(playerTileX, playerTileY, 'floor');
            }
          });
        }
        if (hasWall) {
          items.push({
            icon: 'trash', text: 'Убрать покраску стены',
            fn: () => {
              removeTilePaint(s, playerTileX, playerTileY, 'wall');
              sendTileRemove(playerTileX, playerTileY, 'wall');
            }
          });
        }
      }

      items.push({ icon: 'profile', text: 'Профиль', fn: () => openModal('profile') });
      items.push({ icon: 'quests', text: 'Дейли квесты', fn: () => openModal('quests') });
      items.push({ icon: 'shop', text: 'Магазин', fn: () => openModal('shop') });
      items.push({ icon: 'inventory', text: 'Инвентарь', fn: () => openModal('inventory') });
      items.push({ icon: 'whiteboard', text: 'Whiteboard', fn: () => openModal('whiteboard') });

      showCtx(e.clientX, e.clientY, items);
    };
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => canvas.removeEventListener('contextmenu', onContextMenu);
  }, [openModal, toast]);

  // Close ctx menu on click
  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  function showCtx(x: number, y: number, items: CtxItem[]) {
    setCtxMenu({
      x: Math.min(x, window.innerWidth - 250),
      y: Math.min(y, window.innerHeight - items.length * 44 - 16),
      items,
    });
  }

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastT = 0;
    let running = true;

    function loop(t: number) {
      if (!running || !canvas || !ctx) return;
      const dt = Math.min((t - lastT) / 16.67, 3);
      lastT = t;
      frameRef.current++;

      const s = stateRef.current;
      const cam = cameraRef.current;
      const input = inputRef.current;
      if (s._placedItemsVersion !== cachedPlacedVersionRef.current) {
        cachedPlacedObjsRef.current = getPlacedObjectsAsGameObjects(s);
        cachedPlacedVersionRef.current = s._placedItemsVersion;
      }
      const placedObjs = cachedPlacedObjsRef.current;
      const allObjects = [...s.objects, ...placedObjs];

      // Disable player movement when tile picker, card game, or minigame overlay is active
      if (tilePicker) {
        // Don't update player position while tile picker is open
      } else {
        const cgState = cardGameRef.current;
        if (cgState && cgState.status === 'playing') {
          // Don't update player position
        } else if (activeGameRef.current) {
          // Don't update player position during minigame
        } else {
          const { vx: playerVx, vy: playerVy } = updatePlayer(s.player, input, s.map, allObjects, dt);
          updateAnimState(s.player.anim, playerVx, playerVy);
        }
      }

      const onlineCharIds = new Set(remotePlayersRef.current.map(rp => rp.charId));
      onlineCharIds.add(s.player.charId);
      updateBots(s, dt, onlineCharIds);
      const visibleBots = s.bots.filter(b => !onlineCharIds.has(b.spriteId));
      // Update bot animations (only for visible bots)
      for (const bot of visibleBots) {
        const bvx = (bot as any)._lastVx ?? 0;
        const bvy = (bot as any)._lastVy ?? 0;
        if (s.botAnims[bot.id]) {
          updateAnimState(s.botAnims[bot.id], bvx, bvy);
        }
      }

      // Check interaction zones (placed mini-game items)
      const zone = checkInteractions(s.player.x, s.player.y);
      if (zone) {
        setNearInteraction(zone);
      } else {
        // Check placed items with mini-games
        let foundMiniGame: InteractionZone | null = null;
        for (const pi of s.player.placedItems) {
          const def = ALL_ITEMS.find(i => i.id === pi.id);
          if (!(def as any)?.minigame) continue;
          const itemCenterX = pi.x + (def!.w * TILE) / 2;
          const itemCenterY = pi.y + (def!.h * TILE) / 2;
          const dx = s.player.x - itemCenterX;
          const dy = s.player.y - itemCenterY;
          if (Math.sqrt(dx * dx + dy * dy) < TILE * 2.5) {
            foundMiniGame = {
              id: (def as any).minigame,
              x: itemCenterX,
              y: itemCenterY,
              radius: TILE * 2.5,
              label: def!.n,
              icon: def!.e,
            };
            break;
          }
        }
        setNearInteraction(foundMiniGame);
      }

      // Update drop preview for carried item — follows mouse cursor in real-time
      if (s.player.carrying && input.mouseX !== null && input.mouseY !== null) {
        const worldMX = input.mouseX / cam.zoom + cam.x;
        const worldMY = input.mouseY / cam.zoom + cam.y;
        updateDropPreview(s, worldMX, worldMY);
      } else {
        updateDropPreview(s);
      }

      updateCamera(cam, s.player, canvas.width, canvas.height);

      render(ctx, canvas, cam, s.map, [...s.objects, ...placedObjs], s.player, visibleBots, frameRef.current, [], s.player.carrying, s.player._dropPreview, s.player.anim, s.botAnims, remotePlayersRef.current, s.tileOverrides, s.tilePaintMode);

      // === Card game overlay ===
      const cg = cardGameRef.current;
      const cgHand = cardGameMyHandRef.current;
      const cgSelected = cardGameSelectedCardRef.current;
      const cgColorPicker = cardGameShowColorPickerRef.current;
      const cgPendingWild = cardGamePendingWildRef.current;
      if (cg && cg.status === 'playing') {
        const W = canvas.width;
        const H = canvas.height;

        // Dark overlay
        ctx.fillStyle = 'rgba(0,128,128,0.92)';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.fillStyle = '#8a7e30';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('O K I \u042F', W / 2, 36);

        // Draw the table (discard pile)
        const topCard = cg.discardPile[cg.discardPile.length - 1];
        if (topCard) {
          drawCardOnCanvas(ctx, topCard, W / 2 - 30, H / 2 - 50, 60, 84);
        }

        // Current color indicator
        const colorMap: Record<string, string> = { red: '#c0392b', blue: '#2980b9', green: '#27ae60', yellow: '#f39c12' };
        ctx.fillStyle = colorMap[cg.currentColor] || '#333';
        ctx.beginPath();
        ctx.arc(W / 2 + 50, H / 2 - 8, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw deck
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(W / 2 - 90, H / 2 - 50, 60, 84);
        ctx.strokeStyle = '#6e6428';
        ctx.lineWidth = 2;
        ctx.strokeRect(W / 2 - 90, H / 2 - 50, 60, 84);
        ctx.fillStyle = '#6e6428';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DECK', W / 2 - 60, H / 2 - 14);
        ctx.fillText(`${cg.deck.length}`, W / 2 - 60, H / 2 + 2);

        // My turn indicator
        const myId = (window as any).__mpMyId;
        const isMyTurn = cg.players[cg.currentTurn]?.id === myId;

        ctx.fillStyle = isMyTurn ? '#8a7e30' : '#5a5648';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isMyTurn ? 'YOUR TURN!' : `WAITING: ${cg.players[cg.currentTurn]?.name || '...'}`, W / 2, H - 110);

        // Draw hand cards
        const cardW = 52;
        const cardH = 74;
        const gap = 8;
        const totalW = cgHand.length * (cardW + gap) - gap;
        const startX = (W - totalW) / 2;

        for (let i = 0; i < cgHand.length; i++) {
          const c = cgHand[i];
          const x = startX + i * (cardW + gap);
          const y = H - 95;
          const selected = cgSelected === c.id;
          drawCardOnCanvas(ctx, c, x, selected ? y - 12 : y, cardW, cardH, selected);
        }

        // Draw buttons
        if (isMyTurn) {
          // Draw button
          const drawBtnX = 20;
          const drawBtnY = H - 95;
          ctx.fillStyle = '#1c1c2c';
          ctx.fillRect(drawBtnX, drawBtnY, 80, 32);
          ctx.strokeStyle = '#6e6428';
          ctx.lineWidth = 2;
          ctx.strokeRect(drawBtnX, drawBtnY, 80, 32);
          ctx.fillStyle = '#8a8470';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DRAW', drawBtnX + 40, drawBtnY + 20);

          // Play button (if card selected)
          if (cgSelected) {
            const playBtnX = W - 100;
            const playBtnY = H - 95;
            ctx.fillStyle = '#1c1c2c';
            ctx.fillRect(playBtnX, playBtnY, 80, 32);
            ctx.strokeStyle = '#6e6428';
            ctx.lineWidth = 2;
            ctx.strokeRect(playBtnX, playBtnY, 80, 32);
            ctx.fillStyle = '#8a7e30';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText('PLAY', playBtnX + 40, playBtnY + 20);
          }
        }

        // Players list on right side
        ctx.textAlign = 'right';
        ctx.font = '7px "Press Start 2P", monospace';
        for (let i = 0; i < cg.players.length; i++) {
          const p = cg.players[i];
          const isCurrent = i === cg.currentTurn;
          const isMe = p.id === myId;
          ctx.fillStyle = isCurrent ? '#8a7e30' : '#5a5648';
          ctx.fillText(`${isMe ? '> ' : ''}${p.name} [${p.hand.length}]`, W - 20, 60 + i * 20);
        }

        // Close button
        ctx.fillStyle = '#1c1c2c';
        ctx.fillRect(W - 30, 10, 20, 20);
        ctx.strokeStyle = '#5a3028';
        ctx.lineWidth = 1;
        ctx.strokeRect(W - 30, 10, 20, 20);
        ctx.fillStyle = '#5a3028';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', W - 20, 20);
        ctx.textBaseline = 'alphabetic';

        // Color picker overlay
        if (cgColorPicker && cgPendingWild) {
          ctx.fillStyle = 'rgba(0,128,128,0.85)';
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#8a7e30';
          ctx.font = '10px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('CHOOSE COLOR', W / 2, H / 2 - 60);

          const colors: { c: string; label: string }[] = [
            { c: 'red', label: 'RED' },
            { c: 'blue', label: 'BLUE' },
            { c: 'green', label: 'GREEN' },
            { c: 'yellow', label: 'YELLOW' },
          ];
          const btnSize = 50;
          const btnGap = 16;
          const totalBtnW = colors.length * btnSize + (colors.length - 1) * btnGap;
          const btnStartX = (W - totalBtnW) / 2;

          for (let i = 0; i < colors.length; i++) {
            const bx = btnStartX + i * (btnSize + btnGap);
            const by = H / 2 - 30;
            ctx.fillStyle = colorMap[colors[i].c];
            ctx.fillRect(bx, by, btnSize, btnSize);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, btnSize, btnSize);
            ctx.fillStyle = '#fff';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillText(colors[i].label, bx + btnSize / 2, by + btnSize / 2 + 3);
          }
        }

        // Winner overlay
        if (cg.status === 'finished') {
          ctx.fillStyle = 'rgba(0,128,128,0.85)';
          ctx.fillRect(0, 0, W, H);
          const winnerName = cg.players.find((p: any) => p.id === cg.winner)?.name || '???';
          const isMeWinner = cg.winner === myId;
          ctx.fillStyle = isMeWinner ? '#4ecca3' : '#e94560';
          ctx.font = 'bold 16px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(isMeWinner ? 'YOU WIN!' : `${winnerName} WINS!`, W / 2, H / 2 - 10);
          ctx.fillStyle = '#8a8470';
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.fillText('Press ESC to close', W / 2, H / 2 + 20);
        }
      }

      // === Minigame overlay ===
      if (activeGameRef.current) {
        const W = canvas.width;
        const H = canvas.height;
        const gx = (W - 400) / 2;
        const gy = (H - 400) / 2;

        // Dark overlay
        ctx.fillStyle = 'rgba(0,128,128,0.85)';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.translate(gx, gy);

        if (activeGameRef.current === 'basketball') {
          drawBasketballOnCanvas(ctx, basketballRef.current, s, toast, confetti);
        } else if (activeGameRef.current === 'furniture_toss') {
          drawFurnitureTossOnCanvas(ctx, furnitureTossRef.current, s, toast);
        } else if (activeGameRef.current === 'microwave') {
          drawMicrowaveOnCanvas(ctx, microwaveRef.current, s, toast);
        } else if (activeGameRef.current === 'smoke') {
          drawSmokeOnCanvas(ctx, smokeCanvasRef.current, s, toast);
        }

        ctx.restore();

        // Exit hint
        ctx.fillStyle = '#ffffff60';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('[ESC] CLOSE', W - 20, 30);
      }

      // Draw remote player emojis
      const now = Date.now();
      for (const rp of remotePlayersRef.current) {
        const re = remoteEmojisRef.current[rp.id];
        if (re && now - re.time < 3000) {
          const screenX = (rp.x - cam.x) * cam.zoom;
          const screenY = (rp.y - cam.y) * cam.zoom - 30;
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(re.emoji, screenX, screenY);
        } else if (re && now - re.time >= 3000) {
          delete remoteEmojisRef.current[rp.id];
        }
      }

      // Send position to server every 5 frames (~80ms)
      if (frameRef.current % 5 === 0) {
        sendPosition(s.player.x, s.player.y);
      }

      // Periodic save to server every 300 frames (~5 seconds)
      if (frameRef.current % 300 === 0) {
        saveToServer();
      }

      if (frameRef.current % 30 === 0) setTick((n) => n + 1);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    return () => { running = false; };
  }, []);

  const crtI = getCrtIntensity(retroSettings);

  return (
    <>
      {/* CRT Container */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          borderRadius: crtI > 0 ? `${8 + crtI * 12}px` : 0,
          transform: crtI > 0
            ? `perspective(${800 - crtI * 200}px) rotateX(${crtI * 1.5}deg) scale(${1 + crtI * 0.02})`
            : undefined,
          boxShadow: crtI > 0
            ? `inset 0 0 ${40 + crtI * 60}px rgba(0,0,0,${0.2 + crtI * 0.3})`
            : undefined,
        }}
      >
        <canvas ref={canvasRef} style={{ filter: getColorFilter(retroSettings) }} />
      </div>

      {/* Retro overlays (scanlines, noise, vignette) */}
      <RetroEffects settings={retroSettings}>
        <div />
      </RetroEffects>

      {/* Interaction buttons — pixel style */}
      {nearInteraction && !smokingGame && !smokingResult && nearInteraction.id === 'smoke' && (
        <button
          onClick={() => {
            smokeCanvasRef.current = { taps: 0, targetTaps: 30, startTime: Date.now(), active: true, done: false, won: false, timeLeft: 20, lastTick: Date.now() };
            setActiveGame('smoke');
          }}
          className="px-btn danger"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          🚬 ПЕРЕКУР
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'book_prediction' && (
        <button
          onClick={() => {
            if (Math.random() < 0.1) {
              addCoins(stateRef.current, 100);
              toast('🔍 СЕКРЕТНАЯ КОМНАТА! +100 алт', 'ok');
              unlockAchievement(stateRef.current, 'secret_finder');
            } else {
              const idx = Math.floor(Math.random() * BOOK_PREDICTIONS.length);
              openModal('book_prediction', { prediction: BOOK_PREDICTIONS[idx] });
            }
          }}
          className="px-btn"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          📖 ГРНУТЬ КНИГУ
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'basketball' && (
        <button
          onClick={() => {
            basketballRef.current = { score: 0, attempts: 10, frame: 0, ball: { x: 80, y: 320, vx: 0, vy: 0, flying: false, scored: false }, dragStart: null };
            setActiveGame('basketball');
          }}
          className="px-btn"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            background: '#ff6600', borderColor: '#cc5500', color: '#fff',
            animation: 'pulse 1.5s infinite',
          }}
        >
          🏀 БАСКЕТБОЛ
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'microwave' && (
        <button
          onClick={() => {
            microwaveRef.current = { status: 'waiting', startTime: 0, elapsed: 0, result: null };
            setActiveGame('microwave');
          }}
          className="px-btn accent"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          ⏱️ РАЗОГРЕТЬ ОБЕД
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'cardgame' && !cardGame && (
        <button
          onClick={() => mpCreateCardGame()}
          className="px-btn accent"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          🃏 СЫГРАТЬ В OKIЯ
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'cardgame' && cardGame && cardGame.status === 'waiting' && (
        <button
          onClick={() => {}}
          className="px-btn accent"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
          }}
        >
          🃏 ЖДЁМ ИГРОКОВ... ({cardGame.players.length}/4)
        </button>
      )}

      {/* Smoking result + leaderboard */}
      {smokingResult && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,128,128,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div className="px-panel" style={{ width: 360, textAlign: 'center' }}>
            <div className="px-panel-header">
              <span>LEADERBOARD</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>🏆</div>
              <div style={{ fontSize: 18, color: 'var(--px-text)', marginBottom: 3 }}>
                {(smokingResult.time / 1000).toFixed(1)}s
              </div>
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 16 }}>YOUR TIME</div>
              <div style={{ fontSize: 11, color: 'var(--px-text)', marginBottom: 10, textAlign: 'left' }}>
                🏅 TOP 3
              </div>
              {smokingResult.board.slice(0, 3).map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', marginBottom: 3,
                  background: 'var(--px-panel)',
                  border: i === 0 ? '1px solid var(--px-text)' : '1px solid var(--px-border-dark)',
                }}>
                  <span style={{ fontSize: 13 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span style={{ flex: 1, fontSize: 9, color: 'var(--px-text)' }}>{r.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>{(r.time / 1000).toFixed(1)}s</span>
                </div>
              ))}
              <button onClick={() => setSmokingResult(null)} className="px-btn accent" style={{ marginTop: 12 }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Paint mode HUD */}
      {state.tilePaintMode?.active && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,128,128,.9)', border: '2px solid var(--px-border)',
          borderRadius: 8, padding: '8px 16px', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 10, color: 'var(--px-text)' }}>
            {state.tilePaintMode.type === 'floor' ? '🎨 ПОЛ' : '🎨 СТЕНА'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map((idx) => {
                const imgPath = state.tilePaintMode!.type === 'floor'
                  ? `/sprites/tiles/floor${idx + 1}.webp`
                  : `/sprites/walls/wall${idx + 1}.webp`;
              const isSelected = state.tilePaintMode!.textureIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setTilePaintTexture(state, idx)}
                  style={{
                    width: 32, height: 32,
                    border: `2px solid ${isSelected ? 'var(--px-text)' : 'var(--px-border-dark)'}`,
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={imgPath}
                    alt={`Texture ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                  />
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>ESC для выхода</span>
          <div
            onClick={() => {
              resetAllTileOverrides(state);
              sendTileReset();
            }}
            style={{
              fontSize: 9, color: '#ff6b6b', cursor: 'pointer',
              border: '1px solid #ff6b6b44', borderRadius: 4, padding: '2px 6px',
            }}
          >
            СБРОСИТЬ ВСЁ
          </div>
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed',
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)',
            padding: 8,
            zIndex: 100,
            minWidth: 230,
            border: '1px solid rgba(0,0,0,.06)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.items.map((item, idx) => (
            <div
              key={idx}
              className="ctx-item"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--px-titlebar)'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}
              onClick={() => {
                setCtxMenu(null);
                item.fn();
              }}
            >
              <span className="ctx-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <GameIcon icon={item.icon} size={22} />
              </span>
              <span className="ctx-text" style={{ fontSize: 11, color: '#333' }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 10, pointerEvents: 'none' }}>
        {player.activities.slice(0, 3).map((a: Activity, i: number) => (
          <div key={i} className="px-panel" style={{ padding: '6px 12px', marginBottom: 4, fontSize: 9, color: 'var(--px-text)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>{a.icon}</span>
            <span>{a.text}</span>
            <span style={{ color: 'var(--px-text-dim)', fontSize: 8, marginLeft: 'auto' }}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* Bottom HUD — pixel style */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
        padding: '0 8px 8px', pointerEvents: 'none', zIndex: 10, gap: 6,
      }}>
        {/* Avatar Card — HUG with pixel style */}
        <div
          className="hud-card"
          onClick={() => openModal('profile')}
          style={{
            pointerEvents: 'auto', cursor: 'pointer',
            background: 'var(--px-panel)', border: '2px solid var(--px-border)',
            boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark), 3px 3px 0 var(--px-shadow)',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 280,
          }}
        >
          <div style={{
            width: 52, height: 52, border: '2px solid var(--px-border)',
            background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }} suppressHydrationWarning>{player.av}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--px-text)' }}>{player.name}</div>
              <div style={{ fontSize: 10, color: 'var(--px-accent)', fontWeight: 'bold' }}>Lv.{player.level}</div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 5 }}>{player.role}</div>
            <div style={{ width: '100%', height: 5, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', overflow: 'hidden' }}>
              <div style={{
                width: `${(player.xp / (player.level * 100)) * 100}%`,
                height: '100%',
                background: 'var(--px-accent)',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginTop: 3 }}>{player.xp}/{player.level * 100} XP</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon icon={ICONS.coin} width={22} height={22} style={{ color: 'var(--px-text)' }} />
              <span style={{ fontSize: 12, color: 'var(--px-text)' }}>{player.coins}</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>
              {player.placedItems.length} items
            </div>
          </div>
        </div>

        {/* Emoji bar */}
        <div style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '8px 12px', pointerEvents: 'auto', display: 'flex', gap: 5, alignSelf: 'flex-end',
        }}>
          {EMOJI_CHAT.map((em) => (
            <div key={em} onClick={() => sendEmoji(em)} className="emoji-btn">{em}</div>
          ))}
        </div>

        {/* Admin button */}
        {(player.charId === 'pers5' || authUser.login === 'olegdevyatow@gmail.com') && (
          <div
            onClick={() => setShowAdmin(true)}
            style={{
              background: 'var(--px-panel)', border: '2px solid var(--px-danger)',
              boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
              padding: '10px 18px', pointerEvents: 'auto', cursor: 'pointer', alignSelf: 'flex-end',
              fontSize: 12, color: 'var(--px-danger)', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Icon icon={ICONS.gear} width={22} height={22} />
            ADMIN
          </div>
        )}

        {/* MP + coins */}
        <div style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '12px 16px', pointerEvents: 'auto', alignSelf: 'flex-end',
          display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, background: mpConnected ? 'var(--px-accent)' : 'var(--px-danger)' }} />
            <span style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>
              {mpConnected ? `${remotePlayers.length + 1} ONLINE` : 'OFFLINE'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--px-text)' }}>
            <Icon icon={ICONS.trophy} width={20} height={20} />
            {player.achievements.length}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="px-panel" style={{ width: 560, maxHeight: '80vh', overflow: 'hidden' }}>
            <div className="px-panel-header">
              <span>{getModalTitle(modalType, modalData)}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={closeModal} className="win-btn" style={{ fontWeight: 'bold' }}>X</button>
              </div>
            </div>
            <div style={{ padding: 16, maxHeight: '60vh', overflowY: 'auto' }}>
              {modalType === 'shop' && <ShopView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'inventory' && <InventoryView state={stateRef.current} onToast={toast} />}
              {modalType === 'profile' && <ProfileView state={stateRef.current} profilePlayer={modalData.remotePlayer as { name: string; charId: string; role?: string; avatar?: string; coins?: number; level?: number; achievements?: string[] } | undefined} />}
              {modalType === 'quests' && <QuestsView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'talk' && <TalkView data={modalData} state={stateRef.current} onToast={toast} />}
              {modalType === 'rps' && <RpsView data={modalData} state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'whiteboard' && <WhiteboardView />}
              {modalType === 'mp_rps' && <MpRpsView data={modalData} myChoice={rpsMyChoice} sentChoice={rpsSentChoice} result={rpsResult} onChoice={(c) => { setRpsMyChoice(c); setRpsSentChoice(true); sendRpsChoice(modalData.gameId as string, c); }} onClose={closeModal} onToast={toast} />}
              {modalType === 'book_prediction' && <BookPredictionView prediction={modalData.prediction as string} />}
            </div>
          </div>
        </div>
      )}

      {/* RPS Invite Notification */}
      {rpsInvite && (
        <div className="px-panel" style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 20px', zIndex: 200, display: 'flex', alignItems: 'center', gap: 14,
          borderColor: 'var(--px-accent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon={ICONS.game} width={20} height={20} style={{ color: 'var(--px-accent)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--px-text)' }}>RPS FROM {rpsInvite.fromName}</div>
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginTop: 3 }}>ACCEPT?</div>
            </div>
          </div>
          <button onClick={() => { acceptRpsInvite(rpsInvite.gameId); setRpsInvite(null); }} className="px-btn accent small">YES</button>
          <button onClick={() => { declineRpsInvite(rpsInvite.gameId); setRpsInvite(null); }} className="px-btn small">NO</button>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="px-panel" style={{
          position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', fontSize: 11, color: toastType === 'ok' ? 'var(--px-accent)' : 'var(--px-text)',
          zIndex: 200, pointerEvents: 'none', borderColor: toastType === 'ok' ? 'var(--px-accent)' : 'var(--px-border)',
        }}>
          {toastType === 'ok' ? '> ' : '! '}{toastMsg}
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Confetti */}
      {confettiTrigger > 0 && <ConfettiEffect trigger={confettiTrigger} />}

      {/* Retro Effects Panel */}
      <RetroPanel settings={retroSettings} onChange={setRetroSettings} isAdmin={player.charId === 'pers5' || authUser.login === 'olegdevyatow@gmail.com'} />
    </>
  );
}

function getModalTitle(type: string, data?: Record<string, unknown>): string {
  const t: Record<string, string> = {
    shop: 'SHOP',
    inventory: 'INVENTORY',
    profile: 'PROFILE',
    quests: 'QUESTS',
    talk: 'TALK',
    rps: 'ROCK-PAPER-SCISSORS',
    whiteboard: 'WHITEBOARD',
    mp_rps: 'RPS VS PLAYER',
    book_prediction: '📖 BOOK OF FATE',
  };
  if (type === 'profile' && data?.remotePlayer) {
    return `PROFILE — ${(data.remotePlayer as { name: string }).name}`;
  }
  return t[type] || '';
}

// ===== Canvas minigame helpers =====
function spawnFurnitureItem(g: { currentItem: any; targetZone: any }) {
  const COLORS = ['#8B4513', '#654321', '#A0522D', '#D2691E', '#CD853F'];
  const w = 30 + Math.random() * 30;
  const h = 20 + Math.random() * 20;
  g.currentItem = { x: 60, y: 300, vx: 0, vy: 0, w, h, color: COLORS[Math.floor(Math.random() * COLORS.length)], landed: false, prevY: 300 };
}

function drawBasketballOnCanvas(ctx: CanvasRenderingContext2D, g: any, state: GameState, toast: (m: string, t?: 'ok' | 'info') => void, confetti: () => void) {
  const HOOP_X = 320, HOOP_Y = 120, HOOP_W = 40, GRAVITY = 0.12, BALL_R = 10;
  const BALL_START_X = 80, BALL_START_Y = 320;
  g.frame = (g.frame || 0) + 1;

  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, 400, 400);

  ctx.strokeStyle = '#8B451340';
  ctx.lineWidth = 1;
  for (let i = 0; i < 400; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke();
  }

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(HOOP_X + HOOP_W / 2 + 2, HOOP_Y - 30, 8, 60);
  ctx.fillStyle = '#fff';
  ctx.fillRect(HOOP_X + HOOP_W / 2 - 10, HOOP_Y - 20, 22, 22);
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.strokeRect(HOOP_X + HOOP_W / 2 - 10, HOOP_Y - 20, 22, 22);

  ctx.strokeStyle = '#ff6600';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(HOOP_X - HOOP_W / 2, HOOP_Y);
  ctx.lineTo(HOOP_X + HOOP_W / 2, HOOP_Y);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff80';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const nx = HOOP_X - HOOP_W / 2 + (HOOP_W / 4) * i;
    ctx.beginPath();
    ctx.moveTo(nx, HOOP_Y);
    ctx.lineTo(nx + (i - 2) * 3, HOOP_Y + 25);
    ctx.stroke();
  }

  if (g.ball.flying) {
    g.ball.vy += GRAVITY;
    g.ball.x += g.ball.vx;
    g.ball.y += g.ball.vy;

    const backboardX = HOOP_X + HOOP_W / 2 + 2;
    const backboardTop = HOOP_Y - 30;
    const backboardBottom = HOOP_Y + 30;
    if (g.ball.x + BALL_R > backboardX && g.ball.x - BALL_R < backboardX + 8 &&
        g.ball.y > backboardTop && g.ball.y < backboardBottom) {
      g.ball.vx = -g.ball.vx * 0.6;
      g.ball.x = backboardX - BALL_R;
    }

    if (!g.ball.scored &&
      g.ball.x > HOOP_X - HOOP_W / 2 && g.ball.x < HOOP_X + HOOP_W / 2 &&
      g.ball.y > 100 && g.ball.y < 145 &&
      g.ball.vy > 0) {
      g.ball.scored = true;
      g.score++;
      addXP(state, 10);
      toast('🏀 Забросил! +1', 'ok');
    }

    if (g.ball.y > 420 || g.ball.x > 420 || g.ball.x < -20) {
      g.ball.flying = false;
      g.ball.x = BALL_START_X;
      g.ball.y = BALL_START_Y;
      g.ball.vx = 0;
      g.ball.vy = 0;
      g.attempts--;
      if (g.attempts <= 0) {
        const coins = g.score * 15;
        addCoins(state, coins);
        toast(g.score >= 7 ? `🏆 Отлично! ${g.score}/10 → +${coins} алт` : `${g.score}/10 → +${coins} алт`, g.score >= 7 ? 'ok' : 'info');
        if (g.score >= 7) confetti();
        g.score = 0;
        g.attempts = 10;
      }
    }
  }

  if (g.dragStart && !g.ball.flying) {
    ctx.strokeStyle = '#e9456080';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(g.dragStart.x, g.dragStart.y);
    ctx.lineTo(g.ball.x, g.ball.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cc5500';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#cc550040';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(g.ball.x - BALL_R, g.ball.y); ctx.lineTo(g.ball.x + BALL_R, g.ball.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g.ball.x, g.ball.y - BALL_R); ctx.lineTo(g.ball.x, g.ball.y + BALL_R); ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🏀 ${g.score} / ${10 - (10 - g.attempts)}`, 10, 25);
  ctx.fillText(`Попытки: ${g.attempts}`, 10, 45);

  if (!g.ball.flying && g.attempts > 0) {
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Зажми и потяни от мяча, отпусти для броска', 200, 380);
  }
}

function drawFurnitureTossOnCanvas(ctx: CanvasRenderingContext2D, g: any, state: GameState, toast: (m: string, t?: 'ok' | 'info') => void) {
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, 0, 400, 400);

  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(g.targetZone.x, g.targetZone.y, g.targetZone.w, g.targetZone.h);
  ctx.strokeStyle = '#4ecca3';
  ctx.lineWidth = 2;
  ctx.strokeRect(g.targetZone.x, g.targetZone.y, g.targetZone.w, g.targetZone.h);
  ctx.fillStyle = '#4ecca3';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TARGET', g.targetZone.x + g.targetZone.w / 2, g.targetZone.y + g.targetZone.h / 2 + 4);

  for (const item of g.items) {
    ctx.fillStyle = item.color;
    ctx.fillRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
  }

  if (g.currentItem && !g.dragging) {
    const c = g.currentItem;
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    ctx.strokeStyle = '#e8c840';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
  }

  if (g.dragging && g.currentItem) {
    ctx.strokeStyle = '#e8c84080';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(g.dragging.x, g.dragging.y);
    ctx.lineTo(g.currentItem.x, g.currentItem.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const item of g.items) {
    if (item.vy !== 0 || item.vx !== 0) {
      item.prevY = item.y;
      item.vy += 0.2;
      item.x += item.vx;
      item.y += item.vy;

      if (item.prevY < g.targetZone.y + g.targetZone.h &&
          item.y >= g.targetZone.y &&
          item.x > g.targetZone.x && item.x < g.targetZone.x + g.targetZone.w &&
          item.vy > 0) {
        g.score++;
        toast('+1 В МЕШЕНЬ!', 'ok');
      }

      if (item.y > 380) {
        item.y = 380;
        item.vy = 0;
        item.vx = 0;
        item.landed = true;
      }
    }
  }

  ctx.fillStyle = '#8a8470';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${g.score}`, 10, 25);
  ctx.fillText(`TRIES: ${g.attempts}`, 10, 45);

  if (g.attempts > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5a5648';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('DRAG FROM ITEM TO AIM, RELEASE', 200, 390);
  }
}

function drawMicrowaveOnCanvas(ctx: CanvasRenderingContext2D, g: any, state: GameState, toast: (m: string, t?: 'ok' | 'info') => void) {
  if (g.status === 'running') {
    g.elapsed = performance.now() - g.startTime;
  }

  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, 0, 400, 400);

  ctx.fillStyle = '#e8c840';
  ctx.font = 'bold 14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⏱️ HEAT LUNCH', 200, 30);

  ctx.fillStyle = '#8a8470';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('STOP AT 5.000 SECONDS', 200, 55);

  const displayTime = g.status === 'waiting' ? '0.000' : g.status === 'done' ? g.result?.stoppedAt || '0.000' : (g.elapsed / 1000).toFixed(3);
  ctx.fillStyle = g.status === 'running' ? '#e94560' : '#e8c840';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(displayTime, 200, 120);

  const barY = 160;
  const barW = 360;
  const barH = 12;
  const barX = 20;
  ctx.fillStyle = 'var(--px-bg)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  const targetX = barX + (5000 / 8000) * barW;
  const targetW = (1000 / 8000) * barW;
  ctx.fillStyle = 'rgba(78,204,163,0.15)';
  ctx.fillRect(targetX - targetW / 2, barY, targetW, barH);
  ctx.strokeStyle = '#4ecca3';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(targetX - targetW / 2, barY); ctx.lineTo(targetX - targetW / 2, barY + barH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(targetX + targetW / 2, barY); ctx.lineTo(targetX + targetW / 2, barY + barH); ctx.stroke();
  ctx.setLineDash([]);

  const progress = Math.min((g.elapsed / 8000) * barW, barW);
  ctx.fillStyle = g.status === 'done' && g.result?.reward === 0 ? '#e94560' : '#4ecca3';
  ctx.fillRect(barX, barY, g.status === 'running' ? progress : g.status === 'done' ? Math.min(((parseFloat(g.result?.stoppedAt || '0') * 1000) / 8000) * barW, barW) : 0, barH);

  ctx.fillStyle = '#5a5648';
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillText('▲ TARGET — 5.000s', 200, 195);

  if (g.result) {
    ctx.fillStyle = g.result.reward > 0 ? '#4ecca3' : '#e94560';
    ctx.font = 'bold 13px "Press Start 2P", monospace';
    ctx.fillText(`${g.result.result}${g.result.reward > 0 ? ` +${g.result.reward}` : ''}`, 200, 230);
    ctx.fillStyle = '#8a8470';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`ACCURACY: ±${g.result.diff.toFixed(3)}s`, 200, 255);
  }

  const btnX = 200, btnY = 320, btnW = 140, btnH = 44;
  ctx.fillStyle = g.status === 'running' ? '#e94560' : '#4ecca3';
  ctx.fillRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(g.status === 'waiting' ? 'START ⏱️' : g.status === 'running' ? 'STOP! 🛑' : 'RETRY', btnX, btnY + 5);
}

function drawSmokeOnCanvas(ctx: CanvasRenderingContext2D, g: any, state: GameState, toast: (m: string, t?: 'ok' | 'info') => void) {
  if (g.active && !g.done) {
    const now = Date.now();
    if (now - g.lastTick >= 1000) {
      g.timeLeft--;
      g.lastTick = now;
      if (g.timeLeft <= 0) {
        g.done = true;
        g.won = false;
      }
    }
  }

  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, 0, 400, 400);

  ctx.fillStyle = '#e8c840';
  ctx.font = 'bold 14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SMOKING BREAK', 200, 30);

  ctx.font = '44px sans-serif';
  ctx.fillText('🚬', 200, 90);

  ctx.fillStyle = '#8a8470';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(g.done ? (g.won ? 'DONE!' : 'TIME UP!') : `TAP ${g.targetTaps} TIMES IN 20S`, 200, 125);

  const barY = 150;
  const barW = 360;
  const barH = 12;
  const barX = 20;
  ctx.fillStyle = 'var(--px-bg)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = g.done && !g.won ? '#e94560' : '#4ecca3';
  ctx.fillRect(barX, barY, (g.taps / g.targetTaps) * barW, barH);
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = '#8a8470';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(`${g.taps} / ${g.targetTaps}`, 200, 185);

  if (!g.done) {
    const btnX = 200, btnY = 260, btnR = 55;
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚬', btnX, btnY);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#8a8470';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`TIME: ${g.timeLeft}s`, 200, 340);
  } else {
    ctx.fillStyle = g.won ? '#4ecca3' : '#e94560';
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.fillText(g.won ? 'SMOKED! +20 COINS' : 'TOO SLOW!', 200, 260);

    ctx.fillStyle = '#8a8470';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('Click to close', 200, 300);
  }
}

// ===== SHOP =====
function ShopView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const [cat, setCat] = useState('desks');
  const [preview, setPreview] = useState<string | null>(null);
  const labels: Record<string, string> = { minigames: 'ИГРЫ' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>CHOOSE FURNITURE</div>
        <div className="px-panel" style={{ padding: '6px 14px', fontSize: 10 }}>
          <span style={{ color: 'var(--px-accent)' }}>🪙 {state.player.coins}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.keys(SHOP).map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setPreview(null); }}
            className={`px-btn small${cat === c ? ' accent' : ''}`}
            style={{ fontSize: 10 }}
          >
            {labels[c] || c}
          </button>
        ))}
      </div>

      {preview && (() => {
        const pItem = ALL_ITEMS.find(i => i.id === preview);
        if (!pItem) return null;
        return (
          <div className="px-panel" style={{ position: 'sticky', top: 0, zIndex: 10, padding: 12, marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center', background: 'var(--px-panel)', boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>
            <div style={{ width: 80, height: 80, background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--px-border-dark)', flexShrink: 0 }}>
              <img src={pItem.sprite} alt={pItem.n} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', imageRendering: 'pixelated' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--px-text)', marginBottom: 4 }}>{pItem.n}</div>
              <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 4 }}>{pItem.surface === 'wall' ? 'WALL' : 'FLOOR'} · {pItem.w}×{pItem.h}</div>
              <div style={{ fontSize: 11, color: 'var(--px-accent)', marginBottom: 8 }}>{pItem.p} COINS</div>
              <button
                onClick={() => {
                  const res = buyItem(state, pItem.id);
                  if (res.ok) { onToast(res.msg, 'ok'); onConfetti(); }
                  else onToast(res.msg, 'info');
                }}
                className="px-btn accent"
                style={{ fontSize: 10 }}
              >BUY</button>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {(SHOP as any)[cat]?.map((item: any) => {
          const count = state.player.furniture.filter(id => id === item.id).length + state.player.placedItems.filter(pi => pi.id === item.id).length;
          return (
            <div
              key={item.id}
              onClick={() => setPreview(preview === item.id ? null : item.id)}
              className="px-panel"
              style={{
                padding: 8,
                textAlign: 'center',
                cursor: 'pointer',
                borderColor: preview === item.id ? 'var(--px-accent)' : undefined,
              }}
            >
              <div style={{ width: '100%', aspectRatio: '1', background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6, maxHeight: 120 }}>
                <img src={item.sprite} alt={item.n} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--px-text)' }}>{item.n}</div>
              <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginTop: 2 }}>{item.p} {count > 0 && <span style={{ color: 'var(--px-accent)' }}>({count})</span>}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ===== INVENTORY =====
function InventoryView({ state, onToast }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const [tab, setTab] = useState<'all' | 'placed' | 'carrying'>('all');
  const placed = state.player.placedItems;

  const itemCounts: Record<string, number> = {};
  for (const id of state.player.furniture) {
    itemCounts[id] = (itemCounts[id] || 0) + 1;
  }
  const placedCounts: Record<string, number> = {};
  for (const pi of placed) {
    placedCounts[pi.id] = (placedCounts[pi.id] || 0) + 1;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button onClick={() => setTab('all')} className={`px-btn small${tab === 'all' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
          OWNED ({state.player.furniture.length})
        </button>
        <button onClick={() => setTab('placed')} className={`px-btn small${tab === 'placed' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
          PLACED ({placed.length})
        </button>
        {state.player.carrying && (
          <button onClick={() => setTab('carrying')} className={`px-btn small${tab === 'carrying' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
            CARRYING
          </button>
        )}
      </div>

      {tab === 'all' && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 8 }}>CLICK TO HOLD, THEN RIGHT-CLICK → PLACE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {state.player.furniture.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--px-text-dim)', padding: 30, fontSize: 11 }}>EMPTY. VISIT THE SHOP!</div>
            )}
            {Object.entries(itemCounts).map(([id, count]) => {
              const item = ALL_ITEMS.find((x) => x.id === id);
              const placedCount = placedCounts[id] || 0;
              const available = count - placedCount;
              return (
                <div
                  key={id}
                  onClick={() => {
                    if (available <= 0) { onToast('ALL PLACED', 'info'); return; }
                    if (state.player.carrying) { onToast('ALREADY HOLDING', 'info'); return; }
                    state.player.carrying = id;
                    onToast(`HELD ${item?.e || ''}`, 'ok');
                  }}
                  className="px-panel"
                  style={{
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: available > 0 ? 'pointer' : 'default',
                    opacity: available > 0 ? 1 : 0.4,
                    borderColor: available > 0 ? undefined : 'var(--px-border-dark)',
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 }}>
                    <img src={item?.sprite} alt={item?.n} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--px-text)' }}>{item?.n} {count > 1 && `×${count}`}</div>
                  {available > 0 && <div style={{ fontSize: 9, color: 'var(--px-accent)', marginTop: 2 }}>{available} FREE</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'placed' && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 8 }}>APPROACH ITEM → RIGHT-CLICK → TAKE</div>
          {placed.length === 0 && (
            <div style={{ color: 'var(--px-text-dim)', fontSize: 11, textAlign: 'center', padding: 20 }}>NOTHING PLACED</div>
          )}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {placed.map((p, i) => {
              const item = ALL_ITEMS.find((x) => x.id === p.id);
              return (
                <div
                  key={`${p.id}_${i}`}
                  className="px-panel"
                  style={{
                    padding: '7px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 10,
                  }}
                >
                  <img src={item?.sprite} alt="" style={{ width: 20, height: 20, objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span style={{ color: 'var(--px-text)' }}>{item?.n}</span>
                  <span style={{ color: 'var(--px-text-dim)', fontSize: 9 }}>{p.surface === 'wall' ? 'WALL' : 'FLOOR'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'carrying' && state.player.carrying && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ width: 80, height: 80, background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', overflow: 'hidden', border: '1px solid var(--px-border-dark)' }}>
            <img src={ALL_ITEMS.find(i => i.id === state.player.carrying)?.sprite} alt="" style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', imageRendering: 'pixelated' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--px-text)', marginBottom: 8 }}>HOLDING: {ALL_ITEMS.find(i => i.id === state.player.carrying)?.n}</div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>GO TO DESTINATION → RIGHT-CLICK → PLACE</div>
        </div>
      )}
    </div>
  );
}

// ===== DECORATE (grid-based placement) =====
// ===== PROFILE =====
function ProfileView({ state, profilePlayer }: { state: GameState; profilePlayer?: { name: string; charId: string; role?: string; avatar?: string; coins?: number; level?: number; achievements?: string[] } }) {
  const isOwn = !profilePlayer;
  const p = isOwn ? state.player : null;
  const rp = profilePlayer;

  const name = rp?.name || p?.name || '';
  const charId = rp?.charId || p?.charId || '';
  const role = rp?.role || p?.role || '';
  const avatar = rp?.avatar || p?.avatar || '';
  const coins = rp?.coins ?? p?.coins ?? 0;
  const level = rp?.level ?? p?.level ?? 1;
  const achievements = rp?.achievements ?? p?.achievements ?? [];

  const xpNeeded = level * 100;
  const xpPercent = isOwn && p ? (p.xp / xpNeeded) * 100 : 0;

  const allAchs = ACHIEVEMENTS;

  return (
    <div style={{ textAlign: 'center', padding: 10 }}>
      <div style={{ width: 64, height: 64, overflow: 'hidden', margin: '0 auto 8px', background: 'var(--px-bg)', border: '2px solid var(--px-border)', borderRadius: 4 }}>
        <img src={`/sprites/pers/${charId}.webp`} alt={charId} style={{ width: '200%', height: 'auto', objectFit: 'contain', imageRendering: 'pixelated', marginTop: 0, display: 'block' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 13, color: 'var(--px-text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--px-accent)', fontWeight: 'bold' }}>Lv.{level}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>{role}</div>

      {/* XP Bar — own profile only */}
      {isOwn && p && (
        <div className="px-panel" style={{ padding: '10px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 6 }}>EXPERIENCE</div>
          <div style={{ width: '100%', height: 8, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{
              width: `${xpPercent}%`,
              height: '100%',
              background: 'var(--px-accent)',
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--px-text)' }}>{p.xp} / {xpNeeded} XP</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, color: 'var(--px-accent)' }}>{coins}</div><div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>COINS</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, color: 'var(--px-accent)' }}>{achievements.length}</div><div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>ACHIEV</div></div>
      </div>

      {/* Editable fields — own profile only */}
      {isOwn && p && (
        <>
          <input
            className="px-input"
            style={{ width: '100%', marginBottom: 6, fontSize: 10, textAlign: 'center' }}
            value={p.name}
            onChange={(e) => { const v = e.target.value; p.name = v.charAt(0).toUpperCase() + v.slice(1); persistState(state); }}
            placeholder="NAME"
          />
          <input
            className="px-input"
            style={{ width: '100%', fontSize: 10, textAlign: 'center' }}
            value={p.role}
            onChange={(e) => { const v = e.target.value; p.role = v.charAt(0).toUpperCase() + v.slice(1); persistState(state); }}
            placeholder="ROLE"
          />
          <button
            onClick={() => { logout(); window.location.reload(); }}
            className="px-btn danger"
            style={{ marginTop: 14, fontSize: 10 }}
          >LOGOUT</button>
        </>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div style={{ marginTop: 14, textAlign: 'left' }}>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 6 }}>ACHIEVEMENTS ({achievements.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allAchs.filter(a => achievements.includes(a.id)).map(a => (
              <div key={a.id} className="px-panel" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', fontSize: 9, borderColor: 'var(--px-accent)' }} title={a.desc}>
                <span>{a.icon}</span>
                <span style={{ color: 'var(--px-accent)' }}>{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const AVATARS = ['🧑‍🚀', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🔧', '👩‍🔬', '🧑‍🍳', '🦊', '🐱', '🐨', '🐸', '👻'];
import { SHOP } from '../game/constants';

// ===== ACHIEVEMENTS =====
function AchievementsView({ state }: { state: GameState }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = state.player.achievements.includes(a.id);
          return (
            <div
              key={a.id}
              className="px-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 12px',
                fontSize: 10,
                opacity: unlocked ? 1 : 0.4,
                borderColor: unlocked ? 'var(--px-accent)' : undefined,
              }}
              title={a.desc}
            >
              <span>{a.icon}</span>
              <span style={{ color: unlocked ? 'var(--px-accent)' : 'var(--px-text-dim)' }}>{a.name}</span>
              {unlocked && <span style={{ color: 'var(--px-accent)' }}>✓</span>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--px-text-dim)' }}>
        UNLOCKED: {state.player.achievements.length}/{ACHIEVEMENTS.length}
      </div>
    </div>
  );
}

// ===== QUESTS =====
function QuestsView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 10 }}>DAILY QUESTS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DAILY_QUESTS.map((quest) => {
          const progress = getQuestProgress(state, quest.id);
          const done = progress >= quest.target;
          const claimed = state.dailyQuests.claimed.includes(quest.id);
          return (
            <div
              key={quest.id}
              className="px-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderColor: claimed ? 'var(--px-accent)' : done ? 'var(--px-text)' : undefined,
              }}
            >
              <div style={{ fontSize: 20 }}>{quest.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--px-text)' }}>{quest.name}</div>
                <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>{quest.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>
                  {Math.min(progress, quest.target)}/{quest.target}
                </div>
                {done && !claimed && (
                  <div
                    onClick={() => {
                      const res = claimQuestReward(state, quest.id);
                      if (res.ok) { addXP(state, 25); onToast(res.msg, 'ok'); onConfetti(); }
                      else onToast(res.msg, 'info');
                    }}
                    style={{ fontSize: 10, color: 'var(--px-accent)', cursor: 'pointer', marginTop: 2 }}
                  >
                    +{quest.reward} COINS
                  </div>
                )}
                {claimed && (
                  <div style={{ fontSize: 10, color: 'var(--px-accent)', marginTop: 2 }}>DONE ✓</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== TALK =====
function TalkView({ data, state, onToast }: { data: Record<string, unknown>; state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const bot = data.bot as any;
  const phrases = ['Hey! How\'s it going?', 'Did you see the task in the tracker?', 'We need to discuss the sprint', 'Coffee? ☕', 'Petya broke the deploy again', 'Let\'s go to the whiteboard'];

  if (bot?.id === 'kryska') {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🐀</div>
        <div className="px-panel" style={{ padding: 10, fontSize: 11, color: 'var(--px-text)' }}>Kryska squeaks: *squeak squeak*</div>
        <div style={{ fontSize: 10, color: 'var(--px-accent)', marginTop: 8 }}>+5 COINS</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 10 }}>
      <div className="px-panel" style={{ padding: 10, marginBottom: 12, fontSize: 11 }}>
        <span style={{ color: 'var(--px-text)' }}>{bot?.name}:</span> <span style={{ color: 'var(--px-text)' }}>"{phrases[Math.floor(Math.random() * phrases.length)]}"</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--px-accent)', marginTop: 8 }}>+5 COINS</div>
    </div>
  );
}

// ===== RPS =====
function RpsView({ data, state, onToast, onConfetti }: { data: Record<string, unknown>; state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const result = rpsGame(state);
  useEffect(() => {
    if (result.reward > 0) { unlockAchievement(state, 'rps_win'); onToast(`+${result.reward} COINS`, 'ok'); onConfetti(); }
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>VS {(data.bot as any)?.name || 'Bot'}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>{result.playerChoice}</div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>YOU</div>
        </div>
        <div style={{ fontSize: 19, color: 'var(--px-border)', display: 'flex', alignItems: 'center' }}>VS</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>{result.botChoice}</div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>{(data.bot as any)?.name}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: result.reward > 0 ? 'var(--px-accent)' : 'var(--px-danger)' }}>
        {result.result}{result.reward > 0 ? ` +${result.reward} COINS` : ''}
      </div>
    </div>
  );
}

// ===== WHITEBOARD =====
function WhiteboardView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const color = useRef('#333');
  const sendWhiteboardUpdate = useCallback((dataUrl: string) => {
    updateWhiteboard(dataUrl);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 560, 360);

    // Request current whiteboard from server
    requestWhiteboardSync((dataUrl: string) => {
      if (!dataUrl || !canvasRef.current) return;
      const img = new Image();
      img.onload = () => {
        const ctx2 = canvasRef.current?.getContext('2d');
        if (ctx2) {
          ctx2.clearRect(0, 0, 560, 360);
          ctx2.drawImage(img, 0, 0);
        }
      };
      img.src = dataUrl;
    });

    const paint = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) * (c.width / r.width);
      const y = (e.clientY - r.top) * (c.height / r.height);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color.current;
      ctx.fill();
    };
    c.onmousedown = (e) => { drawing.current = true; paint(e); };
    c.onmousemove = (e) => { if (drawing.current) paint(e); };
    c.onmouseup = c.onmouseleave = () => {
      if (drawing.current) {
        drawing.current = false;
        const dataUrl = canvasRef.current?.toDataURL();
        if (dataUrl) sendWhiteboardUpdate(dataUrl);
      }
    };
  }, [sendWhiteboardUpdate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {['#333', '#e94560', '#4ecca3', '#ffa726', '#2196f3', '#9c27b0'].map((c) => (
          <div key={c} onClick={() => { color.current = c; }} style={{ width: 18, height: 18, cursor: 'pointer', background: c, border: '2px solid var(--px-border)' }} />
        ))}
        <div style={{ width: 1, height: 16, background: 'var(--px-border-dark)', margin: '0 4px' }} />
        <button onClick={() => {
          const c = canvasRef.current;
          if (c) {
            c.getContext('2d')?.clearRect(0, 0, 560, 360);
            c.getContext('2d')!.fillStyle = '#fff';
            c.getContext('2d')!.fillRect(0, 0, 560, 360);
            updateWhiteboard(c.toDataURL());
          }
        }} className="px-btn small" style={{ fontSize: 10 }}>CLEAR</button>
      </div>
      <canvas ref={canvasRef} width="560" height="360" style={{ border: '2px solid var(--px-border)', width: '100%', cursor: 'crosshair', imageRendering: 'pixelated' }} />
    </div>
  );
}

// ===== SMOKE TAP GAME =====
function SmokeView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const TAP_TARGET = 30;
  const TIME_LIMIT = 20;
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!finishedRef.current) {
            finishedRef.current = true;
            setDone(true);
            setWon(false);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleTap = () => {
    if (done) return;
    setTaps((prev) => {
      const next = prev + 1;
      if (next >= TAP_TARGET && !finishedRef.current) {
          finishedRef.current = true;
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            setDone(true);
            setWon(true);
            addCoins(state, 20);
            addXP(state, 15);
            unlockAchievement(state, 'smoker');
            trackQuestProgress(state, 'smoke_1');
            logActivity(state, '🚬', 'Smoked in the smoking room');
            onToast('+20 COINS SMOKED!', 'ok');
            onConfetti();
          }, 0);
      }
      return next;
    });
  };

  const progress = (taps / TAP_TARGET) * 100;

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🚬</div>
      <div style={{ fontSize: 13, color: 'var(--px-text)', marginBottom: 6 }}>SMOKE IT!</div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>
        {done ? (won ? 'DONE!' : 'TIME UP!') : `TAP ${TAP_TARGET} TIMES IN ${TIME_LIMIT}S`}
      </div>

      <div style={{ width: '100%', height: 10, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ height: '100%', background: done && !won ? 'var(--px-danger)' : 'var(--px-accent)', transition: 'width 0.05s', width: `${progress}%` }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, margin: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, color: 'var(--px-danger)' }}>{timeLeft}</div>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>SECONDS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, color: 'var(--px-accent)' }}>{taps}/{TAP_TARGET}</div>
          <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>TAPS</div>
        </div>
      </div>

      {!done && (
        <button
          onClick={handleTap}
          className="px-btn danger"
          style={{ fontSize: 16, padding: '10px 28px' }}
          onMouseDown={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
        >🚬 TAP!</button>
      )}

      {done && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: won ? 'var(--px-accent)' : 'var(--px-danger)' }}>
            {won ? 'SMOKED! +20 COINS' : 'TOO SLOW!'}
          </div>
          <button onClick={() => { setTaps(0); setTimeLeft(TIME_LIMIT); setDone(false); setWon(false); finishedRef.current = false; }} className="px-btn small" style={{ marginTop: 8, fontSize: 10 }}>
            RETRY
          </button>
        </div>
      )}
    </div>
  );
}

// ===== MICROWAVE TIMING GAME =====
function MicrowaveView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const [status, setStatus] = useState<'waiting' | 'running' | 'done'>('waiting');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ stoppedAt: string; diff: number; result: string; reward: number } | null>(null);
  const startTimeRef = useRef(0);
  const animRef = useRef<number>(0);

  const startTimer = () => {
    setStatus('running');
    startTimeRef.current = performance.now();
    const tick = () => {
      setElapsed(performance.now() - startTimeRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  };

  const stopTimer = () => {
    cancelAnimationFrame(animRef.current);
    const stoppedAt = performance.now() - startTimeRef.current;
    const res = microwaveGame(state, stoppedAt);
    setResult(res);
    setStatus('done');
    if (res.reward > 0) {
      if (res.reward >= 35) addXP(state, 15);
      else if (res.reward >= 25) addXP(state, 10);
      else addXP(state, 5);
      onToast(`+${res.reward} COINS`, 'ok');
      onConfetti();
    }
    logActivity(state, '⏱️', `Heated lunch: ${res.stoppedAt}`);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const displayTime = (elapsed / 1000).toFixed(3);
  const progress = Math.min((elapsed / 8000) * 100, 100);
  const targetZone = (5000 / 8000) * 100;

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>⏱️</div>
      <div style={{ fontSize: 13, color: 'var(--px-text)', marginBottom: 6 }}>HEAT LUNCH</div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>STOP AT 5.000 SECONDS</div>

      <div style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums', marginBottom: 16, color: status === 'running' ? 'var(--px-danger)' : 'var(--px-text)' }}>
        {status === 'waiting' ? '0.000' : status === 'done' ? result?.stoppedAt || '0.000' : displayTime}
      </div>

      <div style={{ position: 'relative', width: '100%', height: 10, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ position: 'absolute', left: `${targetZone - 5}%`, width: '10%', height: '100%', background: 'rgba(78,204,163,0.15)', borderLeft: '2px dashed var(--px-accent)', borderRight: '2px dashed var(--px-accent)' }} />
        <div style={{ height: '100%', background: status === 'done' && result?.reward === 0 ? 'var(--px-danger)' : 'var(--px-accent)', transition: status === 'running' ? 'none' : 'width 0.3s', width: `${status === 'running' ? progress : status === 'done' ? Math.min(((parseFloat(result?.stoppedAt || '0') * 1000) / 8000) * 100, 100) : 0}%` }} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 12 }}>▲ TARGET — 5.000s</div>

      {result && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: result.reward > 0 ? 'var(--px-accent)' : 'var(--px-danger)' }}>
            {result.result}{result.reward > 0 ? ` +${result.reward} COINS` : ''}
          </div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>ACCURACY: ±{result.diff.toFixed(3)}s</div>
        </div>
      )}

      {status === 'waiting' && (
        <button onClick={startTimer} className="px-btn accent" style={{ fontSize: 12 }}>START ⏱️</button>
      )}
      {status === 'running' && (
        <button onClick={stopTimer} className="px-btn danger" style={{ fontSize: 12 }}>STOP! 🛑</button>
      )}
      {status === 'done' && (
        <button onClick={() => { setResult(null); setStatus('waiting'); setElapsed(0); }} className="px-btn small" style={{ fontSize: 10 }}>RETRY</button>
      )}
    </div>
  );
}

// ===== MULTIPLAYER RPS =====
function MpRpsView({ data, myChoice, sentChoice, result, onChoice, onClose, onToast }: {
  data: Record<string, unknown>;
  myChoice: 'rock' | 'paper' | 'scissors' | null;
  sentChoice: boolean;
  result: RpsResult | null;
  onChoice: (c: 'rock' | 'paper' | 'scissors') => void;
  onClose: () => void;
  onToast: (m: string, t?: 'ok' | 'info') => void;
}) {
  const choiceEmoji: Record<string, string> = { rock: '✊', paper: '✋', scissors: '✌️' };

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>VS {(data.opponentName as string) || 'Player'}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>{choiceEmoji[result.myChoice] || '?'}</div>
            <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>YOU</div>
          </div>
          <div style={{ fontSize: 19, color: 'var(--px-border)', display: 'flex', alignItems: 'center' }}>VS</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>{choiceEmoji[result.theirChoice] || '?'}</div>
            <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>{(data.opponentName as string) || 'Player'}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: result.winner === 'you' ? 'var(--px-accent)' : result.winner === 'draw' ? 'var(--px-text)' : 'var(--px-danger)' }}>
          {result.winner === 'you' ? 'YOU WIN!' : result.winner === 'draw' ? 'DRAW!' : 'YOU LOSE!'}
          {result.reward > 0 ? ` +${result.reward} COINS` : ''}
        </div>
        <button onClick={onClose} className="px-btn small" style={{ marginTop: 12, fontSize: 10 }}>CLOSE</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>VS {(data.opponentName as string) || 'Player'}</div>
      <div style={{ fontSize: 12, color: 'var(--px-text)', marginBottom: 16 }}>
        {sentChoice ? 'WAITING FOR OPPONENT...' : 'CHOOSE:'}
      </div>
      {!sentChoice && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => onChoice('rock')} className="px-btn" style={{ fontSize: 36, padding: '10px 18px' }}>✊</button>
          <button onClick={() => onChoice('paper')} className="px-btn" style={{ fontSize: 36, padding: '10px 18px' }}>✋</button>
          <button onClick={() => onChoice('scissors')} className="px-btn" style={{ fontSize: 36, padding: '10px 18px' }}>✌️</button>
        </div>
      )}
      {sentChoice && (
        <div style={{ fontSize: 36 }}>{choiceEmoji[myChoice || ''] || '?'}</div>
      )}
    </div>
  );
}

// ===== BOOK PREDICTION =====
function BookPredictionView({ prediction }: { prediction: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div className="px-panel" style={{ padding: 16, width: 280, textAlign: 'center' }}>
        <div style={{
          fontSize: 10, color: 'var(--px-text)', marginBottom: 12,
          letterSpacing: 2,
        }}>
          ✦ PREDICTION OF THE DAY ✦
        </div>
        <div style={{
          fontSize: 12, lineHeight: 1.6, color: 'var(--px-text)',
        }}>
          «{prediction}»
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', textAlign: 'center' }}>
        📖 BOOKSHELF IN CHILL ZONE
      </div>
    </div>
  );
}


// ===== CARD DRAWING HELPER =====
function drawCardOnCanvas(ctx: CanvasRenderingContext2D, card: any, x: number, y: number, w: number, h: number, selected?: boolean) {
  const colorMap: Record<string, string> = {
    red: '#c0392b', blue: '#2980b9', green: '#27ae60', yellow: '#f39c12',
  };
  const valueMap: Record<string, string> = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'skip': '\u2298', 'reverse': '\u27F2', 'plus2': '+2',
    'wild': '\u2605', 'wild_plus4': '+4',
  };

  // Card background
  ctx.fillStyle = card.color ? colorMap[card.color] : '#333';
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = selected ? '#e8c840' : '#000';
  ctx.lineWidth = selected ? 3 : 1;
  ctx.strokeRect(x, y, w, h);

  // Inner white area
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

  // Value text
  ctx.fillStyle = card.color ? colorMap[card.color] : '#333';
  const fontSize = Math.floor(w * 0.38);
  ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valueMap[card.value] || '?', x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

// ===== CONFETTI =====
const CONFETTI_COLORS = ['#e94560', '#4ecca3', '#ffa726', '#ab47bc', '#26c6da'];
function ConfettiEffect({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<{ id: number; left: number; top: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 25 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * window.innerWidth,
      top: Math.random() * window.innerHeight * 0.3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.4,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: p.left,
            top: p.top,
            width: 8,
            height: 8,
            borderRadius: 2,
            background: p.color,
            zIndex: 300,
            pointerEvents: 'none',
            animation: `confettiFall 1.4s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </>
  );
}

// ===== ONBOARDING LOADER (preloads assets during zoom animation) =====
function OnboardingLoader({ onComplete }: { onComplete: () => void }) {
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    Promise.all([
      preloadCharacterSprites(),
      preloadTileTextures(),
      ...ALL_ITEMS.filter(i => i.sprite).map(i =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = i.sprite!;
        })
      ),
    ]).then(() => {
      setTimeout(onComplete, 800);
    });
  }, [onComplete]);
  return null;
}

// ===== FIRST LOGIN FORM =====
function FirstLoginForm({ email, onSubmit, error, loading }: { email: string; onSubmit: (password: string, name: string, role: string) => void; error: string; loading: boolean }) {
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = () => {
    if (!password || !name.trim()) return;
    onSubmit(password, name.trim(), role.trim() || 'Разработчик');
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--px-text)', marginBottom: 8, textAlign: 'center' }}>ПЕРВЫЙ ВХОД</div>
      <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 12, textAlign: 'center' }}>{email}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <input className="px-input" type="password" placeholder="ПРИДУМАЙТЕ ПАРОЛЬ" value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        <input className="px-input" placeholder="КАК ВАС ЗОВУТ?" value={name}
          onChange={(e) => { const v = e.target.value; setName(v.charAt(0).toUpperCase() + v.slice(1)); }} />
        <input className="px-input" placeholder="ДОЛЖНОСТЬ" value={role}
          onChange={(e) => { const v = e.target.value; setRole(v.charAt(0).toUpperCase() + v.slice(1)); }} />
      </div>
      {error && (
        <div style={{ color: 'var(--px-danger)', fontSize: 9, marginBottom: 10, textAlign: 'center', padding: '6px 8px', background: 'var(--px-panel)', border: '1px solid var(--px-danger)' }}>{error}</div>
      )}
      <button onClick={handleSubmit} disabled={loading || !password || !name.trim()} className="px-btn accent" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 11 }}>
        {loading ? '...' : 'СДЕЛАТЬ ФОТО'}
      </button>
    </div>
  );
}


