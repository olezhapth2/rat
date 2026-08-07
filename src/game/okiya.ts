// OKIYA — Garden card game for 2 players
// 16 cards (4 colors × 4 shapes) in a 4×4 grid
// Players pick cards matching by color or shape, place tokens
// Win: 4 in a row, 2×2 square, or block opponent

export type OkiyaColor = 'red' | 'blue' | 'green' | 'yellow';
export type OkiyaShape = 'circle' | 'square' | 'triangle' | 'diamond';

export interface OkiyaCard {
  id: string;
  color: OkiyaColor;
  shape: OkiyaShape;
}

export interface OkiyaCell {
  card: OkiyaCard | null;
  token: 'A' | 'B' | null;
}

export type OkiyaBoard = OkiyaCell[][]; // 4×4

export interface OkiyaGameState {
  id: string;
  players: { id: string; name: string; token: 'A' | 'B' }[];
  board: OkiyaBoard;
  currentTurn: number; // index into players
  lastPicked: OkiyaCard | null; // last card picked (for matching)
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  winReason: string;
  moves: number;
  firstMove: boolean;
}

const COLORS: OkiyaColor[] = ['red', 'blue', 'green', 'yellow'];
const SHAPES: OkiyaShape[] = ['circle', 'square', 'triangle', 'diamond'];

export function createOkiyaDeck(): OkiyaCard[] {
  const deck: OkiyaCard[] = [];
  for (const color of COLORS) {
    for (const shape of SHAPES) {
      deck.push({ id: `${color}_${shape}`, color, shape });
    }
  }
  return shuffle(deck);
}

function shuffle(arr: OkiyaCard[]): OkiyaCard[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createOkiyaGame(playerAId: string, playerAName: string): OkiyaGameState {
  const deck = createOkiyaDeck();
  const board: OkiyaBoard = [];
  for (let r = 0; r < 4; r++) {
    const row: OkiyaCell[] = [];
    for (let c = 0; c < 4; c++) {
      row.push({ card: deck[r * 4 + c], token: null });
    }
    board.push(row);
  }

  return {
    id: `okiya_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    players: [
      { id: playerAId, name: playerAName, token: 'A' },
    ],
    board,
    currentTurn: 0,
    lastPicked: null,
    status: 'waiting',
    winner: null,
    winReason: '',
    moves: 0,
    firstMove: true,
  };
}

export function joinOkiyaGame(game: OkiyaGameState, playerId: string, playerName: string): boolean {
  if (game.players.length >= 2) return false;
  if (game.status !== 'waiting') return false;
  game.players.push({ id: playerId, name: playerName, token: 'B' });
  game.status = 'playing';
  return true;
}

// Check if a cell is on the edge of the 4×4 board
function isEdge(r: number, c: number): boolean {
  return r === 0 || r === 3 || c === 0 || c === 3;
}

// Check if a cell is empty (card present, no token)
function isEmpty(cell: OkiyaCell): boolean {
  return cell.card !== null && cell.token === null;
}

// Check if card matches lastPicked by color OR shape
function matchesLast(card: OkiyaCard, lastPicked: OkiyaCard | null): boolean {
  if (!lastPicked) return true; // first move: any edge card
  return card.color === lastPicked.color || card.shape === lastPicked.shape;
}

// Get valid moves for current state
export function getValidMoves(game: OkiyaGameState): { r: number; c: number }[] {
  const moves: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = game.board[r][c];
      if (!isEmpty(cell)) continue;
      if (!cell.card) continue;
      if (game.firstMove && !isEdge(r, c)) continue;
      if (!matchesLast(cell.card, game.lastPicked)) continue;
      moves.push({ r, c });
    }
  }
  return moves;
}

// Check win conditions for a player token on the board
function checkWin(board: OkiyaBoard, token: 'A' | 'B'): string | null {
  // Check 4 in a row (horizontal, vertical, diagonal)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c].token !== token) continue;
      // Horizontal
      if (c + 3 < 4 && board[r][c + 1].token === token && board[r][c + 2].token === token && board[r][c + 3].token === token) {
        return '4 in a row (horizontal)';
      }
      // Vertical
      if (r + 3 < 4 && board[r + 1][c].token === token && board[r + 2][c].token === token && board[r + 3][c].token === token) {
        return '4 in a row (vertical)';
      }
      // Diagonal down-right
      if (r + 3 < 4 && c + 3 < 4 && board[r + 1][c + 1].token === token && board[r + 2][c + 2].token === token && board[r + 3][c + 3].token === token) {
        return '4 in a row (diagonal)';
      }
      // Diagonal down-left
      if (r + 3 < 4 && c - 3 >= 0 && board[r + 1][c - 1].token === token && board[r + 2][c - 2].token === token && board[r + 3][c - 3].token === token) {
        return '4 in a row (diagonal)';
      }
    }
  }

  // Check 2×2 square
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c].token === token && board[r][c + 1].token === token &&
          board[r + 1][c].token === token && board[r + 1][c + 1].token === token) {
        return '2×2 square';
      }
    }
  }

  return null;
}

// Check if opponent is blocked (no valid moves)
function isBlocked(board: OkiyaBoard, lastPicked: OkiyaCard | null, firstMove: boolean): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = board[r][c];
      if (!isEmpty(cell) || !cell.card) continue;
      if (firstMove && !isEdge(r, c)) continue;
      if (matchesLast(cell.card, lastPicked)) return false;
    }
  }
  return true;
}

export function playOkiyaMove(
  game: OkiyaGameState,
  playerId: string,
  r: number,
  c: number
): { ok: boolean; error?: string } {
  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return { ok: false, error: 'Not in game' };
  if (playerIdx !== game.currentTurn) return { ok: false, error: 'Not your turn' };
  if (game.status !== 'playing') return { ok: false, error: 'Game not active' };
  if (r < 0 || r > 3 || c < 0 || c > 3) return { ok: false, error: 'Out of bounds' };

  const cell = game.board[r][c];
  if (!cell.card) return { ok: false, error: 'No card here' };
  if (cell.token) return { ok: false, error: 'Cell occupied' };

  // Check edge rule for first move
  if (game.firstMove && !isEdge(r, c)) {
    return { ok: false, error: 'First move must be on edge' };
  }

  // Check matching rule
  if (!matchesLast(cell.card, game.lastPicked)) {
    return { ok: false, error: 'Card must match color or shape' };
  }

  // Place token
  const playerToken = game.players[playerIdx].token;
  cell.token = playerToken;
  game.lastPicked = cell.card;
  game.moves++;
  game.firstMove = false;

  // Check win
  const winReason = checkWin(game.board, playerToken);
  if (winReason) {
    game.status = 'finished';
    game.winner = playerId;
    game.winReason = winReason;
    return { ok: true };
  }

  // Check if board is full (draw)
  let full = true;
  for (let rr = 0; rr < 4; rr++) {
    for (let cc = 0; cc < 4; cc++) {
      if (isEmpty(game.board[rr][cc])) { full = false; break; }
    }
    if (!full) break;
  }
  if (full) {
    game.status = 'finished';
    game.winner = null;
    game.winReason = 'Draw — board full';
    return { ok: true };
  }

  // Switch turn
  game.currentTurn = (game.currentTurn + 1) % game.players.length;

  // Check if next player is blocked
  if (isBlocked(game.board, game.lastPicked, game.firstMove)) {
    game.status = 'finished';
    // The OTHER player wins (the one who just moved)
    game.winner = playerId;
    game.winReason = 'Opponent blocked — no valid moves';
    return { ok: true };
  }

  return { ok: true };
}

export function getOkiyaCardColor(card: OkiyaCard): string {
  const map: Record<OkiyaColor, string> = {
    red: '#c0392b', blue: '#2980b9', green: '#27ae60', yellow: '#f1c40f',
  };
  return map[card.color];
}

export function getOkiyaShapeSymbol(shape: OkiyaShape): string {
  const map: Record<OkiyaShape, string> = {
    circle: '●', square: '■', triangle: '▲', diamond: '◆',
  };
  return map[shape];
}
