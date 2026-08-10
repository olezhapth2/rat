'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createCardGame as mpCreateCardGame, joinCardGame as mpJoinCardGame,
  playCardGame as mpPlayCardGame, drawCardGame as mpDrawCardGame,
  leaveCardGame as mpLeaveCardGame, startCardGameMp,
  onCardGameState, onCardGameError,
} from '../game/multiplayer';

interface Card { id: string; color: string | null; value: string; }
interface Game {
  id: string;
  players: { id: string; name: string; hand: Card[]; connected: boolean }[];
  deck: Card[];
  discardPile: Card[];
  currentTurn: number;
  direction: number;
  currentColor: string;
  status: string;
  winner: string | null;
  lastAction: string;
}

const COLOR_HEX: Record<string, string> = {
  red: '#c0392b', blue: '#2980b9', green: '#27ae60', yellow: '#f1c40f',
};
const VALUE_DISPLAY: Record<string, string> = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  skip: '⊘', reverse: '⟲', plus2: '+2', wild: '★', wild_plus4: '+4',
};

function CardView({ card, small }: { card: Card; small?: boolean }) {
  const bg = card.color ? COLOR_HEX[card.color] : '#333';
  const w = small ? 36 : 50;
  const h = small ? 54 : 75;
  return (
    <div style={{
      width: w, height: h, background: bg, border: '2px solid #fff',
      borderRadius: 6, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: small ? 14 : 20, fontWeight: 'bold', color: '#fff' }}>
        {VALUE_DISPLAY[card.value] || '?'}
      </span>
      {!small && (
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
          {card.color || 'wild'}
        </span>
      )}
    </div>
  );
}

export default function UnoGame({ myId, onClose, onToast }: { myId: string; onClose: () => void; onToast: (m: string, t?: 'ok' | 'info') => void }) {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWild, setPendingWild] = useState<string | null>(null);

  useEffect(() => {
    onCardGameState((g) => {
      setGame(g);
      if (g.status === 'finished') {
        if (g.winner === myId) onToast('🏆 ПОБЕДА В UNO!', 'ok');
        else if (g.winner) onToast('Проиграл в UNO', 'info');
        else onToast(g.lastAction, 'info');
      }
    });
    onCardGameError((e) => { setError(e); setTimeout(() => setError(null), 2000); });
  }, [myId, onToast]);

  const handleCreate = useCallback(() => mpCreateCardGame(), []);
  const handleJoin = useCallback(() => { if (game) mpJoinCardGame(game.id); }, [game]);
  const handleDraw = useCallback(() => { if (game) mpDrawCardGame(); }, [game]);
  const handleLeave = useCallback(() => { mpLeaveCardGame(); setGame(null); onClose(); }, [onClose]);

  const handlePlayCard = useCallback((cardId: string) => {
    if (!game) return;
    const card = game.players.find(p => p.id === myId)?.hand.find(c => c.id === cardId);
    if (!card) return;
    if (card.color === null) {
      setPendingWild(cardId);
      setShowColorPicker(true);
      return;
    }
    mpPlayCardGame(cardId);
  }, [game, myId]);

  const handleColorPick = useCallback((color: string) => {
    if (pendingWild) mpPlayCardGame(pendingWild, color as any);
    setShowColorPicker(false);
    setPendingWild(null);
  }, [pendingWild]);

  const myHand = game?.players.find(p => p.id === myId)?.hand || [];
  const myTurn = game?.status === 'playing' && game.players[game.currentTurn]?.id === myId;
  const topCard = game?.discardPile[game.discardPile.length - 1];

  if (!game) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 14, color: 'var(--px-text)', marginBottom: 12 }}>UNO — Карточная игра</div>
        <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 16, lineHeight: 1.6 }}>
          Классический UNO на 2-4 игроков.<br/>
          С Совпадай по цвету или значению!<br/>
          Wild карты: выбирай цвет.
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
        <div style={{ fontSize: 14, color: 'var(--px-text)', marginBottom: 12 }}>ОЖИДАНИЕ ИГРОКОВ...</div>
        <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 12 }}>
          Игроков: {game.players.length}/4
        </div>
        {game.players.map(p => (
          <div key={p.id} style={{ fontSize: 9, color: 'var(--px-text)', marginBottom: 4 }}>
            {p.name}
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
          {isCreator && game.players.length >= 2 && (
            <button onClick={() => startCardGameMp()} className="px-btn accent">▶ НАЧАТЬ UNO</button>
          )}
          <button onClick={handleJoin} className="px-btn accent" style={{ marginRight: 8 }}>ПРИСОЕДИНИТЬСЯ</button>
          <button onClick={handleLeave} className="px-btn">ВЫЙТИ</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 10, minWidth: 400 }}>
      {error && <div style={{ fontSize: 10, color: 'var(--px-danger)', marginBottom: 8 }}>{error}</div>}

      {/* Color picker modal */}
      {showColorPicker && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div className="px-panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--px-text)', marginBottom: 10 }}>ВЫБЕРИ ЦВЕТ:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['red', 'blue', 'green', 'yellow'].map(c => (
                <div key={c} onClick={() => handleColorPick(c)} style={{
                  width: 40, height: 40, background: COLOR_HEX[c],
                  border: '3px solid #fff', borderRadius: 8,
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game info */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8, fontSize: 10, color: 'var(--px-text)' }}>
        <span>Ход: {game.players[game.currentTurn]?.name || '?'}</span>
        <span>{myTurn ? '▶ ВАШ ХОД' : '⏳ ЖДИТЕ'}</span>
        <span>Колода: {game.deck.length}</span>
      </div>

      {/* Current color */}
      <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>
        Активный цвет: <span style={{ color: COLOR_HEX[game.currentColor] || '#fff', fontWeight: 'bold' }}>{game.currentColor}</span>
        {' '}| Направление: {game.direction === 1 ? '→' : '←'}
      </div>

      {/* Discard pile + draw pile */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12, alignItems: 'center' }}>
        {/* Draw pile */}
        <div style={{
          width: 50, height: 75, background: '#2c3e50', border: '2px solid #fff',
          borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff',
          opacity: myTurn ? 1 : 0.5,
        }} onClick={() => myTurn && handleDraw()}>
          <span>DRAW<br/>{game.deck.length}</span>
        </div>

        {/* Discard pile */}
        <div>
          <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>STAPEL</div>
          {topCard && <CardView card={topCard} />}
        </div>

        {/* Opponent hands */}
        {game.players.filter(p => p.id !== myId).map(p => (
          <div key={p.id} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>{p.name} ({p.hand.length})</div>
            <div style={{ display: 'flex', gap: 2 }}>
              {p.hand.slice(0, 5).map((_, i) => (
                <div key={i} style={{
                  width: 24, height: 36, background: '#2c3e50', border: '1px solid #555',
                  borderRadius: 3,
                }} />
              ))}
              {p.hand.length > 5 && <span style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>+{p.hand.length - 5}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Last action */}
      <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>{game.lastAction}</div>

      {/* My hand */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', minHeight: 80 }}>
        {myHand.map(card => {
          const canPlay = game.currentColor === (card.color || game.currentColor) ||
            card.color === null ||
            card.value === topCard?.value;
          return (
            <div
              key={card.id}
              onClick={() => canPlay && myTurn && handlePlayCard(card.id)}
              style={{
                opacity: canPlay && myTurn ? 1 : 0.5,
                transform: canPlay && myTurn ? 'translateY(-4px)' : 'none',
                transition: 'transform 0.1s',
              }}
            >
              <CardView card={card} />
            </div>
          );
        })}
      </div>

      {/* Winner */}
      {game.status === 'finished' && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--px-accent)', fontWeight: 'bold' }}>
          {game.winner ? `${game.players.find(p => p.id === game.winner)?.name} WINS!` : game.lastAction}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <button onClick={handleLeave} className="px-btn">ВЫЙТИ</button>
      </div>
    </div>
  );
}
