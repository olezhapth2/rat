import { canMove, type Player, type GameObject } from './constants';

const SPEED = 3;
const DRIFT_DAMPING = 0.92;
const STOP_THRESHOLD = 0.05;

export interface InputState {
  keys: Record<string, boolean>;
}

export function createInputState(): InputState {
  return { keys: {} };
}

export function setupInputListeners(
  input: InputState,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    input.keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    input.keys[e.key.toLowerCase()] = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}

export function updatePlayer(
  player: Player,
  input: InputState,
  map: number[][],
  objects: GameObject[],
  dt: number
): { vx: number; vy: number } {
  let wdx = 0,
    wdy = 0;
  if (input.keys['w'] || input.keys['arrowup']) wdy = -1;
  if (input.keys['s'] || input.keys['arrowdown']) wdy = 1;
  if (input.keys['a'] || input.keys['arrowleft']) wdx = -1;
  if (input.keys['d'] || input.keys['arrowright']) wdx = 1;

  const ph = player.radius;

  if (wdx !== 0 || wdy !== 0) {
    const len = Math.sqrt(wdx * wdx + wdy * wdy);
    wdx /= len;
    wdy /= len;
    const spd = SPEED * dt;
    const nx = player.x + wdx * spd;
    const ny = player.y + wdy * spd;
    if (canMove(map, objects, nx, player.y, ph)) player.x = nx;
    if (canMove(map, objects, player.x, ny, ph)) player.y = ny;
    player.vx = 0;
    player.vy = 0;
    return { vx: wdx * SPEED, vy: wdy * SPEED };
  }

  player.vx *= DRIFT_DAMPING;
  player.vy *= DRIFT_DAMPING;
  if (Math.abs(player.vx) < STOP_THRESHOLD) player.vx = 0;
  if (Math.abs(player.vy) < STOP_THRESHOLD) player.vy = 0;
  if (player.vx !== 0 || player.vy !== 0) {
    const nx = player.x + player.vx * dt;
    const ny = player.y + player.vy * dt;
    if (canMove(map, objects, nx, player.y, ph)) player.x = nx;
    else player.vx = 0;
    if (canMove(map, objects, player.x, ny, ph)) player.y = ny;
    else player.vy = 0;
  }

  return { vx: player.vx, vy: player.vy };
}
