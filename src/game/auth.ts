export interface UserData {
  name: string;
  charId: string;
  color: string;
  role: string;
  avatar: string;
  login: string;
  photoTaken?: boolean;
}

const SESSION_KEY = 'auth_session';
let pendingLogin: ((data: { ok: boolean; msg?: string; user?: UserData }) => void) | null = null;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function initAuth(): void {
  // Dynamic import to avoid circular deps
  import('./multiplayer').then(mp => {
    mp.connectAuth(); // Connect socket for auth events
    mp.onAuthResult((data) => {
      if (data.ok && data.user) {
        data.user.name = capitalize(data.user.name);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data.user, ts: Date.now() }));
      }
      pendingLogin?.(data);
      pendingLogin = null;
    });
    mp.onAuthUserSync((data) => {
      // Update local session when admin changes user data
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (data.name !== undefined) session.name = capitalize(data.name);
        if (data.charId !== undefined) session.charId = data.charId;
        if (data.color !== undefined) session.color = data.color;
        if (data.role !== undefined) session.role = data.role;
        if (data.avatar !== undefined) session.avatar = data.avatar;
        if (data.photoTaken !== undefined) session.photoTaken = data.photoTaken;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    });
  });
}

export function login(name: string, password: string): { ok: boolean; msg: string } {
  // Offline fallback — try local session
  // Real auth goes through multiplayer
  return { ok: false, msg: 'Подключение к серверу...' };
}

export function loginAsync(name: string, password: string): Promise<{ ok: boolean; msg?: string; user?: UserData }> {
  return new Promise((resolve) => {
    pendingLogin = resolve;
    import('./multiplayer').then(mp => mp.authLogin(name, password));
    // Timeout
    setTimeout(() => {
      if (pendingLogin === resolve) {
        pendingLogin = null;
        resolve({ ok: false, msg: 'Сервер недоступен' });
      }
    }, 5000);
  });
}

export function registerAsync(data: { login: string; password: string; name: string; charId: string; color: string; role: string; avatar: string }): Promise<{ ok: boolean; msg?: string; user?: UserData }> {
  return new Promise((resolve) => {
    pendingLogin = resolve;
    import('./multiplayer').then(mp => mp.authRegister(data));
    setTimeout(() => {
      if (pendingLogin === resolve) {
        pendingLogin = null;
        resolve({ ok: false, msg: 'Сервер недоступен' });
      }
    }, 5000);
  });
}

export function getCurrentUser(): UserData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.name) return null;
    return {
      name: capitalize(session.name),
      charId: session.charId,
      color: session.color,
      role: capitalize(session.role),
      avatar: session.avatar || '',
      login: session.login || session.name,
      photoTaken: session.photoTaken || false,
    };
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function uploadAvatar(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    fetch('/api/upload-avatar', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(data => resolve(data.url || null))
      .catch(() => resolve(null));
  });
}

export function markPhotoTaken(): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      session.photoTaken = true;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {}
  // Also notify server
  import('./multiplayer').then(mp => mp.markPhotoTaken());
}
