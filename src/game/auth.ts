const CHAR_IDS = ['pers1', 'pers2', 'pers3', 'pers4', 'pers5'];
const CHAR_NAMES: Record<string, string> = {
  pers1: 'Петя',
  pers2: 'Аня',
  pers3: 'Сергей',
  pers4: 'Дима',
  pers5: 'Ольга',
};
const CHAR_COLORS: Record<string, string> = {
  pers1: '#e94560',
  pers2: '#ffa726',
  pers3: '#2196f3',
  pers4: '#4ecca3',
  pers5: '#9c27b0',
};

interface UserData {
  email: string;
  passwordHash: string;
  charId: string;
  name: string;
  createdAt: number;
}

function hashStr(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function simpleHash(password: string): string {
  return hashStr(password + '_salt_secret_2024');
}

function deriveCharId(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % CHAR_IDS.length;
  return CHAR_IDS[idx];
}

function getUsers(): Record<string, UserData> {
  try {
    return JSON.parse(localStorage.getItem('auth_users') || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserData>) {
  localStorage.setItem('auth_users', JSON.stringify(users));
}

export function register(email: string, password: string): { ok: boolean; msg: string } {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes('@')) return { ok: false, msg: 'Некорректный email' };
  if (password.length < 4) return { ok: false, msg: 'Пароль минимум 4 символа' };

  const users = getUsers();
  if (users[e]) return { ok: false, msg: 'Email уже зарегистрирован' };

  const charId = deriveCharId(e);
  const name = CHAR_NAMES[charId] || 'Сотрудник';

  users[e] = {
    email: e,
    passwordHash: simpleHash(password),
    charId,
    name,
    createdAt: Date.now(),
  };
  saveUsers(users);

  // Save session
  localStorage.setItem('auth_session', JSON.stringify({ email: e, ts: Date.now() }));

  return { ok: true, msg: `Добро пожаловать, ${name}!` };
}

export function login(email: string, password: string): { ok: boolean; msg: string } {
  const e = email.trim().toLowerCase();
  const users = getUsers();
  const user = users[e];

  if (!user) return { ok: false, msg: 'Пользователь не найден' };
  if (user.passwordHash !== simpleHash(password)) return { ok: false, msg: 'Неверный пароль' };

  localStorage.setItem('auth_session', JSON.stringify({ email: e, ts: Date.now() }));
  return { ok: true, msg: `С возвращением, ${user.name}!` };
}

export function getCurrentUser(): UserData | null {
  try {
    const session = JSON.parse(localStorage.getItem('auth_session') || 'null');
    if (!session?.email) return null;
    const users = getUsers();
    return users[session.email] || null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('auth_session');
}

export function getCharMeta(charId: string) {
  return {
    charId,
    name: CHAR_NAMES[charId] || 'Сотрудник',
    color: CHAR_COLORS[charId] || '#4ecca3',
  };
}
