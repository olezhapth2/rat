# Деплой мультиплеера: Vercel + Railway

## Архитектура

```
[Игрок] → [Vercel: Next.js фронтенд] → [Railway: socket.io сервер :3001]
```

- **Vercel** — хостинг фронтенда (Next.js). Бесплатно, мгновенно, без cold starts.
- **Railway** — хостинг socket.io сервера. Бесплатный тир: 500 часов/мес (~$5 кредит).

---

## Шаг 1: Подготовка репозитория

### 1.1 Инициализируй git (если ещё нет)

```bash
cd "game-next"
git init
git add .
git commit -m "initial commit"
```

### 1.2 Залей на GitHub

```bash
# Создай репозиторий на github.com/new, потом:
git remote add origin https://github.com/ТВОЙ_USER/game-next.git
git branch -M main
git push -u origin main
```

---

## Шаг 2: Деплой фронтенда на Vercel

### 2.1 Создай аккаунт

- Зайди на https://vercel.com
- Нажми "Sign Up" → выбери "Continue with GitHub"

### 2.2 Импортируй проект

- Нажми "Add New..." → "Project"
- Выбери свой репозиторий `game-next`
- **Framework Preset**: Next.js (автоматически определит)
- **Build Command**: `npm run build` (оставить как есть)
- **Output Directory**: `.next` (оставить как есть)
- Нажми "Deploy"

### 2.3 Настрой environment variables

В настройках проекта (Settings → Environment Variables) добавь:

```
NEXT_PUBLIC_SERVER_URL=wss://твой-проект.railway.app
```

> ⚠️ Замени `твой-проект` на реальный URL Railway (получишь на Шаге 3)

### 2.4 Готово

Vercel автоматически задеплоит. Каждый push в `main` → автоматический деплой.

---

## Шаг 3: Деплой сервера на Railway

### 3.1 Создай аккаунт

- Зайди на https://railway.app
- Нажми "Login" → выбери GitHub

### 3.2 Создай проект

- Нажми "New Project" → "Deploy from GitHub repo"
- Выбери свой репозиторий `game-next`

### 3.3 Настрой сервер

Railway определит что это Node.js проект. Но нам нужно изменить команду запуска:

1. Зайди в настройки сервиса (Settings)
2. Найди поле **Start Command** и измени на:
```
npx tsx server.ts
```

3. Добавь **Environment Variable**:
```
PORT=3001
```

### 3.4 Настрой Domain

1. В настройках сервиса нажми "Settings" → "Networking"
2. Нажми "Generate Domain"
3. Ты получишь URL типа `https://xxx-yyy.up.railway.app`

> **Скопируй этот URL** — он нужен для фронтенда.

### 3.5 Обнови фронтенд

Вернись в Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SERVER_URL=wss://xxx-yyy.up.railway.app
```

Нажми "Redeploy" чтобы применить.

---

## Шаг 4: Исправь код для продакшена

### 4.1 Мультиплеер клиент

Открой `src/game/multiplayer.ts` и найди где создаётся socket. Должно быть примерно так:

```typescript
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
const socket = io(serverUrl, { ... });
```

Убедись что:
- Используешь `NEXT_PUBLIC_SERVER_URL` (с префиксом `NEXT_PUBLIC_` чтобы Next.js exposes на клиенте)
- Протокол `wss://` для Railway (они используют WebSocket)

### 4.2 Сервер

В `server.ts` убедись что:

```typescript
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Railway автоматически задаёт `PORT` через environment variable.

---

## Шаг 5: CORS для продакшена

В `server.ts` добавь CORS для Vercel домена:

```typescript
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://твой-проект.vercel.app',  // ← твой Vercel URL
    ],
    methods: ['GET', 'POST'],
  },
});
```

> ⚠️ Не забудь заменить на реальный Vercel URL после первого деплоя.

---

## Шаг 6: Тестирование

1. Открой Vercel URL в браузере
2. Открой тот же URL в другой вкладке/телефоне
3. Должны видеть друг друга на карте
4. Попробуй КНБ между реальными игроками

---

## Бесплатные лимиты

| Сервис | Бесплатно | Ограничения |
|--------|-----------|-------------|
| **Vercel** | Безлимитно (хобби проекты) | 100 ГБ трафика/мес, serverless functions |
| **Railway** | $5 кредит/мес (~500 часов) | После исчерпания — остановка (не штраф) |

500 часов на Railway = ~20 дней непрерывной работы. Для тестирования более чем достаточно.

---

## Альтернатива: Railway для всего

Если хочешь один сервис для всего:

1. Railway → Deploy from GitHub
2. Start Command: `npx tsx server.ts`
3. В `server.ts` добавь раздачу статики Next.js:

```typescript
import next from 'next';
const app = next({ dev: false });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  // ... socket.io сервер
  server.all('*', (req, res) => handle(req, res));
});
```

Но это сложнее и медленнее. Vercel + Railway проще.

---

## Частые ошибки

### "WebSocket connection failed"
- Проверь что `NEXT_PUBLIC_SERVER_URL` использует `wss://` (не `http://`)
- Проверь CORS в `server.ts`

### "CORS blocked"
- Добавь Vercel URL в `cors.origin` в `server.ts`

### Сервер падает
- Railway бесплатный тир может перезапускаться. Это нормально.
- Для продакшена лучше взять платный план ($5/мес).

### Next.js build error
- Убедись что `output: "export"` убран из `next.config.ts` (мы это уже сделали)
