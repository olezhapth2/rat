'use client';

import { useCallback, useEffect, useState } from 'react';
import { createOkiyaGameMp, joinOkiyaGameMp, playOkiyaMoveMp, leaveOkiyaGame, startOkiyaGameMp,
  onOkiyaState, onOkiyaError,
} from '../game/multiplayer';

interface OkiyaCard {
  id: string;
  color: string;
  shape: string;
}
interface OkiyaCell {
  card: OkiyaCard | null;
  token: 'A' | 'B' | null;
}
interface OkiyaGame {
  id: string;
  players: { id: string; name: string; token: 'A' | 'B' }[];
  board: OkiyaCell[][];
  currentTurn: number;
  lastPicked: OkiyaCard | null;
  status: string;
  winner: string | null;
  winReason: string;
  moves: number;
  firstMove: boolean;
}

const COLOR_MAP: Record<string, string> = {
  red: '#c0392b', blue: '#2980b9', green: '#27ae60', yellow: '#f1c40f',
};
const SHAPE_MAP: Record<string, string> = {
  circle: '●', square: '■', triangle: '▲', diamond: '◆',
};

export default function OkiyaGame({ myId, onClose, onToast }: { myId: string; onClose: () => void; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const [game, setGame] = useState<OkiyaGame | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onOkiyaState((g) => {
      setGame(g);
      if (g.status === 'finished') {
        if (g.winner === myId) onToast('🏆 ПОБЕДА! ' + g.winReason, 'ok');
        else if (g.winner) onToast('Проиграл: ' + g.winReason, 'info');
        else onToast(g.winReason, 'info');
      }
    });
    onOkiyaError((e) => { setError(e); setTimeout(() => setError(null), 2000); });

    // Auto-join if join ID was set
    const joinId = (window as any).__okiyaJoinId;
    if (joinId) {
      delete (window as any).__okiyaJoinId;
      joinOkiyaGameMp(joinId);
    }
  }, [myId, onToast]);

  const handleCreate = useCallback(() => {
    createOkiyaGameMp();
  }, []);

  const handleJoin = useCallback(() => {
    if (game) joinOkiyaGameMp(game.id);
  }, [game]);

  const handlePlay = useCallback((r: number, c: number) => {
    if (game) playOkiyaMoveMp(game.id, r, c);
  }, [game]);

  const handleLeave = useCallback(() => {
    leaveOkiyaGame();
    setGame(null);
    onClose();
  }, [onClose]);

  const myToken = game?.players.find(p => p.id === myId)?.token;
  const myTurn = game?.status === 'playing' && game.players[game.currentTurn]?.id === myId;

  if (!game) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 14, color: 'var(--px-text)', marginBottom: 12 }}>ОКИЯ — Сад</div>
        <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 16, lineHeight: 1.6 }}>
          16 карточек (4 цвета × 4 формы) в поле 4×4.<br/>
          Берите карточку, совпадающую по цвету или форме.<br/>
          4 в ряд, квадрат 2×2 или блокировка = победа!
        </div>
        <button onClick={handleCreate} className="px-btn accent" style={{ marginRight: 8 }}>СОЗДАТЬ ИГРУ</button>
        <button onClick={onClose} className="px-btn">ОТМЕНА</button>
      </div>
    );
  }

  if (game.status === 'waiting') {
    const isCreator = game.players[0]?.id === myId;
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 14, color: 'var(--px-text)', marginBottom: 12 }}>ОЖИДАНИЕ ИГРОКА...</div>
        <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 16 }}>
          Игроков: {game.players.length}/2
        </div>
        {game.players.map(p => (
          <div key={p.id} style={{ fontSize: 9, color: 'var(--px-text)', marginBottom: 4 }}>
            {p.name} ({p.token})
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
          {isCreator && game.players.length >= 2 && (
            <button onClick={() => startOkiyaGameMp()} className="px-btn accent">▶ НАЧАТЬ</button>
          )}
          <button onClick={handleLeave} className="px-btn">ВЫЙТИ</button>
        </div>
      </div>
    );
  }

  // Playing or finished
  const CELL = 70;
  const PAD = 4;

  return (
    <div style={{ textAlign: 'center', padding: 10 }}>
      {error && <div style={{ fontSize: 10, color: 'var(--px-danger)', marginBottom: 8 }}>{error}</div>}

      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 10, fontSize: 10, color: 'var(--px-text)' }}>
        <span>Ход: {game.players[game.currentTurn]?.name || '?'}</span>
        <span>{myTurn ? 'ВАШ ХОД' : 'ЖДИТЕ'}</span>
        {game.lastPicked && (
          <span>Последняя: <span style={{ color: COLOR_MAP[game.lastPicked.color] }}>{SHAPE_MAP[game.lastPicked.shape]}</span></span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 10, fontSize: 8, color: 'var(--px-text-dim)' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#e74c3c', verticalAlign: 'middle', marginRight: 3 }} />A: {game.players[0]?.name}</span>
        {game.players[1] && <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#3498db', verticalAlign: 'middle', marginRight: 3 }} />B: {game.players[1]?.name}</span>}
      </div>

      {/* Board */}
      <div style={{ display: 'inline-block', background: '#1a1a2e', padding: PAD, border: '2px solid var(--px-border)' }}>
        {game.board.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.map((cell, c) => {
              const isLast = game.lastPicked && cell.card?.id === game.lastPicked.id;
              const isEmpty = cell.card && !cell.token;
              return (
                <div
                  key={c}
                  onClick={() => isEmpty && myTurn && game.status === 'playing' && handlePlay(r, c)}
                  style={{
                    width: CELL, height: CELL,
                    background: cell.card ? COLOR_MAP[cell.card.color] || '#333' : '#222',
                    border: `2px solid ${isLast ? '#fff' : isEmpty && myTurn ? '#f1c40f' : '#111'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    opacity: game.status === 'finished' ? 0.7 : 1,
                  }}
                >
                  {/* Shape symbol */}
                  {cell.card && (
                    <span style={{ fontSize: 28, color: '#fff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                      {SHAPE_MAP[cell.card.shape]}
                    </span>
                  )}

                  {/* Token */}
                  {cell.token && (
                    <div style={{
                      position: 'absolute', inset: 4,
                      borderRadius: '50%',
                      background: cell.token === 'A' ? '#e74c3c' : '#3498db',
                      border: '3px solid #fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 'bold', color: '#fff',
                    }}>
                      {cell.token}
                    </div>
                  )}

                  {/* Highlight for valid move */}
                  {isEmpty && myTurn && game.status === 'playing' && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      border: '2px dashed #f1c40f',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Winner banner */}
      {game.status === 'finished' && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--px-accent)', fontWeight: 'bold' }}>
          {game.winner ? `${game.players.find(p => p.id === game.winner)?.name} WIN! (${game.winReason})` : game.winReason}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <button onClick={handleLeave} className="px-btn">ВЫЙТИ</button>
      </div>
    </div>
  );
}
