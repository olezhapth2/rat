import { canMove, type Player, type GameObject } from './constants';

const SPEED = 3;
const MOUSE_ACCEL = 0.08;
const DRIFT_DAMPING = 0.92;
const STOP_THRESHOLD = 0.05;

export interface InputState {
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
}

export function createInputState(): InputState {
  return { keys: {}, mouseX: 0, mouseY: 0 };
}

export function setupInputListeners(
  input: InputState,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  cameraRef: React.RefObject<{ x: number; y: number; zoom: number } | null>,
  onCursorMove: (wx: number, wy: number) => void
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

  const onMouseMove = (e: MouseEvent) => {
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
    // Only track cursor on canvas, not on UI overlays
    const target = e.target as HTMLElement;
    if (!target || target.tagName !== 'CANVAS') return;
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
    if (!canvas || !cam) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldX = sx / cam.zoom + cam.x;
    const worldY = sy / cam.zoom + cam.y;
    onCursorMove(worldX, worldY);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
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

  const hasWASD = wdx !== 0 || wdy !== 0;
  const ph = player.radius;

  if (hasWASD) {
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
    player.targetX = null;
    player.targetY = null;
    return { vx: wdx * SPEED, vy: wdy * SPEED };
  }

  if (player.targetX !== null && player.targetY !== null) {
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      player.vx += ((dx / dist) * SPEED - player.vx) * MOUSE_ACCEL;
      player.vy += ((dy / dist) * SPEED - player.vy) * MOUSE_ACCEL;
      const nx = player.x + player.vx * dt;
      const ny = player.y + player.vy * dt;
      if (canMove(map, objects, nx, player.y, ph)) player.x = nx;
      else player.vx *= -0.3;
      if (canMove(map, objects, player.x, ny, ph)) player.y = ny;
      else player.vy *= -0.3;
    } else {
      player.vx *= 0.85;
      player.vy *= 0.85;
      if (dist < 1) {
        player.targetX = null;
        player.targetY = null;
      }
    }
  }

  if (player.targetX === null) {
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
  }

  return { vx: player.vx, vy: player.vy };
}
