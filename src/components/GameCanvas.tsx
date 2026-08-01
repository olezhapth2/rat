'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { TILE, EMOJI_CHAT, ALL_ITEMS, ACHIEVEMENTS, DAILY_QUESTS, getRoomAt, ROOMS } from '../game/constants';
import type { GameObject } from '../game/constants';
import { createInputState, setupInputListeners, updatePlayer } from '../game/input';
import { createCamera, updateCamera, render } from '../game/renderer';
import { createInitialState, persistState, updateBots, logActivity, unlockAchievement, addCoins, rpsGame, microwaveGame, buyItem, updateBossCall, checkBossCallReward, updateBossCallTimer, trackQuestProgress, claimQuestReward, getQuestProgress, updateRoomIncome, getPlacedObjectsAsGameObjects, pickUpItem, dropItem, canPlaceItem, getItemEmoji, updatePet, updateDropPreview, takeBackFromKryska } from '../game/state';
import type { GameState, Activity } from '../game/state';
import { preloadCharacterSprites, preloadPetSprites, updateAnimState } from '../game/sprites';
import { preloadTileTextures } from '../game/tiles';
import {
  connectMultiplayer, disconnectMultiplayer, sendPosition,
  sendRpsInvite, acceptRpsInvite, declineRpsInvite, sendRpsChoice, cancelRps,
  sendItemPlace, sendItemRemove,
  onPlayers, onPlayerMove, onInviteReceived, onInviteSent, onGameStarted, onGameResult, onGameDeclined, onGameCancelled,
  onConnected, onDisconnected, onItems,
  type RemotePlayer, type RpsInvite, type RpsStarted, type RpsResult, type SharedItem,
} from '../game/multiplayer';
import { login, getCurrentUser, logout } from '../game/auth';
import { checkInteractions, getSmokingLeaderboard, saveSmokingRecord, BOOK_PREDICTIONS, type InteractionZone } from '../game/interactions';

interface CtxItem {
  icon: string;
  text: string;
  fn: () => void;
}

export default function GameCanvas() {
  const [authUser, setAuthUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [authName, setAuthName] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthUser(getCurrentUser());
    setReady(true);
  }, []);

  const handleAuth = () => {
    const res = login(authName, authPass);
    if (res.ok) {
      setAuthUser(getCurrentUser());
      setAuthError('');
    } else {
      setAuthError(res.msg);
    }
  };

  if (!authUser) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Press Start 2P', monospace" }}>
        <div className="px-panel" style={{ padding: 0, width: 360 }}>
          {/* Title bar */}
          <div className="px-panel-header">
            <span>SECRET GANG v1.0</span>
            <span style={{ fontSize: 7, color: '#a09880' }}>FRI 09:45PM</span>
          </div>
          {/* Content */}
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, color: 'var(--px-title)', marginBottom: 6, letterSpacing: 2 }}>
                SECRET GANG
              </div>
              <div style={{ fontSize: 7, color: 'var(--px-text-dim)', letterSpacing: 1 }}>
                OFFICE SIMULATOR
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="USERNAME"
                className="px-input"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
              <input
                type="password"
                placeholder="PASSWORD"
                className="px-input"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
            {authError && (
              <div style={{ color: 'var(--px-danger)', fontSize: 7, marginBottom: 12, textAlign: 'center', padding: '6px 8px', background: '#3a1020', border: '1px solid var(--px-danger)' }}>
                {authError}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 16 }}>
              {['Аня', 'Саша', 'Кирилл', 'Олег', 'Алиса'].map(n => (
                <span key={n} onClick={() => setAuthName(n)} className="px-btn small" style={{
                  background: authName.toLowerCase() === n.toLowerCase() ? 'var(--px-accent)' : 'var(--px-panel)',
                  color: authName.toLowerCase() === n.toLowerCase() ? 'var(--px-text-dark)' : 'var(--px-text-dim)',
                  borderColor: authName.toLowerCase() === n.toLowerCase() ? '#2a8a6a' : 'var(--px-border-dark)',
                }}>{n}</span>
              ))}
            </div>
            <button onClick={handleAuth} className="px-btn accent" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 9 }}>
              LOGIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <GameInner authUser={authUser} />;
}

function GameInner({ authUser }: { authUser: { name: string; charId: string; color: string; role: string } }) {
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

  // Interaction + smoking minigame
  const [nearInteraction, setNearInteraction] = useState<InteractionZone | null>(null);
  const [smokingGame, setSmokingGame] = useState<{ active: boolean; startTime: number; taps: number; targetTaps: number } | null>(null);
  const [smokingResult, setSmokingResult] = useState<{ time: number; board: ReturnType<typeof getSmokingLeaderboard> } | null>(null);

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
  }, []);

  // Input listeners
  useEffect(() => {
    const cleanup = setupInputListeners(inputRef.current, canvasRef);
    return cleanup;
  }, []);

  // Left-click: place carried item OR click-to-move
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onLeftClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Ignore clicks on UI elements
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      const s = stateRef.current;
      const cam = cameraRef.current;
      const worldX = e.clientX / cam.zoom + cam.x;
      const worldY = e.clientY / cam.zoom + cam.y;

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
    preloadPetSprites();
    preloadTileTextures();
  }, []);

  // Multiplayer connection
  useEffect(() => {
    const s = stateRef.current;
    connectMultiplayer(s.player.name, s.player.charId, s.player.hatId, s.player.color);

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

    onItems((items: SharedItem[]) => {
      const s = stateRef.current;
      s.player.placedItems = items.map(si => {
        const def = ALL_ITEMS.find(i => i.id === si.id);
        return {
          id: si.id,
          x: si.x,
          y: si.y,
          surface: def?.surface || 'floor',
          placedBy: 'server',
        };
      });
      persistState(s);
    });

    return () => disconnectMultiplayer();
  }, []);

  // Context menu
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const worldX = e.clientX / cam.zoom + cam.x;
      const worldY = e.clientY / cam.zoom + cam.y;
      const s = stateRef.current;

      let foundBot: (typeof s.bots)[0] | null = null;
      for (const bot of s.bots) {
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
          items.push({ icon: '💬', text: 'Поговорить', fn: () => { addCoins(stateRef.current, 5); logActivity(stateRef.current, '🐀', 'Поговорил с Крыской'); unlockAchievement(stateRef.current, 'first_talk'); trackQuestProgress(stateRef.current, 'talk_3'); toast('+5 алт', 'ok'); } });
          if ((foundBot as any)._stolenItemId) {
            const stolenDef = ALL_ITEMS.find(i => i.id === (foundBot as any)._stolenItemId);
            items.push({ icon: '📦', text: `Отнять: ${stolenDef?.e || ''} ${stolenDef?.n || ''}`, fn: () => {
              const res = takeBackFromKryska(stateRef.current, 'kryska');
              toast(res.msg, res.ok ? 'ok' : 'info');
            }});
          }
        } else {
          items.push({ icon: '💬', text: `Поговорить с ${foundBot.name}`, fn: () => { logActivity(stateRef.current, '💬', `Поговорил с ${foundBot.name}`); unlockAchievement(stateRef.current, 'first_talk'); addCoins(stateRef.current, 5); trackQuestProgress(stateRef.current, 'talk_3'); openModal('talk', { bot: foundBot }); } });
          items.push({ icon: '✊', text: 'КНБ', fn: () => { trackQuestProgress(stateRef.current, 'rps_3'); openModal('rps', { bot: foundBot }); } });
          items.push({ icon: '🚶', text: 'Кабинет', fn: () => { logActivity(stateRef.current, '🚶', `Посетил кабинет ${foundBot.name}`); toast(`Ты у ${foundBot.name}`, 'ok'); } });
        }
      }

      // Check for remote players nearby
      for (const rp of remotePlayersRef.current) {
        const dx = worldX - rp.x;
        const dy = worldY - rp.y;
        if (Math.sqrt(dx * dx + dy * dy) < TILE * 1.5) {
          items.push({ icon: '🎮', text: `КНБ с ${rp.name}`, fn: () => { sendRpsInvite(rp.id); toast(`Приглашение отправлено ${rp.name}`, 'info'); } });
          break;
        }
      }

      if (foundObj) {
        items.push({ icon: '🪑', text: foundObj.label || foundObj.id, fn: () => {} });
      }

      // Placed item nearby — pick up option
      if (nearestPlacedIdx >= 0 && s.player.carrying === null) {
        const pi = s.player.placedItems[nearestPlacedIdx];
        const piDef = ALL_ITEMS.find(item => item.id === pi.id);
        items.push({
          icon: '📦',
          text: `Взять: ${piDef?.e || ''} ${piDef?.n || ''}`,
          fn: () => {
            const removedItem = s.player.placedItems[nearestPlacedIdx];
            const res = pickUpItem(s, nearestPlacedIdx);
            if (res.ok) { toast(res.msg, 'ok'); sendItemRemove(nearestPlacedIdx, removedItem?.id || ''); }
            else toast(res.msg, 'info');
          }
        });
        items.push({
          icon: '🔄',
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
          icon: '📥',
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
          icon: '🎒',
          text: `Убрать в инвентарь: ${carryDef?.e || ''}`,
          fn: () => {
            s.player.carrying = null;
            s.player._dropPreview = null;
            logActivity(stateRef.current, '🎒', `Убрал: ${carryDef?.e || ''}`);
            toast(`${carryDef?.e || ''} в инвентаре`, 'ok');
          }
        });
      }

      items.push({ icon: '👤', text: 'Профиль', fn: () => openModal('profile') });
      items.push({ icon: '🏆', text: 'Ачивки', fn: () => openModal('achievements') });
      items.push({ icon: '📋', text: 'Дейли квесты', fn: () => openModal('quests') });
      items.push({ icon: '🎨', text: 'Оформить кабинет', fn: () => openModal('decorate') });
      items.push({ icon: '🛒', text: 'Магазин', fn: () => openModal('shop') });
      items.push({ icon: '📋', text: 'Инвентарь', fn: () => openModal('inventory') });
      items.push({ icon: '📐', text: 'Whiteboard', fn: () => openModal('whiteboard') });

      // Room-specific mini-games
      const playerGx = Math.floor(s.player.x / TILE);
      const playerGy = Math.floor(s.player.y / TILE);
      const pRoom = getRoomAt(playerGx, playerGy);
      if (pRoom) {
        if (pRoom.id === 'smoking') {
          items.push({ icon: '🚬', text: 'Прокурить 🚬', fn: () => openModal('smoke') });
        }
      }

      showCtx(e.clientX, e.clientY, items);
    };
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => canvas.removeEventListener('contextmenu', onContextMenu);
  }, [openModal, toast]);

  // Close ctx menu on click
  useEffect(() => {
    const close = () => {
      const el = document.getElementById('ctx-menu');
      if (el) el.style.display = 'none';
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  function showCtx(x: number, y: number, items: CtxItem[]) {
    const el = document.getElementById('ctx-menu');
    if (!el) return;
    el.innerHTML = items
      .map((i, idx) => `<div class="ctx-item" data-idx="${idx}"><span class="ctx-icon">${i.icon}</span><span class="ctx-text">${i.text}</span></div>`)
      .join('');
    el.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    el.style.top = Math.min(y, window.innerHeight - items.length * 40 - 16) + 'px';
    el.style.display = 'block';
    el.querySelectorAll('.ctx-item').forEach((itemEl) => {
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        el.style.display = 'none';
        const idx = parseInt((itemEl as HTMLElement).dataset.idx || '0');
        items[idx].fn();
      });
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
      const placedObjs = getPlacedObjectsAsGameObjects(s);
      const allObjects = [...s.objects, ...placedObjs];

      const { vx: playerVx, vy: playerVy } = updatePlayer(s.player, input, s.map, allObjects, dt);
      updateAnimState(s.player.anim, playerVx, playerVy);

      updateBots(s, dt);
      updatePet(s, dt);
      // Update bot animations
      for (const bot of s.bots) {
        const bvx = (bot as any)._lastVx ?? 0;
        const bvy = (bot as any)._lastVy ?? 0;
        if (s.botAnims[bot.id]) {
          updateAnimState(s.botAnims[bot.id], bvx, bvy);
        }
      }

      updateBossCall(s, dt);
      updateBossCallTimer(s, dt);
      checkBossCallReward(s);
      updateRoomIncome(s, dt);

      // Check interaction zones
      const zone = checkInteractions(s.player.x, s.player.y);
      setNearInteraction(zone);

      // Update drop preview for carried item — follows mouse cursor in real-time
      if (s.player.carrying && input.mouseX !== null && input.mouseY !== null) {
        const worldMX = input.mouseX / cam.zoom + cam.x;
        const worldMY = input.mouseY / cam.zoom + cam.y;
        updateDropPreview(s, worldMX, worldMY);
      } else {
        updateDropPreview(s);
      }

      updateCamera(cam, s.player, canvas.width, canvas.height);

      render(ctx, canvas, cam, s.map, [...s.objects, ...placedObjs], s.player, s.bots, frameRef.current, [], s.player.carrying, s.player._dropPreview, s.player.anim, s.botAnims, remotePlayersRef.current);

      // Send position to server every 5 frames (~80ms)
      if (frameRef.current % 5 === 0) {
        sendPosition(s.player.x, s.player.y);
      }

      if (frameRef.current % 30 === 0) setTick((n) => n + 1);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    return () => { running = false; };
  }, []);

  function getPlacedObjects(s: GameState): GameObject[] {
    return getPlacedObjectsAsGameObjects(s);
  }

  // Detect current room
  const gx = Math.floor(player.x / TILE);
  const gy = Math.floor(player.y / TILE);
  const currentRoom = state.map[gy]?.[gx] === 2 ? getRoomAt(gx, gy) : null;

  return (
    <>
      <canvas ref={canvasRef} />

      {/* Interaction buttons — pixel style */}
      {nearInteraction && !smokingGame && !smokingResult && nearInteraction.id === 'ashtray' && (
        <button
          onClick={() => setSmokingGame({ active: true, startTime: Date.now(), taps: 0, targetTaps: 30 })}
          className="px-btn danger"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 24px', fontSize: 10, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          🚬 ПЕРЕКУР
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'bookshelf' && (
        <button
          onClick={() => {
            const idx = Math.floor(Math.random() * BOOK_PREDICTIONS.length);
            openModal('book_prediction', { prediction: BOOK_PREDICTIONS[idx] });
          }}
          className="px-btn"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 24px', fontSize: 10, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          📖 ГРНУТЬ КНИГУ
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'basketball' && (
        <button
          onClick={() => openModal('basketball')}
          className="px-btn"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 24px', fontSize: 10, zIndex: 50,
            background: '#ff6600', borderColor: '#cc5500', color: '#fff',
            animation: 'pulse 1.5s infinite',
          }}
        >
          🏀 БАСКЕТБОЛ
        </button>
      )}

      {/* Smoking minigame overlay */}
      {smokingGame?.active && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,26,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div className="px-panel" style={{ width: 320, textAlign: 'center' }}>
            <div className="px-panel-header">
              <span>SMOKING BREAK</span>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚬</div>
              <div style={{ fontSize: 10, color: 'var(--px-title)', marginBottom: 6 }}>TAP FAST!</div>
              <div style={{ width: '100%', height: 10, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', marginBottom: 12 }}>
                <div style={{
                  width: `${(smokingGame.taps / smokingGame.targetTaps) * 100}%`,
                  height: '100%', background: 'var(--px-accent)',
                  transition: 'width 0.1s',
                }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 14 }}>
                {smokingGame.taps} / {smokingGame.targetTaps}
              </div>
              <button
                onClick={() => {
                  const newTaps = smokingGame.taps + 1;
                  if (newTaps >= smokingGame.targetTaps) {
                    const elapsed = Date.now() - smokingGame.startTime;
                    const board = saveSmokingRecord(state.player.name, elapsed);
                    setSmokingGame(null);
                    setSmokingResult({ time: elapsed, board });
                    logActivity(stateRef.current, '🚬', `Покурил за ${(elapsed / 1000).toFixed(1)}с`);
                  } else {
                    setSmokingGame({ ...smokingGame, taps: newTaps });
                  }
                }}
                className="px-btn danger"
                style={{ width: 100, height: 100, fontSize: 32, padding: 0, justifyContent: 'center' }}
              >🚬</button>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setSmokingGame(null)} className="px-btn small">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smoking result + leaderboard */}
      {smokingResult && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,26,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div className="px-panel" style={{ width: 320, textAlign: 'center' }}>
            <div className="px-panel-header">
              <span>LEADERBOARD</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
              <div style={{ fontSize: 14, color: 'var(--px-title)', marginBottom: 2 }}>
                {(smokingResult.time / 1000).toFixed(1)}s
              </div>
              <div style={{ fontSize: 7, color: 'var(--px-text-dim)', marginBottom: 14 }}>YOUR TIME</div>
              <div style={{ fontSize: 8, color: 'var(--px-text)', marginBottom: 8, textAlign: 'left' }}>
                🏅 TOP 3
              </div>
              {smokingResult.board.slice(0, 3).map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', marginBottom: 3,
                  background: i === 0 ? '#3a3020' : 'var(--px-bg)',
                  border: i === 0 ? '1px solid var(--px-title)' : '1px solid var(--px-border-dark)',
                }}>
                  <span style={{ fontSize: 10 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span style={{ flex: 1, fontSize: 7, color: 'var(--px-text)' }}>{r.name}</span>
                  <span style={{ fontSize: 7, color: 'var(--px-text-dim)' }}>{(r.time / 1000).toFixed(1)}s</span>
                </div>
              ))}
              <button onClick={() => setSmokingResult(null)} className="px-btn accent" style={{ marginTop: 12 }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <div
        id="ctx-menu"
        style={{
          position: 'fixed',
          display: 'none',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)',
          padding: 6,
          zIndex: 100,
          minWidth: 200,
          border: '1px solid rgba(0,0,0,.06)',
        }}
      />

      {/* Activity Feed */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 10, pointerEvents: 'none' }}>
        {player.activities.slice(0, 3).map((a: Activity, i: number) => (
          <div key={i} className="px-panel" style={{ padding: '5px 10px', marginBottom: 3, fontSize: 7, color: 'var(--px-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{a.icon}</span>
            <span>{a.text}</span>
            <span style={{ color: 'var(--px-text-dim)', fontSize: 6, marginLeft: 'auto' }}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* Room indicator */}
      {currentRoom && (
        <div className="px-panel" style={{
          position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
          padding: '5px 14px', fontSize: 7, color: 'var(--px-title)', zIndex: 10, pointerEvents: 'none',
        }}>
          &gt; {currentRoom.name}
        </div>
      )}

      {/* Boss Call Alert */}
      {state.bossCall.active && (
        <div className="px-panel" style={{
          position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', fontSize: 8, color: 'var(--px-title)', zIndex: 100, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 8, borderColor: 'var(--px-danger)',
        }}>
          <span>👔 BOSS CALL!</span>
          <span style={{ fontSize: 7, color: 'var(--px-text-dim)' }}>
            {Math.ceil(state.bossCall.timer)}s +{state.bossCall.reward}
          </span>
        </div>
      )}

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
            boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark), 2px 2px 0 var(--px-shadow)',
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 200,
          }}
        >
          <div style={{
            width: 36, height: 36, border: '2px solid var(--px-border)',
            background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }} suppressHydrationWarning>{player.av}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8, color: 'var(--px-title)', marginBottom: 2 }}>{player.name}</div>
            <div style={{ fontSize: 6, color: 'var(--px-text-dim)' }}>{player.role}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10 }}>🪙</span>
              <span style={{ fontSize: 8, color: 'var(--px-title)' }}>{player.coins}</span>
            </div>
            <div style={{ fontSize: 6, color: 'var(--px-text-dim)' }}>
              {player.placedItems.length} items
            </div>
          </div>
        </div>

        {/* Emoji bar */}
        <div style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '6px 8px', pointerEvents: 'auto', display: 'flex', gap: 3, alignSelf: 'flex-end',
        }}>
          {EMOJI_CHAT.map((em) => (
            <div key={em} onClick={() => sendEmoji(em)} className="emoji-btn">{em}</div>
          ))}
        </div>

        {/* MP + coins */}
        <div style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '8px 12px', pointerEvents: 'auto', alignSelf: 'flex-end',
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, background: mpConnected ? 'var(--px-accent)' : 'var(--px-danger)' }} />
            <span style={{ fontSize: 7, color: 'var(--px-text-dim)' }}>
              {mpConnected ? `${remotePlayers.length + 1} ONLINE` : 'OFFLINE'}
            </span>
          </div>
          <div style={{ fontSize: 7, color: 'var(--px-title)' }}>
            🏆 {player.achievements.length}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,26,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="px-panel" style={{ width: 500, maxHeight: '80vh', overflow: 'hidden' }}>
            <div className="px-panel-header">
              <span>{getModalTitle(modalType)}</span>
              <button onClick={closeModal} className="px-btn small" style={{ padding: '2px 6px', fontSize: 8, lineHeight: 1 }}>
                X
              </button>
            </div>
            <div style={{ padding: 16, maxHeight: '60vh', overflowY: 'auto' }}>
              {modalType === 'shop' && <ShopView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'inventory' && <InventoryView state={stateRef.current} onToast={toast} />}
              {modalType === 'decorate' && <DecorateView state={stateRef.current} onToast={toast} />}
              {modalType === 'profile' && <ProfileView state={stateRef.current} />}
              {modalType === 'achievements' && <AchievementsView state={stateRef.current} />}
              {modalType === 'quests' && <QuestsView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'talk' && <TalkView data={modalData} state={stateRef.current} onToast={toast} />}
              {modalType === 'rps' && <RpsView data={modalData} state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'whiteboard' && <WhiteboardView />}
              {modalType === 'smoke' && <SmokeView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'microwave' && <MicrowaveView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'mp_rps' && <MpRpsView data={modalData} myChoice={rpsMyChoice} sentChoice={rpsSentChoice} result={rpsResult} onChoice={(c) => { setRpsMyChoice(c); setRpsSentChoice(true); sendRpsChoice(modalData.gameId as string, c); }} onClose={closeModal} onToast={toast} />}
              {modalType === 'book_prediction' && <BookPredictionView prediction={modalData.prediction as string} />}
              {modalType === 'basketball' && <BasketballView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
            </div>
          </div>
        </div>
      )}

      {/* RPS Invite Notification */}
      {rpsInvite && (
        <div className="px-panel" style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 16px', zIndex: 200, display: 'flex', alignItems: 'center', gap: 12,
          borderColor: 'var(--px-accent)',
        }}>
          <div>
            <div style={{ fontSize: 8, color: 'var(--px-title)' }}>🎮 RPS FROM {rpsInvite.fromName}</div>
            <div style={{ fontSize: 7, color: 'var(--px-text-dim)', marginTop: 2 }}>ACCEPT?</div>
          </div>
          <button onClick={() => { acceptRpsInvite(rpsInvite.gameId); setRpsInvite(null); }} className="px-btn accent small">YES</button>
          <button onClick={() => { declineRpsInvite(rpsInvite.gameId); setRpsInvite(null); }} className="px-btn small">NO</button>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="px-panel" style={{
          position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', fontSize: 8, color: toastType === 'ok' ? 'var(--px-accent)' : 'var(--px-text)',
          zIndex: 200, pointerEvents: 'none', borderColor: toastType === 'ok' ? 'var(--px-accent)' : 'var(--px-border)',
        }}>
          {toastType === 'ok' ? '> ' : '! '}{toastMsg}
        </div>
      )}

      {/* Confetti */}
      {confettiTrigger > 0 && <ConfettiEffect trigger={confettiTrigger} />}
    </>
  );
}

function getModalTitle(type: string): string {
  const t: Record<string, string> = {
    shop: 'Магазин',
    inventory: 'Инвентарь',
    decorate: 'Оформить кабинет',
    profile: 'Профиль',
    achievements: 'Ачивки',
    quests: 'Дейли квесты',
    talk: 'Разговор',
    rps: 'Камень-Ножницы-Бумага',
    whiteboard: 'Whiteboard',
    smoke: 'Курилка',
    microwave: 'Кухня — Микроволновка',
    mp_rps: 'КНБ с игроком',
    book_prediction: '📖 Книга Судеб',
    basketball: '🏀 Баскетбол',
  };
  return t[type] || '';
}

// ===== SHOP =====
function ShopView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const [cat, setCat] = useState('desks');
  const [preview, setPreview] = useState<string | null>(null);
  const labels: Record<string, string> = { desks: 'Столы', chairs: 'Стулья', sofas: 'Диваны', lights: 'Свет', small: 'Мелочь', wall: 'Стены' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#999' }}>Выбери предмет для своего кабинета</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#4ecca3', background: '#f0f0f0', padding: '3px 10px', borderRadius: 8 }}>
          🪙 {state.player.coins} алт
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.keys(SHOP).map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setPreview(null); }}
            className="modal-btn"
            style={{
              background: cat === c ? '#333' : undefined,
              color: cat === c ? '#fff' : undefined,
              borderColor: cat === c ? '#333' : undefined,
            }}
          >
            {labels[c] || c}
          </button>
        ))}
      </div>

      {preview && (() => {
        const pItem = ALL_ITEMS.find(i => i.id === preview);
        if (!pItem) return null;
        return (
          <div style={{ background: '#f0f0f0', borderRadius: 12, padding: 16, marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 120, height: 120, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
              <img src={pItem.sprite} alt={pItem.n} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', imageRendering: 'pixelated' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{pItem.n}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{pItem.surface === 'wall' ? 'На стену' : 'На пол'} · {pItem.w}×{pItem.h}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4ecca3', marginTop: 6 }}>{pItem.p} алт</div>
              <button
                onClick={() => {
                  const res = buyItem(state, pItem.id);
                  if (res.ok) { onToast(res.msg, 'ok'); onConfetti(); }
                  else onToast(res.msg, 'info');
                }}
                style={{
                  marginTop: 8, padding: '6px 18px', background: '#4ecca3', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}
              >Купить</button>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {(SHOP as any)[cat]?.map((item: any) => {
          const count = state.player.furniture.filter(id => id === item.id).length + state.player.placedItems.filter(pi => pi.id === item.id).length;
          return (
            <div
              key={item.id}
              onClick={() => setPreview(preview === item.id ? null : item.id)}
              style={{
                background: preview === item.id ? '#e8f5e9' : '#f8f8f8',
                borderRadius: 10,
                padding: 8,
                textAlign: 'center',
                cursor: 'pointer',
                border: `2px solid ${preview === item.id ? '#4ecca3' : 'transparent'}`,
                transition: '0.15s',
              }}
            >
              <div style={{ width: '100%', aspectRatio: '1', background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6, maxHeight: 120 }}>
                <img src={item.sprite} alt={item.n} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{item.n}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{item.p} алт {count > 0 && <span style={{ color: '#4ecca3' }}>({count})</span>}</div>
            </div>
          );
        })}
      </div>
    </div>
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setTab('all')} className="modal-btn" style={{ background: tab === 'all' ? '#333' : undefined, color: tab === 'all' ? '#fff' : undefined, borderColor: tab === 'all' ? '#333' : undefined }}>
          Куплено ({state.player.furniture.length})
        </button>
        <button onClick={() => setTab('placed')} className="modal-btn" style={{ background: tab === 'placed' ? '#333' : undefined, color: tab === 'placed' ? '#fff' : undefined, borderColor: tab === 'placed' ? '#333' : undefined }}>
          Размещено ({placed.length})
        </button>
        {state.player.carrying && (
          <button onClick={() => setTab('carrying')} className="modal-btn" style={{ background: tab === 'carrying' ? '#333' : undefined, color: tab === 'carrying' ? '#fff' : undefined, borderColor: tab === 'carrying' ? '#333' : undefined }}>
            В руках
          </button>
        )}
      </div>

      {tab === 'all' && (
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Нажми на предмет чтобы взять в руки, потом правой кнопкой → Поставить</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {state.player.furniture.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#bbb', padding: 30, fontSize: 12 }}>Пусто. Сходи в магазин!</div>
            )}
            {Object.entries(itemCounts).map(([id, count]) => {
              const item = ALL_ITEMS.find((x) => x.id === id);
              const placedCount = placedCounts[id] || 0;
              const available = count - placedCount;
              return (
                <div
                  key={id}
                  onClick={() => {
                    if (available <= 0) { onToast('Все размещены', 'info'); return; }
                    if (state.player.carrying) { onToast('Уже держишь предмет', 'info'); return; }
                    state.player.carrying = id;
                    onToast(`Взял ${item?.e || ''}`, 'ok');
                  }}
                  style={{
                    background: available > 0 ? '#f8f8f8' : '#e8f5e9',
                    borderRadius: 10,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    border: `2px solid ${available > 0 ? '#ddd' : '#4ecca360'}`,
                    cursor: available > 0 ? 'pointer' : 'default',
                    opacity: available > 0 ? 1 : 0.5,
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 }}>
                    <img src={item?.sprite} alt={item?.n} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#333' }}>{item?.n} {count > 1 && `×${count}`}</div>
                  {available > 0 && <div style={{ fontSize: 8, color: '#4ecca3', marginTop: 2 }}>{available} свободно</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'placed' && (
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Подойди к предмету и правой кнопкой → «Взять»</div>
          {placed.length === 0 && (
            <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: 20 }}>Ничего не размещено</div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {placed.map((p, i) => {
              const item = ALL_ITEMS.find((x) => x.id === p.id);
              return (
                <div
                  key={`${p.id}_${i}`}
                  style={{
                    padding: '6px 10px',
                    background: p.surface === 'wall' ? '#e3f2fd' : '#e8f5e9',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                  }}
                >
                  <img src={item?.sprite} alt="" style={{ width: 24, height: 24, objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span style={{ fontWeight: 600 }}>{item?.n}</span>
                  <span style={{ color: '#bbb', fontSize: 9 }}>{p.surface === 'wall' ? 'стена' : 'пол'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'carrying' && state.player.carrying && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ width: 100, height: 100, background: '#f0f0f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', overflow: 'hidden' }}>
            <img src={ALL_ITEMS.find(i => i.id === state.player.carrying)?.sprite} alt="" style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', imageRendering: 'pixelated' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Держишь: {ALL_ITEMS.find(i => i.id === state.player.carrying)?.n}</div>
          <div style={{ fontSize: 11, color: '#999' }}>Подойди куда нужно и правой кнопкой → «Поставить»</div>
        </div>
      )}
    </div>
  );
}

// ===== DECORATE (grid-based placement) =====
function DecorateView({ state, onToast }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const placed = state.player.placedItems;

  return (
    <div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        Предметы размещаются свободно. Подойди к предмету и правой кнопкой → «Взять» или «Поставить»
      </div>

      {/* Currently carrying */}
      {state.player.carrying && (
        <div style={{ background: '#fff9c4', borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>📦 Держишь: {getItemEmoji(state.player.carrying)} {ALL_ITEMS.find(i => i.id === state.player.carrying)?.n}</div>
          <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Подойди куда нужно → правая кнопка → «Поставить»</div>
        </div>
      )}

      {/* Placed items list */}
      <div style={{ fontSize: 10, color: '#999', marginBottom: 6 }}>Размещено ({placed.length})</div>
      {placed.length === 0 && (
        <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: 20 }}>Ничего не размещено. Купи в магазине!</div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {placed.map((p, i) => {
          const item = ALL_ITEMS.find((x) => x.id === p.id);
          return (
            <div
              key={`${p.id}_${i}`}
              style={{
                padding: '6px 10px',
                background: p.surface === 'wall' ? '#e3f2fd' : '#e8f5e9',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
              }}
            >
              <span>{item?.e}</span>
              <span style={{ color: '#999' }}>{item?.n}</span>
              <span style={{ color: '#bbb', fontSize: 9 }}>{p.surface === 'wall' ? '🏠 стена' : '⬛ пол'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== PROFILE =====
function ProfileView({ state }: { state: GameState }) {
  const p = state.player;
  return (
    <div style={{ textAlign: 'center', padding: 10 }}>
      <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', margin: '0 auto 8px', background: '#f5f5f5' }}>
        <img src={`/sprites/pers/${p.charId}.png`} alt={p.charId} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>{p.role}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700 }}>{p.coins}</div><div style={{ fontSize: 9, color: '#999' }}>алт</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700 }}>{p.furniture.length}</div><div style={{ fontSize: 9, color: '#999' }}>предметов</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700 }}>{p.achievements.length}</div><div style={{ fontSize: 9, color: '#999' }}>ачивок</div></div>
      </div>
      <input
        style={{ width: '100%', padding: 8, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 12, textAlign: 'center', marginBottom: 6 }}
        value={p.name}
        onChange={(e) => { p.name = e.target.value; persistState(state); }}
        placeholder="Имя"
      />
      <input
        style={{ width: '100%', padding: 8, border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 12, textAlign: 'center' }}
        value={p.role}
        onChange={(e) => { p.role = e.target.value; persistState(state); }}
        placeholder="Роль"
      />
      <button
        onClick={() => { logout(); window.location.reload(); }}
        style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: '1px solid #e94560', background: 'transparent', color: '#e94560', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
      >Выйти из аккаунта</button>
    </div>
  );
}

const AVATARS = ['🧑‍🚀', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🔧', '👩‍🔬', '🧑‍🍳', '🦊', '🐱', '🐨', '🐸', '👻'];
import { SHOP } from '../game/constants';

// ===== ACHIEVEMENTS =====
function AchievementsView({ state }: { state: GameState }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = state.player.achievements.includes(a.id);
          return (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: 11,
                background: unlocked ? '#e8f5e9' : '#f8f8f8',
                color: unlocked ? '#4ecca3' : '#999',
                fontWeight: unlocked ? 600 : 400,
              }}
              title={a.desc}
            >
              {a.icon} {a.name} {unlocked ? '✓' : ''}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#999' }}>
        Открыто: {state.player.achievements.length}/{ACHIEVEMENTS.length}
      </div>
    </div>
  );
}

// ===== QUESTS =====
function QuestsView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>Выполняй квесты каждый день!</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DAILY_QUESTS.map((quest) => {
          const progress = getQuestProgress(state, quest.id);
          const done = progress >= quest.target;
          const claimed = state.dailyQuests.claimed.includes(quest.id);
          return (
            <div
              key={quest.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: claimed ? '#e8f5e9' : done ? '#fff9c4' : '#f8f8f8',
                border: `1px solid ${claimed ? '#4ecca3' : done ? '#ffa726' : '#e8e8e8'}`,
              }}
            >
              <div style={{ fontSize: 20 }}>{quest.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{quest.name}</div>
                <div style={{ fontSize: 10, color: '#999' }}>{quest.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#999' }}>
                  {Math.min(progress, quest.target)}/{quest.target}
                </div>
                {done && !claimed && (
                  <div
                    onClick={() => {
                      const res = claimQuestReward(state, quest.id);
                      if (res.ok) { onToast(res.msg, 'ok'); onConfetti(); }
                      else onToast(res.msg, 'info');
                    }}
                    style={{
                      fontSize: 10,
                      color: '#4ecca3',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: 2,
                    }}
                  >
                    +{quest.reward} алт
                  </div>
                )}
                {claimed && (
                  <div style={{ fontSize: 10, color: '#4ecca3', fontWeight: 600, marginTop: 2 }}>
                    Получено ✓
                  </div>
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
  const phrases = ['Привет! Как дела?', 'Видел задачу в трекере?', 'Нужно обсудить спринт', 'Кофе? ☕', 'Петя опять деплой сломал', 'Давай на whiteboard сходим'];

  if (bot?.id === 'kryska') {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🐀</div>
        <div style={{ background: '#f8f8f8', padding: 12, borderRadius: 10, fontSize: 13 }}>Крыска пищит: *пии-пии*</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>+5 алт</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 10 }}>
      <div style={{ background: '#f8f8f8', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 13 }}>
        {bot?.name}: &quot;{phrases[Math.floor(Math.random() * phrases.length)]}&quot;
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>+5 алт за разговор</div>
    </div>
  );
}

// ===== RPS =====
function RpsView({ data, state, onToast, onConfetti }: { data: Record<string, unknown>; state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const result = rpsGame(state);
  useEffect(() => {
    if (result.reward > 0) { onToast(`+${result.reward} алт`, 'ok'); onConfetti(); }
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Против {(data.bot as any)?.name || 'Бот'}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>{result.playerChoice}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Ты</div>
        </div>
        <div style={{ fontSize: 20, color: '#ccc', display: 'flex', alignItems: 'center' }}>vs</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>{result.botChoice}</div>
          <div style={{ fontSize: 10, color: '#999' }}>{(data.bot as any)?.name}</div>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: result.reward > 0 ? '#4ecca3' : '#e94560' }}>
        {result.result}{result.reward > 0 ? ` +${result.reward} алт` : ''}
      </div>
    </div>
  );
}

// ===== WHITEBOARD =====
function WhiteboardView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const color = useRef('#333');

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 560, 360);
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
    c.onmouseup = c.onmouseleave = () => { drawing.current = false; };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {['#333', '#e94560', '#4ecca3', '#ffa726', '#2196f3', '#9c27b0'].map((c) => (
          <div key={c} onClick={() => { color.current = c; }} style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', background: c }} />
        ))}
        <div style={{ width: 1, height: 20, background: '#e0e0e0', margin: '0 4px' }} />
        <button onClick={() => { const c = canvasRef.current; if (c) { c.getContext('2d')?.clearRect(0, 0, 560, 360); c.getContext('2d')!.fillStyle = '#fff'; c.getContext('2d')!.fillRect(0, 0, 560, 360); } }} className="modal-btn">Очистить</button>
      </div>
      <canvas ref={canvasRef} width="560" height="360" style={{ borderRadius: 8, border: '1px solid #e0e0e0', width: '100%', cursor: 'crosshair' }} />
    </div>
  );
}

// ===== SMOKE TAP GAME =====
function SmokeView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const TAP_TARGET = 30; // taps needed to finish
  const TIME_LIMIT = 20; // seconds
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
          unlockAchievement(state, 'smoker');
          logActivity(state, '🚬', 'Прокурил в курилке');
          onToast('+20 алт Выкурил!', 'ok');
          onConfetti();
        }, 0);
      }
      return next;
    });
  };

  const progress = (taps / TAP_TARGET) * 100;

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>🚬</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Прокури сигарету!</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
        {done ? (won ? 'Готово!' : 'Время вышло!') : `Жми ${TAP_TARGET} раз за ${TIME_LIMIT}с`}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 12, background: '#eee', borderRadius: 6, overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ height: '100%', background: done && !won ? '#e94560' : 'linear-gradient(90deg, #888, #4ecca3)', borderRadius: 6, transition: 'width 0.05s', width: `${progress}%` }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, margin: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e94560' }}>{timeLeft}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Секунд</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4ecca3' }}>{taps}/{TAP_TARGET}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Тапов</div>
        </div>
      </div>

      {/* Tap button */}
      {!done && (
        <button
          onClick={handleTap}
          style={{
            fontSize: 18,
            padding: '12px 32px',
            borderRadius: 12,
            border: '2px solid #888',
            background: '#f5f5f5',
            cursor: 'pointer',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
          onMouseDown={(e) => (e.currentTarget.style.background = '#ddd')}
          onMouseUp={(e) => (e.currentTarget.style.background = '#f5f5f5')}
        >
          🚬 Тап!
        </button>
      )}

      {done && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: won ? '#4ecca3' : '#e94560' }}>
            {won ? 'Выкурил! +20 алт' : 'Не успел! 😅'}
          </div>
          <button onClick={() => { setTaps(0); setTimeLeft(TIME_LIMIT); setDone(false); setWon(false); finishedRef.current = false; }} className="modal-btn" style={{ marginTop: 8 }}>
            Ещё раз 🔄
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
      onToast(`+${res.reward} алт`, 'ok');
      onConfetti();
    }
    logActivity(state, '⏱️', `Разогрел обед: ${res.stoppedAt}`);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const displayTime = (elapsed / 1000).toFixed(3);
  const progress = Math.min((elapsed / 8000) * 100, 100); // 8s full bar
  const targetZone = (5000 / 8000) * 100; // 5s mark = 62.5% of bar

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>⏱️</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Разогреть обед</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Останови таймер на 5.000 секунд</div>

      {/* Timer display */}
      <div style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 16, color: status === 'running' ? '#e94560' : '#333' }}>
        {status === 'waiting' ? '0.000' : status === 'done' ? result?.stoppedAt || '0.000' : displayTime}
      </div>

      {/* Progress bar with target zone */}
      <div style={{ position: 'relative', width: '100%', height: 12, background: '#eee', borderRadius: 6, overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ position: 'absolute', left: `${targetZone - 5}%`, width: '10%', height: '100%', background: '#4ecca330', borderLeft: '2px dashed #4ecca3', borderRight: '2px dashed #4ecca3' }} />
        <div style={{ height: '100%', background: status === 'done' && result?.reward === 0 ? '#e94560' : 'linear-gradient(90deg, #ffa726, #e94560)', borderRadius: 6, transition: status === 'running' ? 'none' : 'width 0.3s', width: `${status === 'running' ? progress : status === 'done' ? Math.min(((parseFloat(result?.stoppedAt || '0') * 1000) / 8000) * 100, 100) : 0}%` }} />
      </div>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 12 }}>▲ цель — 5.000с</div>

      {/* Result */}
      {result && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: result.reward > 0 ? '#4ecca3' : '#e94560' }}>
            {result.result}{result.reward > 0 ? ` +${result.reward} алт` : ''}
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>Точность: ±{result.diff.toFixed(3)}с</div>
        </div>
      )}

      {/* Button */}
      {status === 'waiting' && (
        <button onClick={startTimer} className="modal-btn" style={{ fontSize: 14, padding: '8px 24px' }}>
          Запустить ⏱️
        </button>
      )}
      {status === 'running' && (
        <button onClick={stopTimer} className="modal-btn" style={{ fontSize: 14, padding: '8px 24px', background: '#e94560', color: '#fff', borderColor: '#e94560' }}>
          СТОП! 🛑
        </button>
      )}
      {status === 'done' && (
        <button onClick={() => { setResult(null); setStatus('waiting'); setElapsed(0); }} className="modal-btn" style={{ fontSize: 14, padding: '8px 24px' }}>
          Ещё раз 🔄
        </button>
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
        <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Против {(data.opponentName as string) || 'Игрок'}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>{choiceEmoji[result.myChoice] || '?'}</div>
            <div style={{ fontSize: 10, color: '#999' }}>Ты</div>
          </div>
          <div style={{ fontSize: 20, color: '#ccc', display: 'flex', alignItems: 'center' }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>{choiceEmoji[result.theirChoice] || '?'}</div>
            <div style={{ fontSize: 10, color: '#999' }}>{(data.opponentName as string) || 'Игрок'}</div>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: result.winner === 'you' ? '#4ecca3' : result.winner === 'draw' ? '#ffa726' : '#e94560' }}>
          {result.winner === 'you' ? 'Ты выиграл!' : result.winner === 'draw' ? 'Ничья!' : 'Ты проиграл!'}
          {result.reward > 0 ? ` +${result.reward} алт` : ''}
        </div>
        <button onClick={onClose} className="modal-btn" style={{ marginTop: 12 }}>Закрыть</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Против {(data.opponentName as string) || 'Игрок'}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        {sentChoice ? 'Ждём выбора opponent...' : 'Выбери:'}
      </div>
      {!sentChoice && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button onClick={() => onChoice('rock')} style={{ fontSize: 36, padding: '12px 20px', borderRadius: 12, border: '2px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}>✊</button>
          <button onClick={() => onChoice('paper')} style={{ fontSize: 36, padding: '12px 20px', borderRadius: 12, border: '2px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}>✋</button>
          <button onClick={() => onChoice('scissors')} style={{ fontSize: 36, padding: '12px 20px', borderRadius: 12, border: '2px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}>✌️</button>
        </div>
      )}
      {sentChoice && (
        <div style={{ fontSize: 36 }}>{choiceEmoji[myChoice || ''] || '?'}</div>
      )}
    </div>
  );
}

// ===== BASKETBALL =====
function BasketballView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(10);
  const [ballState, setBallState] = useState<{ x: number; y: number; vx: number; vy: number; flying: boolean; scored: boolean } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const gameRef = useRef({ score: 0, attempts: 10, ball: { x: 80, y: 320, vx: 0, vy: 0, flying: false, scored: false }, dragStart: null as { x: number; y: number } | null, frame: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 400;
    canvas.height = 400;
    let running = true;

    const HOOP_X = 320;
    const HOOP_Y = 120;
    const HOOP_W = 40;
    const GRAVITY = 0.15;
    const BALL_R = 10;
    const BALL_START_X = 80;
    const BALL_START_Y = 320;

    function loop() {
      if (!running || !ctx) return;
      const g = gameRef.current;
      g.frame++;
      ctx.clearRect(0, 0, 400, 400);

      // Background
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(0, 0, 400, 400);

      // Court lines
      ctx.strokeStyle = '#8B451340';
      ctx.lineWidth = 1;
      for (let i = 0; i < 400; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke();
      }

      // Backboard
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(HOOP_X + HOOP_W / 2 + 2, HOOP_Y - 30, 8, 60);
      ctx.fillStyle = '#fff';
      ctx.fillRect(HOOP_X + HOOP_W / 2 - 10, HOOP_Y - 20, 22, 22);
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;
      ctx.strokeRect(HOOP_X + HOOP_W / 2 - 10, HOOP_Y - 20, 22, 22);

      // Hoop ring
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(HOOP_X - HOOP_W / 2, HOOP_Y);
      ctx.lineTo(HOOP_X + HOOP_W / 2, HOOP_Y);
      ctx.stroke();

      // Net (simple lines)
      ctx.strokeStyle = '#ffffff80';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const nx = HOOP_X - HOOP_W / 2 + (HOOP_W / 4) * i;
        ctx.beginPath();
        ctx.moveTo(nx, HOOP_Y);
        ctx.lineTo(nx + (i - 2) * 3, HOOP_Y + 25);
        ctx.stroke();
      }

      // Ball physics
      if (g.ball.flying) {
        g.ball.vy += GRAVITY;
        g.ball.x += g.ball.vx;
        g.ball.y += g.ball.vy;

        // Score detection
        if (!g.ball.scored &&
          g.ball.x > HOOP_X - HOOP_W / 2 && g.ball.x < HOOP_X + HOOP_W / 2 &&
          g.ball.y > HOOP_Y - 5 && g.ball.y < HOOP_Y + 10 &&
          g.ball.vy > 0) {
          g.ball.scored = true;
          g.score++;
          setScore(g.score);
          onToast('🏀 Забросил! +1', 'ok');
        }

        // Out of bounds or stopped
        if (g.ball.y > 420 || g.ball.x > 420 || g.ball.x < -20) {
          g.ball.flying = false;
          g.ball.x = BALL_START_X;
          g.ball.y = BALL_START_Y;
          g.ball.vx = 0;
          g.ball.vy = 0;
          g.attempts--;
          setAttempts(g.attempts);
          if (g.attempts <= 0) {
            const coins = g.score * 15;
            addCoins(state, coins);
            onToast(g.score >= 7 ? `🏆 Отлично! ${g.score}/10 → +${coins} алт` : `${g.score}/10 → +${coins} алт`, g.score >= 7 ? 'ok' : 'info');
            if (g.score >= 7) onConfetti();
            g.score = 0;
            g.attempts = 10;
            setScore(0);
            setAttempts(10);
          }
        }
      }

      // Draw drag line
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

      // Draw ball
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cc5500';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Ball lines
      ctx.strokeStyle = '#cc550040';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(g.ball.x - BALL_R, g.ball.y);
      ctx.lineTo(g.ball.x + BALL_R, g.ball.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(g.ball.x, g.ball.y - BALL_R);
      ctx.lineTo(g.ball.x, g.ball.y + BALL_R);
      ctx.stroke();

      // UI
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

      requestAnimationFrame(loop);
    }

    loop();
    return () => { running = false; };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (400 / rect.width);
    const y = (e.clientY - rect.top) * (400 / rect.height);
    const g = gameRef.current;
    const dx = x - g.ball.x;
    const dy = y - g.ball.y;
    if (Math.sqrt(dx * dx + dy * dy) < 40 && !g.ball.flying && g.attempts > 0) {
      g.dragStart = { x, y };
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameRef.current.dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragEnd({
      x: (e.clientX - rect.left) * (400 / rect.width),
      y: (e.clientY - rect.top) * (400 / rect.height),
    });
  };

  const handleMouseUp = () => {
    const g = gameRef.current;
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
    setDragStart(null);
    setDragEnd(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (t.clientX - rect.left) * (400 / rect.width);
    const y = (t.clientY - rect.top) * (400 / rect.height);
    const g = gameRef.current;
    const dx = x - g.ball.x;
    const dy = y - g.ball.y;
    if (Math.sqrt(dx * dx + dy * dy) < 50 && !g.ball.flying && g.attempts > 0) {
      g.dragStart = { x, y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!gameRef.current.dragStart) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleMouseUp();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%', maxWidth: 400, borderRadius: 12,
          border: '2px solid #8B4513', cursor: 'crosshair',
          touchAction: 'none',
        }}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        Забей максимум из 10 попыток! +15 алт за мяч
      </div>
    </div>
  );
}

// ===== BOOK PREDICTION =====
function BookPredictionView({ prediction }: { prediction: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '10px 0' }}>
      <div style={{
        background: '#f5e6c8', border: '4px solid #8B4513', borderRadius: 4,
        padding: 4, boxShadow: '4px 4px 0 #654321, inset 0 0 20px rgba(139,69,19,.15)',
        position: 'relative', width: 280,
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 20,
          background: 'linear-gradient(90deg, #654321, #8B4513)', borderRight: '2px solid #5a3a1a',
          borderRadius: '4px 0 0 4px',
        }} />
        <div style={{
          marginLeft: 24, padding: '20px 16px', minHeight: 140,
          background: '#fffbf0', borderLeft: '1px solid #d4c4a0',
          fontFamily: 'serif',
        }}>
          <div style={{
            textAlign: 'center', fontSize: 10, color: '#8B4513', fontWeight: 700,
            marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase',
          }}>
            ✦ Предсказание дня ✦
          </div>
          <div style={{
            fontSize: 15, lineHeight: 1.5, color: '#4a3728', textAlign: 'center',
            fontStyle: 'italic',
          }}>
            «{prediction}»
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>
        📖 Шкаф в зоне отдыха
      </div>
    </div>
  );
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
