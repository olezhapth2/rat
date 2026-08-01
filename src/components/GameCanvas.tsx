'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { TILE, EMOJI_CHAT, ALL_ITEMS, ACHIEVEMENTS, DAILY_QUESTS, getRoomAt, ROOMS } from '../game/constants';
import type { GameObject } from '../game/constants';
import { createInputState, setupInputListeners, updatePlayer } from '../game/input';
import { createCamera, updateCamera, render } from '../game/renderer';
import { createInitialState, persistState, updateBots, logActivity, unlockAchievement, addCoins, addXP, rpsGame, microwaveGame, buyItem, updateBossCall, checkBossCallReward, updateBossCallTimer, trackQuestProgress, claimQuestReward, getQuestProgress, updateRoomIncome, getPlacedObjectsAsGameObjects, pickUpItem, dropItem, canPlaceItem, getItemEmoji, updatePet, updateDropPreview, takeBackFromKryska, checkOfficeEvents } from '../game/state';
import type { GameState, Activity } from '../game/state';
import { preloadCharacterSprites, preloadPetSprites, updateAnimState } from '../game/sprites';
import { preloadTileTextures } from '../game/tiles';
import {
  connectMultiplayer, disconnectMultiplayer, sendPosition,
  sendRpsInvite, acceptRpsInvite, declineRpsInvite, sendRpsChoice, cancelRps,
  sendItemPlace, sendItemRemove,
  onPlayers, onPlayerMove, onInviteReceived, onInviteSent, onGameStarted, onGameResult, onGameDeclined, onGameCancelled,
  onConnected, onDisconnected, onItems,
  updateWhiteboard, requestWhiteboardSync, onWhiteboardUpdate,
  sendEmoji as mpSendEmoji, onEmoji,
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
  const [secretClicks, setSecretClicks] = useState(0);
  const [secretToast, setSecretToast] = useState('');

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
        <div className="px-panel" style={{ padding: 0, width: 420 }}>
          {/* Title bar */}
          <div className="px-panel-header">
            <span>SECRET GANG v1.0</span>
            <span style={{ fontSize: 9, color: '#a09880' }}>FRI 09:45PM</span>
          </div>
          {/* Content */}
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                onClick={() => {
                  setSecretClicks(prev => {
                    if (prev + 1 >= 5) {
                      // Save coins via localStorage directly
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
                style={{ fontSize: 20, color: 'var(--px-title)', marginBottom: 8, letterSpacing: 2, cursor: 'pointer', userSelect: 'none' }}
              >
                SECRET GANG
              </div>
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', letterSpacing: 1 }}>
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
              <div style={{ color: 'var(--px-danger)', fontSize: 9, marginBottom: 14, textAlign: 'center', padding: '7px 10px', background: '#3a1020', border: '1px solid var(--px-danger)' }}>
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
            <button onClick={handleAuth} className="px-btn accent" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 12 }}>
              LOGIN
            </button>
            {secretToast && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#1a3a2a', border: '1px solid var(--px-accent)', color: 'var(--px-accent)', fontSize: 10, textAlign: 'center' }}>
                {secretToast}
              </div>
            )}
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
  const remoteEmojisRef = useRef<Record<string, { emoji: string; time: number }>>({});

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
    mpSendEmoji(emoji);
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

    onEmoji((data) => {
      remoteEmojisRef.current[data.playerId] = { emoji: data.emoji, time: Date.now() };
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
          items.push({ icon: '💬', text: 'Поговорить', fn: () => { addCoins(stateRef.current, 5); addXP(stateRef.current, 10); logActivity(stateRef.current, '🐀', 'Поговорил с Крыской'); unlockAchievement(stateRef.current, 'first_talk'); trackQuestProgress(stateRef.current, 'talk_3'); toast('+5 алт', 'ok'); } });
          if ((foundBot as any)._stolenItemId) {
            const stolenDef = ALL_ITEMS.find(i => i.id === (foundBot as any)._stolenItemId);
            items.push({ icon: '📦', text: `Отнять: ${stolenDef?.e || ''} ${stolenDef?.n || ''}`, fn: () => {
              const res = takeBackFromKryska(stateRef.current, 'kryska');
              toast(res.msg, res.ok ? 'ok' : 'info');
            }});
          }
        } else {
          items.push({ icon: '💬', text: `Поговорить с ${foundBot.name}`, fn: () => { logActivity(stateRef.current, '💬', `Поговорил с ${foundBot.name}`); unlockAchievement(stateRef.current, 'first_talk'); addCoins(stateRef.current, 5); addXP(stateRef.current, 10); trackQuestProgress(stateRef.current, 'talk_3'); openModal('talk', { bot: foundBot }); } });
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

      // Pet petting — check if right-click near pet
      if (s.player.petId && s.player.petX !== undefined && s.player.petY !== undefined) {
        const dxPet = worldX - s.player.petX;
        const dyPet = worldY - s.player.petY;
        if (Math.sqrt(dxPet * dxPet + dyPet * dyPet) < TILE * 2) {
          items.push({
            icon: '🐾',
            text: 'Погладить',
            fn: () => {
              s.player.petPetCount = (s.player.petPetCount || 0) + 1;
              persistState(s);
              if (s.player.petPetCount >= 10) {
                unlockAchievement(s, 'pet_lover');
                toast('🐾 Зоофил! Питомец счастлив!', 'ok');
              } else {
                toast(`🐾 Гладишь питомца... (${s.player.petPetCount}/10)`, 'info');
              }
            }
          });
        }
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
    el.style.left = Math.min(x, window.innerWidth - 250) + 'px';
    el.style.top = Math.min(y, window.innerHeight - items.length * 44 - 16) + 'px';
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
      checkOfficeEvents(s);

      // Track room visits
      const pgx = Math.floor(s.player.x / TILE);
      const pgy = Math.floor(s.player.y / TILE);
      const pRoom = getRoomAt(pgx, pgy);
      if (pRoom && !s.player.visitedRooms.includes(pRoom.id)) {
        s.player.visitedRooms.push(pRoom.id);
        if (s.player.visitedRooms.length >= 3) unlockAchievement(s, 'social');
        trackQuestProgress(s, 'visit_2');
        persistState(s);
      }

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
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            animation: 'pulse 1.5s infinite',
          }}
        >
          🚬 ПЕРЕКУР
        </button>
      )}
      {nearInteraction && nearInteraction.id === 'bookshelf' && (
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
          onClick={() => openModal('basketball')}
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
          onClick={() => openModal('microwave')}
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
      {nearInteraction && nearInteraction.id === 'furniture_toss' && (
        <button
          onClick={() => openModal('furniture_toss')}
          className="px-btn"
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 28px', fontSize: 13, zIndex: 50,
            background: '#8B4513', borderColor: '#654321', color: '#fff',
            animation: 'pulse 1.5s infinite',
          }}
        >
          🪑 СВАЛКА МЕБЕЛИ
        </button>
      )}

      {/* Smoking minigame overlay */}
      {smokingGame?.active && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,26,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div className="px-panel" style={{ width: 360, textAlign: 'center' }}>
            <div className="px-panel-header">
              <span>SMOKING BREAK</span>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🚬</div>
              <div style={{ fontSize: 13, color: 'var(--px-title)', marginBottom: 8 }}>TAP FAST!</div>
              <div style={{ width: '100%', height: 12, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', marginBottom: 14 }}>
                <div style={{
                  width: `${(smokingGame.taps / smokingGame.targetTaps) * 100}%`,
                  height: '100%', background: 'var(--px-accent)',
                  transition: 'width 0.1s',
                }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--px-text-dim)', marginBottom: 16 }}>
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
                    trackQuestProgress(stateRef.current, 'smoke_1');
                  } else {
                    setSmokingGame({ ...smokingGame, taps: newTaps });
                  }
                }}
                className="px-btn danger"
                style={{ width: 110, height: 110, fontSize: 38, padding: 0, justifyContent: 'center' }}
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
          <div className="px-panel" style={{ width: 360, textAlign: 'center' }}>
            <div className="px-panel-header">
              <span>LEADERBOARD</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>🏆</div>
              <div style={{ fontSize: 18, color: 'var(--px-title)', marginBottom: 3 }}>
                {(smokingResult.time / 1000).toFixed(1)}s
              </div>
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 16 }}>YOUR TIME</div>
              <div style={{ fontSize: 11, color: 'var(--px-text)', marginBottom: 10, textAlign: 'left' }}>
                🏅 TOP 3
              </div>
              {smokingResult.board.slice(0, 3).map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', marginBottom: 3,
                  background: i === 0 ? '#3a3020' : 'var(--px-bg)',
                  border: i === 0 ? '1px solid var(--px-title)' : '1px solid var(--px-border-dark)',
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
          padding: 8,
          zIndex: 100,
          minWidth: 230,
          border: '1px solid rgba(0,0,0,.06)',
        }}
      />

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

      {/* Room indicator */}
      {currentRoom && (
        <div className="px-panel" style={{
          position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 16px', fontSize: 9, color: 'var(--px-title)', zIndex: 10, pointerEvents: 'none',
        }}>
          &gt; {currentRoom.name}
        </div>
      )}

      {/* Boss Call Alert */}
      {state.bossCall.active && (
        <div className="px-panel" style={{
          position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', fontSize: 11, color: 'var(--px-title)', zIndex: 100, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 10, borderColor: 'var(--px-danger)',
        }}>
          <span>👔 BOSS CALL!</span>
          <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>
            {Math.ceil(state.bossCall.timer)}s +{state.bossCall.reward}
          </span>
        </div>
      )}

      {/* Office Event Banner */}
      {state.officeEvents?.activeEvent && (
        <div className="px-panel" style={{
          position: 'fixed', top: state.bossCall.active ? 70 : 40, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 16px', fontSize: 10, zIndex: 40, pointerEvents: 'none',
          borderColor: 'var(--px-title)',
          animation: 'pulse 2s infinite',
        }}>
          {state.officeEvents.activeEvent.icon} {state.officeEvents.activeEvent.name} — ×{state.officeEvents.activeEvent.bonusMultiplier} BONUS
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
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 240,
          }}
        >
          <div style={{
            width: 44, height: 44, border: '2px solid var(--px-border)',
            background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }} suppressHydrationWarning>{player.av}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ fontSize: 11, color: 'var(--px-title)' }}>{player.name}</div>
              <div style={{ fontSize: 9, color: 'var(--px-accent)', fontWeight: 'bold' }}>Lv.{player.level}</div>
            </div>
            <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>{player.role}</div>
            <div style={{ width: '100%', height: 4, background: 'var(--px-bg)', border: '1px solid var(--px-border-dark)', overflow: 'hidden' }}>
              <div style={{
                width: `${(player.xp / (player.level * 100)) * 100}%`,
                height: '100%',
                background: 'var(--px-accent)',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 7, color: 'var(--px-text-dim)', marginTop: 2 }}>{player.xp}/{player.level * 100} XP</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13 }}>🪙</span>
              <span style={{ fontSize: 11, color: 'var(--px-title)' }}>{player.coins}</span>
            </div>
            <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>
              {player.placedItems.length} items
            </div>
          </div>
        </div>

        {/* Emoji bar */}
        <div style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '8px 10px', pointerEvents: 'auto', display: 'flex', gap: 4, alignSelf: 'flex-end',
        }}>
          {EMOJI_CHAT.map((em) => (
            <div key={em} onClick={() => sendEmoji(em)} className="emoji-btn">{em}</div>
          ))}
        </div>

        {/* MP + coins */}
        <div style={{
          background: 'var(--px-panel)', border: '2px solid var(--px-border)',
          boxShadow: 'inset 1px 1px 0 var(--px-border-light), inset -1px -1px 0 var(--px-border-dark)',
          padding: '10px 14px', pointerEvents: 'auto', alignSelf: 'flex-end',
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, background: mpConnected ? 'var(--px-accent)' : 'var(--px-danger)' }} />
            <span style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>
              {mpConnected ? `${remotePlayers.length + 1} ONLINE` : 'OFFLINE'}
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--px-title)' }}>
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
          <div className="px-panel" style={{ width: 560, maxHeight: '80vh', overflow: 'hidden' }}>
            <div className="px-panel-header">
              <span>{getModalTitle(modalType)}</span>
              <button onClick={closeModal} className="px-btn small" style={{ padding: '4px 10px', fontSize: 14, lineHeight: 1 }}>
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
              {modalType === 'furniture_toss' && <FurnitureTossView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
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
          <div>
            <div style={{ fontSize: 11, color: 'var(--px-title)' }}>🎮 RPS FROM {rpsInvite.fromName}</div>
            <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginTop: 3 }}>ACCEPT?</div>
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

      {/* Confetti */}
      {confettiTrigger > 0 && <ConfettiEffect trigger={confettiTrigger} />}
    </>
  );
}

function getModalTitle(type: string): string {
  const t: Record<string, string> = {
    shop: 'SHOP',
    inventory: 'INVENTORY',
    decorate: 'DECORATE',
    profile: 'PROFILE',
    achievements: 'ACHIEVEMENTS',
    quests: 'QUESTS',
    talk: 'TALK',
    rps: 'ROCK-PAPER-SCISSORS',
    whiteboard: 'WHITEBOARD',
    smoke: 'SMOKING ROOM',
    microwave: 'KITCHEN — MICROWAVE',
    mp_rps: 'RPS VS PLAYER',
    book_prediction: '📖 BOOK OF FATE',
    basketball: '🏀 BASKETBALL',
    furniture_toss: 'СВАЛКА МЕБЕЛИ',
  };
  return t[type] || '';
}

// ===== SHOP =====
function ShopView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const [cat, setCat] = useState('desks');
  const [preview, setPreview] = useState<string | null>(null);
  const labels: Record<string, string> = { desks: 'DESKS', chairs: 'CHAIRS', sofas: 'SOFAS', lights: 'LIGHTS', small: 'SMALL', wall: 'WALL', pets: 'ПИТОМЦЫ' };

  return (
    <div>
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
          <div className="px-panel" style={{ padding: 12, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 100, height: 100, background: 'var(--px-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--px-border-dark)' }}>
              <img src={pItem.sprite} alt={pItem.n} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', imageRendering: 'pixelated' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--px-title)', marginBottom: 4 }}>{pItem.n}</div>
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
          const isPet = item.id.startsWith('pet');
          const count = isPet
            ? (state.player.petId === item.id ? 1 : 0)
            : state.player.furniture.filter(id => id === item.id).length + state.player.placedItems.filter(pi => pi.id === item.id).length;
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
              <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginTop: 2 }}>{item.p} {count > 0 && <span style={{ color: 'var(--px-accent)' }}>({isPet ? '✓' : count})</span>}</div>
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
          <div style={{ fontSize: 11, color: 'var(--px-title)', marginBottom: 8 }}>HOLDING: {ALL_ITEMS.find(i => i.id === state.player.carrying)?.n}</div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)' }}>GO TO DESTINATION → RIGHT-CLICK → PLACE</div>
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
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 10 }}>
        RIGHT-CLICK → TAKE OR PLACE
      </div>

      {state.player.carrying && (
        <div className="px-panel" style={{ padding: 10, marginBottom: 12, textAlign: 'center', borderColor: 'var(--px-title)' }}>
          <div style={{ fontSize: 11, color: 'var(--px-title)' }}>📦 HOLDING: {getItemEmoji(state.player.carrying)} {ALL_ITEMS.find(i => i.id === state.player.carrying)?.n}</div>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginTop: 4 }}>GO → RIGHT-CLICK → PLACE</div>
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 6 }}>PLACED ({placed.length})</div>
      {placed.length === 0 && (
        <div style={{ color: 'var(--px-text-dim)', fontSize: 11, textAlign: 'center', padding: 20 }}>NOTHING PLACED. BUY FROM SHOP!</div>
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
                gap: 4,
                fontSize: 10,
              }}
            >
              <span>{item?.e}</span>
              <span style={{ color: 'var(--px-text-dim)' }}>{item?.n}</span>
              <span style={{ color: 'var(--px-text-dim)', fontSize: 9 }}>{p.surface === 'wall' ? 'WALL' : 'FLOOR'}</span>
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
  const petItems = (SHOP as any).pets as any[];
  const ownedPets = petItems.filter((pet: any) => p.furniture.includes(pet.id) || p.petId === pet.id);
  const xpNeeded = p.level * 100;
  const xpPercent = (p.xp / xpNeeded) * 100;
  return (
    <div style={{ textAlign: 'center', padding: 10 }}>
      <div style={{ width: 56, height: 56, overflow: 'hidden', margin: '0 auto 8px', background: 'var(--px-bg)', border: '2px solid var(--px-border)' }}>
        <img src={`/sprites/pers/${p.charId}.png`} alt={p.charId} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 13, color: 'var(--px-title)' }}>{p.name}</div>
        <div style={{ fontSize: 11, color: 'var(--px-accent)', fontWeight: 'bold' }}>Lv.{p.level}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>{p.role}</div>
      
      {/* XP Bar */}
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
        <div style={{ fontSize: 9, color: 'var(--px-title)' }}>{p.xp} / {xpNeeded} XP</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, color: 'var(--px-accent)' }}>{p.coins}</div><div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>COINS</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, color: 'var(--px-accent)' }}>{p.furniture.length}</div><div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>ITEMS</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, color: 'var(--px-accent)' }}>{p.achievements.length}</div><div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>ACHIEV</div></div>
      </div>
      <input
        className="px-input"
        style={{ width: '100%', marginBottom: 6, fontSize: 10, textAlign: 'center' }}
        value={p.name}
        onChange={(e) => { p.name = e.target.value; persistState(state); }}
        placeholder="NAME"
      />
      <input
        className="px-input"
        style={{ width: '100%', fontSize: 10, textAlign: 'center' }}
        value={p.role}
        onChange={(e) => { p.role = e.target.value; persistState(state); }}
        placeholder="ROLE"
      />
      {/* Pet section */}
      {ownedPets.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 6 }}>ПИТОМЕЦ</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {ownedPets.map((pet: any) => (
              <div
                key={pet.id}
                onClick={() => { p.petId = pet.id; persistState(state); }}
                style={{
                  width: 48, height: 48,
                  background: p.petId === pet.id ? 'var(--px-accent)' : 'var(--px-bg)',
                  border: `2px solid ${p.petId === pet.id ? 'var(--px-accent)' : 'var(--px-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 24,
                }}
                title={pet.n}
              >
                {pet.e}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Office Customization */}
      <div style={{ marginTop: 16, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: 'var(--px-title)', marginBottom: 8 }}>ОФИС</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>ЦВЕТ СТЕН</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['#2a2a4a', '#1a3a2a', '#3a1a2a', '#2a2a1a', '#1a2a3a', '#3a2a3a'].map(c => (
              <div
                key={c}
                onClick={() => { p.wallColor = c; persistState(state); }}
                style={{
                  width: 28, height: 28, background: c, cursor: 'pointer',
                  border: `2px solid ${p.wallColor === c ? 'var(--px-title)' : 'var(--px-border-dark)'}`,
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>ИМЯ НА ДВЕРИ</div>
          <input
            className="px-input"
            style={{ width: '100%', fontSize: 8 }}
            value={p.doorName}
            onChange={(e) => { p.doorName = e.target.value; persistState(state); }}
            placeholder="ВАШЕ ИМЯ"
            maxLength={20}
          />
        </div>
      </div>
      <button
        onClick={() => { logout(); window.location.reload(); }}
        className="px-btn danger"
        style={{ marginTop: 14, fontSize: 10 }}
      >LOGOUT</button>
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
                borderColor: claimed ? 'var(--px-accent)' : done ? 'var(--px-title)' : undefined,
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
        <span style={{ color: 'var(--px-title)' }}>{bot?.name}:</span> <span style={{ color: 'var(--px-text)' }}>"{phrases[Math.floor(Math.random() * phrases.length)]}"</span>
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
      <div style={{ fontSize: 13, color: 'var(--px-title)', marginBottom: 6 }}>SMOKE IT!</div>
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
      <div style={{ fontSize: 13, color: 'var(--px-title)', marginBottom: 6 }}>HEAT LUNCH</div>
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginBottom: 12 }}>STOP AT 5.000 SECONDS</div>

      <div style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums', marginBottom: 16, color: status === 'running' ? 'var(--px-danger)' : 'var(--px-title)' }}>
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
        <div style={{ fontSize: 13, color: result.winner === 'you' ? 'var(--px-accent)' : result.winner === 'draw' ? 'var(--px-title)' : 'var(--px-danger)' }}>
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
          addXP(state, 10);
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
          width: '100%', maxWidth: 400,
          border: '2px solid var(--px-border)', cursor: 'crosshair',
          touchAction: 'none', imageRendering: 'pixelated',
        }}
      />
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginTop: 8 }}>
        DRAG FROM BALL TO AIM, RELEASE TO THROW! +15 COINS PER BASKET
      </div>
    </div>
  );
}

// ===== BOOK PREDICTION =====
function BookPredictionView({ prediction }: { prediction: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div className="px-panel" style={{ padding: 16, width: 280, textAlign: 'center' }}>
        <div style={{
          fontSize: 10, color: 'var(--px-title)', marginBottom: 12,
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

// ===== FURNITURE TOSS =====
function FurnitureTossView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(8);
  type FurnitureItem = { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; landed: boolean };
  const gameRef = useRef<{
    score: number; attempts: number;
    items: FurnitureItem[];
    targetZone: { x: number; y: number; w: number; h: number };
    dragging: { x: number; y: number } | null;
    currentItem: FurnitureItem | null;
  }>({
    score: 0, attempts: 8,
    items: [],
    targetZone: { x: 280, y: 280, w: 100, h: 60 },
    dragging: null,
    currentItem: null,
  });

  const COLORS = ['#8B4513', '#654321', '#A0522D', '#D2691E', '#CD853F'];

  function spawnItem(g: typeof gameRef.current) {
    const w = 30 + Math.random() * 30;
    const h = 20 + Math.random() * 20;
    g.currentItem = { x: 60, y: 300, vx: 0, vy: 0, w, h, color: COLORS[Math.floor(Math.random() * COLORS.length)], landed: false };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 400;
    canvas.height = 400;
    let running = true;

    const g = gameRef.current;
    spawnItem(g);

    function loop() {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, 400, 400);

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
          item.vy += 0.3;
          item.x += item.vx;
          item.y += item.vy;

          if (item.y > 380) {
            item.y = 380;
            item.vy = 0;
            item.vx = 0;
            item.landed = true;

            if (item.x > g.targetZone.x && item.x < g.targetZone.x + g.targetZone.w &&
                item.y - item.h / 2 < g.targetZone.y + g.targetZone.h) {
              g.score++;
              setScore(g.score);
              onToast('+1 В МЕШЕНЬ!', 'ok');
            }
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
    if (g.currentItem && !g.currentItem.landed) {
      const dx = x - g.currentItem.x;
      const dy = y - g.currentItem.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        g.dragging = { x, y };
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
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
    setAttempts(g.attempts);

    if (g.attempts <= 0) {
      setTimeout(() => {
        const coins = g.score * 10;
        addCoins(state, coins);
        onToast(g.score >= 5 ? `🏆 ОТЛИЧНО! ${g.score}/8 → +${coins} алт` : `${g.score}/8 → +${coins} алт`, g.score >= 5 ? 'ok' : 'info');
        if (g.score >= 5) onConfetti();
        g.score = 0;
        g.attempts = 8;
        g.items = [];
        setScore(0);
        setAttempts(8);
        spawnItem(g);
      }, 500);
    } else {
      setTimeout(() => spawnItem(g), 300);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{
          width: '100%', maxWidth: 400,
          border: '2px solid var(--px-border)', cursor: 'crosshair',
          touchAction: 'none', imageRendering: 'pixelated',
        }}
      />
      <div style={{ fontSize: 10, color: 'var(--px-text-dim)', marginTop: 8 }}>
        ЗАБРОСЬ МЕБЕЛЬ В ЗОНУ! +10 ЗА ПОПАДАНИЕ
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
