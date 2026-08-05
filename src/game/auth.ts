export interface UserData {
  name: string;
  password: string;
  charId: string;
  color: string;
  role: string;
}

const USERS: Record<string, UserData> = {
  'олег':   { name: 'Олег',   password: '123456', charId: 'pers1', color: '#4ecca3', role: 'Разработчик' },
  'аня':    { name: 'Аня',    password: '123456', charId: 'pers2', color: '#ffa726', role: 'Дизайнер' },
  'алиса':  { name: 'Алиса',  password: '123456', charId: 'pers3', color: '#9c27b0', role: 'HR' },
  'кирилл': { name: 'Кирилл', password: '123456', charId: 'pers4', color: '#2196f3', role: 'QA' },
  'саша':   { name: 'Саша',   password: '123456', charId: 'pers5', color: '#e94560', role: 'PM' },
};

const SESSION_KEY = 'auth_session';

export function login(name: string, password: string): { ok: boolean; msg: string } {
  const n = name.trim().toLowerCase();
  const user = USERS[n];
  if (!user) return { ok: false, msg: 'Имя не найдено' };
  if (user.password !== password) return { ok: false, msg: 'Неверный пароль' };

  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: n, ts: Date.now() }));
  return { ok: true, msg: `С возвращением, ${user.name}!` };
}

export function getCurrentUser(): UserData & { name: string } | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!session?.name) return null;
    const user = USERS[session.name];
    return user ? { ...user, name: user.name } : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getAllUsers() {
  return Object.entries(USERS).map(([key, u]) => ({ login: key, ...u }));
}

export function addUser(login: string, name: string, password: string, charId: string, color: string, role: string): { ok: boolean; msg: string } {
  const key = login.trim().toLowerCase();
  if (USERS[key]) return { ok: false, msg: 'Логин уже занят' };
  USERS[key] = { name, password, charId, color, role };
  return { ok: true, msg: `Игрок ${name} добавлен` };
}
