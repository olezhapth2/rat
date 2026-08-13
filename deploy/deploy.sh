#!/bin/bash
set -e

echo "=== Установка Node.js ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

echo "=== Установка nginx и certbot ==="
apt install -y nginx certbot python3-certbot-nginx

echo "=== Клонирование проекта ==="
mkdir -p /var/www
cd /var/www
git clone git@github.com:olezhapth2/rat.git rat
cd /var/www/rat

echo "=== Установка зависимостей ==="
npm install

echo "=== Сборка ==="
npm run build

echo "=== Настройка systemd ==="
cp /var/www/rat/deploy/game.service /etc/systemd/system/game.service
systemctl daemon-reload
systemctl enable game
systemctl start game

echo "=== Настройка nginx ==="
cp /var/www/rat/deploy/nginx-game /etc/nginx/sites-enabled/game
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== SSL сертификат ==="
certbot --nginx -d office.secretgang.world --non-interactive --agree-tos -m olezhapth2@gmail.com

echo "=== Готово! ==="
echo "https://office.secretgang.world"
