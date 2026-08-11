FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

VOLUME /app/.game-data

CMD ["npm", "run", "start"]
