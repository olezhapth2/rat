export interface UserData {
  name: string;
  charId: string;
  role: string;
  avatar: string;
  login: string;
  photoTaken?: boolean;
}

const SESSION_KEY = 'auth_session';
let pendingLogin: ((data: { ok: boolean; msg?: string; user?: UserData; firstLogin?: boolean }) => void) | null = null;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function initAuth(): void {
  import('./multiplayer').then(mp => {
    mp.connectAuth();
    mp.onAuthResult((data) => {
      if (data.ok && data.user && !data.firstLogin) {
        data.user.name = capitalize(data.user.name);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data.user, ts: Date.now() }));
      }
      pendingLogin?.(data);
      pendingLogin = null;
    });
    mp.onAuthUserSync((data) => {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (data.name !== undefined) session.name = capitalize(data.name);
        if (data.charId !== undefined) session.charId = data.charId;
        if (data.role !== undefined) session.role = data.role;
        if (data.avatar !== undefined) session.avatar = data.avatar;
        if (data.photoTaken !== undefined) session.photoTaken = data.photoTaken;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    });
  });
}

export function loginAsync(login: string, password: string): Promise<{ ok: boolean; msg?: string; user?: UserData; firstLogin?: boolean }> {
  return new Promise((resolve) => {
    pendingLogin = resolve;
    import('./multiplayer').then(mp => mp.authLogin(login, password));
    setTimeout(() => {
      if (pendingLogin === resolve) {
        pendingLogin = null;
        resolve({ ok: false, msg: 'Сервер недоступен' });
      }
    }, 5000);
  });
}

export function firstLoginAsync(login: string, password: string, name: string, role: string): Promise<{ ok: boolean; msg?: string; user?: UserData }> {
  return new Promise((resolve) => {
    pendingLogin = resolve;
    import('./multiplayer').then(mp => mp.authFirstLogin(login, password, name, role));
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
    if (!session?.login) return null;
    return {
      name: capitalize(session.name),
      charId: session.charId,
      role: capitalize(session.role),
      avatar: session.avatar || '',
      login: session.login || '',
      photoTaken: session.photoTaken || false,
    };
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function uploadAvatar(file: File): Promise<{ url: string; charId: string } | null> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    fetch('/api/upload-avatar', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(data => resolve(data.url && data.charId ? { url: data.url, charId: data.charId } : null))
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
  import('./multiplayer').then(mp => mp.markPhotoTaken());
}
