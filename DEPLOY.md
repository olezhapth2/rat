# Деплой

## Текущий деплой

- URL: `https://office.secretgang.world`
- Сервер: VPS `5.129.245.202`
- Путь: `/var/www/rat`
- Сервис: systemd (`game.service`)
- Reverse proxy: nginx

## Быстрый деплой

```bash
ssh root@5.129.245.202 "cd /var/www/rat && git pull && npm install && npm run build && systemctl restart game"
```

## Первичная установка

```bash
ssh root@5.129.245.202
bash /var/www/rat/deploy/deploy.sh
```

## Управление сервисом

```bash
# Статус
systemctl status game

# Перезапуск
systemctl restart game

# Логи
journalctl -u game -f

# Бэкап данных
cp -r /var/www/rat/.game-data /var/www/rat/.game-data-backup-$(date +%Y%m%d)
```

## Архитектура

```
[Игрок] → [nginx :80/443] → [Node.js :3001] → [.game-data/]
```

- **nginx** — reverse proxy + SSL (certbot)
- **Node.js** — кастомный сервер (Next.js + Socket.IO)
- **.game-data/** — JSON-файлы с данными (persistent на диске)
