'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { TILE, EMOJI_CHAT, ALL_ITEMS, ACHIEVEMENTS, getRoomAt, ROOMS } from '../game/constants';
import type { GameObject } from '../game/constants';
import { createInputState, setupInputListeners, updatePlayer } from '../game/input';
import { createCamera, updateCamera, render } from '../game/renderer';
import { createInitialState, persistState, updateBots, logActivity, unlockAchievement, addCoins, rpsGame, buyItem } from '../game/state';
import type { GameState, Activity } from '../game/state';

interface CtxItem {
  icon: string;
  text: string;
  fn: () => void;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(createCamera());
  const inputRef = useRef(createInputState());
  const frameRef = useRef(0);
  const stateRef = useRef<GameState>(createInitialState());
  const [, setTick] = useState(0);
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Record<string, unknown>>({});
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'info'>('info');
  const [confettiTrigger, setConfettiTrigger] = useState(0);

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
  }, []);

  // Input listeners
  useEffect(() => {
    const cleanup = setupInputListeners(inputRef.current, canvasRef, cameraRef, (wx: number, wy: number) => {
      stateRef.current.player.targetX = wx;
      stateRef.current.player.targetY = wy;
    });
    return cleanup;
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

      const items: CtxItem[] = [];

      if (foundBot) {
        if (foundBot.id === 'kryska') {
          items.push({ icon: '💬', text: 'Поговорить', fn: () => { addCoins(stateRef.current, 5); logActivity(stateRef.current, '🐀', 'Поговорил с Крыской'); unlockAchievement(stateRef.current, 'first_talk'); toast('+5 алт', 'ok'); } });
        } else {
          items.push({ icon: '💬', text: `Поговорить с ${foundBot.name}`, fn: () => { logActivity(stateRef.current, '💬', `Поговорил с ${foundBot.name}`); unlockAchievement(stateRef.current, 'first_talk'); addCoins(stateRef.current, 5); openModal('talk', { bot: foundBot }); } });
          items.push({ icon: '✊', text: 'КНБ', fn: () => openModal('rps', { bot: foundBot }) });
          items.push({ icon: '🚶', text: 'Кабинет', fn: () => { logActivity(stateRef.current, '🚶', `Посетил кабинет ${foundBot.name}`); toast(`Ты у ${foundBot.name}`, 'ok'); } });
        }
      }

      if (foundObj) {
        items.push({ icon: '🪑', text: foundObj.label || foundObj.id, fn: () => {} });
      }

      items.push({ icon: '👤', text: 'Профиль', fn: () => openModal('profile') });
      items.push({ icon: '🏆', text: 'Ачивки', fn: () => openModal('achievements') });
      items.push({ icon: '🎨', text: 'Оформить кабинет', fn: () => openModal('decorate') });
      items.push({ icon: '🛒', text: 'Магазин', fn: () => openModal('shop') });
      items.push({ icon: '📋', text: 'Инвентарь', fn: () => openModal('inventory') });
      items.push({ icon: '📐', text: 'Whiteboard', fn: () => openModal('whiteboard') });

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

      updatePlayer(s.player, input, s.map, s.objects, dt);
      updateBots(s, dt);
      updateCamera(cam, s.player, canvas.width, canvas.height);

      const placedObjects = getPlacedObjects(s);
      render(ctx, canvas, cam, s.map, [...s.objects, ...placedObjects], s.player, s.bots, frameRef.current, []);

      if (frameRef.current % 30 === 0) setTick((n) => n + 1);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    return () => { running = false; };
  }, []);

  function getPlacedObjects(s: GameState): GameObject[] {
    const items: GameObject[] = [];
    const myOffice = ROOMS.find(r => r.id === 'myoffice');
    if (!myOffice) return items;
    for (const pi of s.player.placedItems) {
      const def = ALL_ITEMS.find((i) => i.id === pi.id);
      if (!def) continue;
      items.push({
        id: `placed_${pi.id}_${pi.gx}_${pi.gy}`,
        type: 'furniture',
        x: (myOffice.fx + pi.gx) * TILE,
        y: (myOffice.fy + pi.gy) * TILE,
        w: def.w,
        h: def.h,
        solid: true,
        color: '#ffffff',
        label: def.n,
        room: 'myoffice',
      });
    }
    return items;
  }

  // Detect current room
  const gx = Math.floor(player.x / TILE);
  const gy = Math.floor(player.y / TILE);
  const currentRoom = state.map[gy]?.[gx] === 2 ? getRoomAt(gx, gy) : null;

  return (
    <>
      <canvas ref={canvasRef} />

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
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10, pointerEvents: 'none' }}>
        {player.activities.slice(0, 3).map((a: Activity, i: number) => (
          <div
            key={i}
            style={{
              background: '#ffffffdd',
              borderRadius: 10,
              padding: '6px 12px',
              marginBottom: 4,
              fontSize: 11,
              color: '#555',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(4px)',
            }}
          >
            <span>{a.icon}</span>
            <span>{a.text}</span>
            <span style={{ color: '#bbb', fontSize: 9, marginLeft: 'auto' }}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* Room indicator */}
      {currentRoom && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffffcc',
            borderRadius: 10,
            padding: '6px 16px',
            fontSize: 11,
            fontWeight: 600,
            color: '#555',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          📍 {currentRoom.name}
        </div>
      )}

      {/* Bottom HUD — full width */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          padding: '0 12px 12px',
          pointerEvents: 'none',
          zIndex: 10,
          gap: 8,
        }}
      >
        {/* HUG Avatar Card — full width */}
        <div
          className="hud-card"
          onClick={() => openModal('profile')}
          style={{
            pointerEvents: 'auto',
            cursor: 'pointer',
            flex: 1,
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,.25)',
          }}
        >
            <img
              src="/secret-gang/hud.png"
              alt="HUD"
              style={{ width: '100%', display: 'block', objectFit: 'fill' }}
            />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 30 }} suppressHydrationWarning>{player.av}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{player.name}</div>
              <div style={{ fontSize: 10, color: '#ddd', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>{player.role}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ecca3', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{player.coins}</div>
                <div style={{ fontSize: 8, color: '#ccc', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>алт</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{player.placedItems.length}</div>
                <div style={{ fontSize: 8, color: '#ccc', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>в кабинете</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{player.achievements.length}</div>
                <div style={{ fontSize: 8, color: '#ccc', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>ачивок</div>
              </div>
            </div>
          </div>
        </div>

        {/* Emoji bar */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '10px 14px',
            boxShadow: '0 2px 16px rgba(0,0,0,.1)',
            pointerEvents: 'auto',
            display: 'flex',
            gap: 4,
            alignSelf: 'flex-end',
          }}
        >
          {EMOJI_CHAT.map((em) => (
            <div
              key={em}
              onClick={() => sendEmoji(em)}
              className="emoji-btn"
            >
              {em}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: 500, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>{getModalTitle(modalType)}</h3>
              <button onClick={closeModal} className="modal-btn" style={{ width: 28, height: 28, padding: 0, fontSize: 16, color: '#999' }}>
                &times;
              </button>
            </div>
            <div style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              {modalType === 'shop' && <ShopView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'inventory' && <InventoryView state={stateRef.current} onToast={toast} />}
              {modalType === 'decorate' && <DecorateView state={stateRef.current} onToast={toast} />}
              {modalType === 'profile' && <ProfileView state={stateRef.current} />}
              {modalType === 'achievements' && <AchievementsView state={stateRef.current} />}
              {modalType === 'talk' && <TalkView data={modalData} state={stateRef.current} onToast={toast} />}
              {modalType === 'rps' && <RpsView data={modalData} state={stateRef.current} onToast={toast} onConfetti={confetti} />}
              {modalType === 'whiteboard' && <WhiteboardView />}
              {modalType === 'smoke' && <SmokeView state={stateRef.current} onToast={toast} onConfetti={confetti} />}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            background: toastType === 'ok' ? '#4ecca3' : '#333',
            color: '#fff',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        >
          {toastMsg}
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
    talk: 'Разговор',
    rps: 'Камень-Ножницы-Бумага',
    whiteboard: 'Whiteboard',
    smoke: 'Курилка',
  };
  return t[type] || '';
}

// ===== SHOP =====
function ShopView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const [cat, setCat] = useState('desks');
  const labels: Record<string, string> = { desks: 'Столы', chairs: 'Стулья', plants: 'Растения', hats: 'Шляпы', decor: 'Декор' };

  return (
    <div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>Сезон 1 · Фиксированные цены</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {Object.keys(SHOP).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="modal-btn"
            style={{
              background: cat === c ? '#333' : undefined,
              color: cat === c ? '#fff' : undefined,
              borderColor: cat === c ? '#333' : undefined,
            }}
          >
            {labels[c]}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {(SHOP as any)[cat]?.map((item: any) => {
          const own = state.player.furniture.includes(item.id);
          const inRoom = state.player.placedItems.some((p) => p.id === item.id);
          return (
            <div
              key={item.id}
              onClick={() => {
                if (own) return;
                const res = buyItem(state, item.id);
                if (res.ok) { onToast(res.msg, 'ok'); onConfetti(); }
                else onToast(res.msg, 'info');
              }}
              style={{
                background: '#f8f8f8',
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
                cursor: own ? 'default' : 'pointer',
                border: '2px solid transparent',
                opacity: own ? 0.4 : 1,
                transition: '0.15s',
              }}
            >
              <div style={{ fontSize: 24 }}>{item.e}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{item.n}</div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{own ? 'Есть' : item.p + ' алт'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== INVENTORY =====
function InventoryView({ state, onToast }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const [tab, setTab] = useState<'all' | 'room'>('all');
  const placed = state.player.placedItems;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setTab('all')} className="modal-btn" style={{ background: tab === 'all' ? '#333' : undefined, color: tab === 'all' ? '#fff' : undefined, borderColor: tab === 'all' ? '#333' : undefined }}>
          Инвентарь ({state.player.furniture.length})
        </button>
        <button onClick={() => setTab('room')} className="modal-btn" style={{ background: tab === 'room' ? '#333' : undefined, color: tab === 'room' ? '#fff' : undefined, borderColor: tab === 'room' ? '#333' : undefined }}>
          В кабинете ({placed.length})
        </button>
      </div>

      {tab === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {state.player.furniture.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#bbb', padding: 30, fontSize: 12 }}>Пусто. Сходи в магазин!</div>
          )}
          {state.player.furniture.map((id, idx) => {
            const item = ALL_ITEMS.find((x) => x.id === id);
            const inRoom = placed.some((p) => p.id === id);
            return (
              <div
                key={`${id}_${idx}`}
                style={{
                  aspectRatio: 1,
                  background: inRoom ? '#e8f5e9' : '#f8f8f8',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${inRoom ? '#4ecca3' : 'transparent'}`,
                  opacity: inRoom ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: 22 }}>{item?.e}</div>
                <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{inRoom ? 'В кабинете' : item?.n}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'room' && (
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Предметы в кабинете. Убери через «Оформить кабинет»</div>
          {placed.length === 0 && (
            <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: 20 }}>Пусто. Открой «Оформить кабинет»</div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {placed.map((p, i) => {
              const item = ALL_ITEMS.find((x) => x.id === p.id);
              return (
                <div
                  key={`${p.id}_${i}`}
                  style={{
                    padding: '6px 10px',
                    background: '#e8f5e9',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                  }}
                >
                  <span>{item?.e}</span>
                  <span style={{ color: '#999' }}>{item?.n}</span>
                  <span style={{ color: '#bbb', fontSize: 9 }}>({p.gx},{p.gy})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== DECORATE (grid-based placement) =====
const OFFICE_GX = 18;
const OFFICE_GY = 36;
const GRID_COLS = 10;
const GRID_ROWS = 6;

function DecorateView({ state, onToast }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const [selItem, setSelItem] = useState<string | null>(null);
  const available = state.player.furniture.filter(
    (id) => !state.player.placedItems.find((p) => p.id === id)
  );

  const placed = state.player.placedItems;

  function handleCellClick(gx: number, gy: number) {
    const existing = placed.find((p) => p.gx === gx && p.gy === gy);

    if (existing) {
      // Remove item from this cell
      state.player.placedItems = placed.filter((p) => !(p.gx === gx && p.gy === gy));
      const def = ALL_ITEMS.find((i) => i.id === existing.id);
      persistState(state);
      onToast(`${def?.e || ''} убрано`, 'info');
      return;
    }

    if (selItem) {
      const def = ALL_ITEMS.find((i) => i.id === selItem);
      if (!def) return;

      // Check bounds
      if (gx + def.w > GRID_COLS || gy + def.h > GRID_ROWS) {
        onToast('Не влезает!', 'info');
        return;
      }

      // Check overlap
      const overlap = placed.some((p) => {
        const pd = ALL_ITEMS.find((i) => i.id === p.id);
        if (!pd) return false;
        return (
          gx < p.gx + pd.w &&
          gx + def.w > p.gx &&
          gy < p.gy + pd.h &&
          gy + def.h > p.gy
        );
      });

      if (overlap) {
        onToast('Уже занято!', 'info');
        return;
      }

      state.player.placedItems.push({ id: selItem, gx, gy });
      setSelItem(null);
      persistState(state);
      onToast(`${def.e} поставлено!`, 'ok');
    }
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>Выбери предмет снизу, потом клетку в кабинете</div>

      {/* Grid preview */}
      <div
        style={{
          background: '#f0ede6',
          borderRadius: 12,
          padding: 8,
          marginBottom: 14,
          border: '2px solid #e8e8e8',
        }}
      >
        <div style={{ fontSize: 9, color: '#999', marginBottom: 6, textAlign: 'center' }}>Мой кабинет ({GRID_COLS}x{GRID_ROWS})</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gap: 2,
          }}
        >
          {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, idx) => {
            const gx = idx % GRID_COLS;
            const gy = Math.floor(idx / GRID_COLS);
            const itemOnCell = placed.find((p) => p.gx === gx && p.gy === gy);
            const itemDef = itemOnCell ? ALL_ITEMS.find((i) => i.id === itemOnCell.id) : null;

            // Check if this cell is part of a multi-tile item's body (not top-left)
            const isPartOfLarger = placed.some((p) => {
              if (p.gx === gx && p.gy === gy) return false;
              const pd = ALL_ITEMS.find((i) => i.id === p.id);
              if (!pd) return false;
              return gx >= p.gx && gx < p.gx + pd.w && gy >= p.gy && gy < p.gy + pd.h;
            });

            if (isPartOfLarger) return <div key={idx} />;

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(gx, gy)}
                style={{
                  aspectRatio: 1,
                  borderRadius: 6,
                  background: itemDef
                    ? '#e8f5e9'
                    : selItem
                    ? '#fff9c4'
                    : '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: itemDef
                    ? '2px solid #4ecca360'
                    : selItem
                    ? '2px dashed #ffa726'
                    : '1px solid #e8e8e8',
                  transition: '0.1s',
                  minWidth: 0,
                }}
              >
                {itemDef ? (
                  <>
                    <div style={{ fontSize: 16 }}>{itemDef.e}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 10, color: selItem ? '#ffa726' : '#ddd' }}>
                    {selItem ? '+' : '·'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available items */}
      <div style={{ fontSize: 10, color: '#999', marginBottom: 6 }}>
        Доступные ({available.length}){selItem ? ' — нажми на клетку above' : ''}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {available.length === 0 && (
          <div style={{ color: '#bbb', fontSize: 11 }}>Нет свободных. Купи в магазине!</div>
        )}
        {available.map((id) => {
          const item = ALL_ITEMS.find((x) => x.id === id);
          return (
            <div
              key={id}
              onClick={() => setSelItem(selItem === id ? null : id)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                background: selItem === id ? '#fff9c4' : '#f8f8f8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: `2px solid ${selItem === id ? '#ffa726' : 'transparent'}`,
                transition: '0.1s',
              }}
            >
              <div style={{ fontSize: 20 }}>{item?.e}</div>
              <div style={{ fontSize: 7, color: '#999' }}>{item?.w}x{item?.h}</div>
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
      <div style={{ fontSize: 48, marginBottom: 8 }} suppressHydrationWarning>{p.av}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>{p.role}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700 }}>{p.coins}</div><div style={{ fontSize: 9, color: '#999' }}>алт</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700 }}>{p.furniture.length}</div><div style={{ fontSize: 9, color: '#999' }}>предметов</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 700 }}>{p.achievements.length}</div><div style={{ fontSize: 9, color: '#999' }}>ачивок</div></div>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>Аватар</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
        {AVATARS.map((a) => (
          <div
            key={a}
            onClick={() => { p.av = a; persistState(state); }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              background: a === p.av ? '#e8f5e9' : '#f5f5f5',
              border: `2px solid ${a === p.av ? '#4ecca3' : 'transparent'}`,
            }}
          >
            {a}
          </div>
        ))}
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

// ===== SMOKE =====
function SmokeView({ state, onToast, onConfetti }: { state: GameState; onToast: (m: string, t?: 'ok' | 'info') => void; onConfetti: () => void }) {
  const [time, setTime] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          unlockAchievement(state, 'smoker');
          logActivity(state, '🚬', 'Прокурил в курилке');
          onToast('+25 алт Выкурил!', 'ok');
          onConfetti();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>🚬</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Прокури за 30 секунд!</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Не отходи от курилки</div>
      <div style={{ width: '100%', height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #e94560, #ffa726)', borderRadius: 4, transition: 'width 0.1s', width: `${(time / 30) * 100}%` }} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: time > 0 ? '#e94560' : '#4ecca3' }}>{time || 'Готово!'}</div>
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
