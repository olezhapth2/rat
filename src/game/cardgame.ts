export type CardColor = 'red' | 'blue' | 'green' | 'yellow';
export type CardValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'plus2' | 'wild' | 'wild_plus4';

export interface Card {
  id: string;
  color: CardColor | null;
  value: CardValue;
}

export interface CardGameState {
  id: string;
  players: { id: string; name: string; hand: Card[]; connected: boolean }[];
  deck: Card[];
  discardPile: Card[];
  currentTurn: number;
  direction: 1 | -1;
  currentColor: CardColor;
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  lastAction: string;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];

  for (const color of colors) {
    deck.push({ id: `${color}_0`, color, value: '0' });
    for (let i = 1; i <= 9; i++) {
      const v = String(i) as CardValue;
      deck.push({ id: `${color}_${i}_a`, color, value: v });
      deck.push({ id: `${color}_${i}_b`, color, value: v });
    }
    for (const special of ['skip', 'reverse', 'plus2'] as CardValue[]) {
      deck.push({ id: `${color}_${special}_a`, color, value: special });
      deck.push({ id: `${color}_${special}_b`, color, value: special });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild_${i}`, color: null, value: 'wild' });
    deck.push({ id: `wild_plus4_${i}`, color: null, value: 'wild_plus4' });
  }

  return shuffle(deck);
}

export function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createGame(playerId: string, playerName: string): CardGameState {
  const deck = createDeck();
  const players = [{ id: playerId, name: playerName, hand: [] as Card[], connected: true }];

  for (let i = 0; i < 7; i++) {
    players[0].hand.push(deck.pop()!);
  }

  let firstCard = deck.pop()!;
  while (firstCard.color === null) {
    deck.unshift(firstCard);
    firstCard = deck.pop()!;
  }

  return {
    id: `game_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    players,
    deck,
    discardPile: [firstCard],
    currentTurn: 0,
    direction: 1,
    currentColor: firstCard.color,
    status: 'waiting',
    winner: null,
    lastAction: `${playerName} started the game`,
  };
}

export function canPlayCard(card: Card, topCard: Card, currentColor: CardColor): boolean {
  if (card.color === null) return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function playCard(game: CardGameState, playerId: string, cardId: string, chosenColor?: CardColor): { ok: boolean; error?: string } {
  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return { ok: false, error: 'Not in game' };
  if (playerIdx !== game.currentTurn) return { ok: false, error: 'Not your turn' };

  const cardIdx = game.players[playerIdx].hand.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { ok: false, error: 'Card not in hand' };

  const card = game.players[playerIdx].hand[cardIdx];
  const topCard = game.discardPile[game.discardPile.length - 1];

  if (!canPlayCard(card, topCard, game.currentColor)) {
    return { ok: false, error: 'Cannot play this card' };
  }

  game.players[playerIdx].hand.splice(cardIdx, 1);
  game.discardPile.push(card);

  if (card.color === null) {
    game.currentColor = chosenColor || 'red';
  } else {
    game.currentColor = card.color;
  }

  if (card.value === 'reverse') {
    game.direction = game.direction === 1 ? -1 : 1;
    if (game.players.length === 2) {
      game.currentTurn = (game.currentTurn + game.direction + game.players.length) % game.players.length;
    }
  }

  if (card.value === 'skip') {
    game.currentTurn = (game.currentTurn + game.direction + game.players.length) % game.players.length;
  }

  if (card.value === 'plus2') {
    const nextPlayer = (game.currentTurn + game.direction + game.players.length) % game.players.length;
    for (let i = 0; i < 2; i++) {
      if (game.deck.length > 0) {
        game.players[nextPlayer].hand.push(game.deck.pop()!);
      } else {
        reshuffleDeck(game);
        if (game.deck.length > 0) {
          game.players[nextPlayer].hand.push(game.deck.pop()!);
        }
      }
    }
  }

  if (card.value === 'wild_plus4') {
    const nextPlayer = (game.currentTurn + game.direction + game.players.length) % game.players.length;
    for (let i = 0; i < 4; i++) {
      if (game.deck.length > 0) {
        game.players[nextPlayer].hand.push(game.deck.pop()!);
      } else {
        reshuffleDeck(game);
        if (game.deck.length > 0) {
          game.players[nextPlayer].hand.push(game.deck.pop()!);
        }
      }
    }
  }

  const playerName = game.players[playerIdx].name;
  if (game.players[playerIdx].hand.length === 0) {
    game.status = 'finished';
    game.winner = playerId;
    game.lastAction = `${playerName} wins!`;
    return { ok: true };
  }

  game.lastAction = `${playerName} played ${card.value}`;
  game.currentTurn = (game.currentTurn + game.direction + game.players.length) % game.players.length;

  return { ok: true };
}

export function drawCard(game: CardGameState, playerId: string): Card | null {
  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return null;
  if (playerIdx !== game.currentTurn) return null;

  if (game.deck.length === 0) {
    reshuffleDeck(game);
  }

  if (game.deck.length === 0) return null;

  const card = game.deck.pop()!;
  game.players[playerIdx].hand.push(card);

  game.currentTurn = (game.currentTurn + game.direction + game.players.length) % game.players.length;

  return card;
}

function reshuffleDeck(game: CardGameState): void {
  if (game.discardPile.length <= 1) return;
  const topCard = game.discardPile.pop()!;
  game.deck = shuffle(game.discardPile);
  game.discardPile = [topCard];
}

export function joinGame(game: CardGameState, playerId: string, playerName: string): boolean {
  if (game.players.length >= 4) return false;
  if (game.status !== 'waiting') return false;
  game.players.push({ id: playerId, name: playerName, hand: [], connected: true });

  for (let i = 0; i < 7; i++) {
    if (game.deck.length > 0) {
      game.players[game.players.length - 1].hand.push(game.deck.pop()!);
    }
  }

  if (game.players.length >= 2) {
    game.status = 'playing';
  }
  return true;
}

export function getCardDisplay(card: Card): { symbol: string; bgColor: string; textColor: string } {
  const colorMap: Record<string, string> = {
    red: '#c0392b',
    blue: '#2980b9',
    green: '#27ae60',
    yellow: '#f39c12',
  };

  const valueMap: Record<string, string> = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'skip': '⊘', 'reverse': '⟲', 'plus2': '+2',
    'wild': '★', 'wild_plus4': '+4',
  };

  return {
    symbol: valueMap[card.value] || '?',
    bgColor: card.color ? colorMap[card.color] : '#333',
    textColor: '#fff',
  };
}
