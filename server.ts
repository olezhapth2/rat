import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // === Player state ===
  interface ServerPlayer {
    id: string;
    name: string;
    charId: string;
    hatId: string;
    x: number;
    y: number;
    color: string;
  }

  interface RpsGame {
    id: string;
    playerA: string; // socket id
    playerB: string;
    choiceA: 'rock' | 'paper' | 'scissors' | null;
    choiceB: 'rock' | 'paper' | 'scissors' | null;
    result: 'A' | 'B' | 'draw' | null;
    rewardA: number;
    rewardB: number;
  }

  const players = new Map<string, ServerPlayer>();
  const rpsGames = new Map<string, RpsGame>();
  let rpsCounter = 0;

  // === Shared placed items (visible to all players) ===
  interface PlacedItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
  }
  const sharedItems: PlacedItem[] = [];

  function broadcastPlayers() {
    const list = Array.from(players.values());
    io.emit('players:list', list);
  }

  io.on('connection', (socket) => {
    console.log(`[+] Player connected: ${socket.id}`);

    // Send current shared items to new player
    socket.emit('items:sync', sharedItems);

    // Player registers
    socket.on('player:register', (data: { name: string; charId: string; hatId: string; color: string }) => {
      const player: ServerPlayer = {
        id: socket.id,
        name: data.name,
        charId: data.charId,
        hatId: data.hatId,
        x: 30 * 40 + 20,
        y: 36 * 40 + 20,
        color: data.color,
      };
      players.set(socket.id, player);
      broadcastPlayers();
    });

    // Player moves
    socket.on('player:move', (data: { x: number; y: number }) => {
      const p = players.get(socket.id);
      if (p) {
        p.x = data.x;
        p.y = data.y;
        socket.broadcast.emit('player:moved', { id: socket.id, x: data.x, y: data.y });
      }
    });

    // === Shared items ===
    socket.on('item:place', (data: PlacedItem) => {
      sharedItems.push({ ...data, _owner: socket.id } as any);
      console.log(`[Items] Placed: ${data.id} at (${data.x},${data.y}) by ${socket.id}`);
      io.emit('items:sync', sharedItems);
    });

    socket.on('item:remove', (data: { index: number; id: string }) => {
      const idx = sharedItems.findIndex((item, i) => i === data.index && item.id === data.id);
      if (idx !== -1) {
        sharedItems.splice(idx, 1);
        console.log(`[Items] Removed: ${data.id} at index ${data.index}`);
        io.emit('items:sync', sharedItems);
      }
    });

    // === RPS Game ===
    // Player A invites Player B
    socket.on('rps:invite', (data: { targetId: string }) => {
      const playerA = players.get(socket.id);
      const playerB = players.get(data.targetId);
      if (!playerA || !playerB) return;

      // Check if either is already in a game
      for (const game of rpsGames.values()) {
        if (game.playerA === socket.id || game.playerB === socket.id ||
            game.playerA === data.targetId || game.playerB === data.targetId) {
          return; // already in a game
        }
      }

      const gameId = `rps_${++rpsCounter}`;
      const game: RpsGame = {
        id: gameId,
        playerA: socket.id,
        playerB: data.targetId,
        choiceA: null,
        choiceB: null,
        result: null,
        rewardA: 0,
        rewardB: 0,
      };
      rpsGames.set(gameId, game);

      // Notify target player about invite
      io.to(data.targetId).emit('rps:invite_received', {
        gameId,
        fromId: socket.id,
        fromName: playerA.name,
      });

      // Notify sender that invite was sent
      io.to(socket.id).emit('rps:invite_sent', {
        gameId,
        targetId: data.targetId,
        targetName: playerB.name,
      });
    });

    // Player B accepts invite
    socket.on('rps:accept', (data: { gameId: string }) => {
      const game = rpsGames.get(data.gameId);
      if (!game || game.playerB !== socket.id) return;

      // Notify both players game starts
      const playerA = players.get(game.playerA);
      const playerB = players.get(game.playerB);

      io.to(game.playerA).emit('rps:started', {
        gameId: data.gameId,
        opponentName: playerB?.name,
      });
      io.to(game.playerB).emit('rps:started', {
        gameId: data.gameId,
        opponentName: playerA?.name,
      });
    });

    // Player declines invite
    socket.on('rps:decline', (data: { gameId: string }) => {
      const game = rpsGames.get(data.gameId);
      if (!game) return;

      io.to(game.playerA).emit('rps:declined', { gameId: data.gameId });
      rpsGames.delete(data.gameId);
    });

    // Player makes a choice
    socket.on('rps:choice', (data: { gameId: string; choice: 'rock' | 'paper' | 'scissors' }) => {
      const game = rpsGames.get(data.gameId);
      if (!game) return;

      if (game.playerA === socket.id) game.choiceA = data.choice;
      else if (game.playerB === socket.id) game.choiceB = data.choice;

      // Both chose? Determine winner
      if (game.choiceA && game.choiceB) {
        const a = game.choiceA;
        const b = game.choiceB;

        if (a === b) {
          game.result = 'draw';
          game.rewardA = 5;
          game.rewardB = 5;
        } else if (
          (a === 'rock' && b === 'scissors') ||
          (a === 'paper' && b === 'rock') ||
          (a === 'scissors' && b === 'paper')
        ) {
          game.result = 'A';
          game.rewardA = 20;
          game.rewardB = 0;
        } else {
          game.result = 'B';
          game.rewardA = 0;
          game.rewardB = 20;
        }

        // Send results to both
        io.to(game.playerA).emit('rps:result', {
          gameId: game.id,
          myChoice: game.choiceA,
          theirChoice: game.choiceB,
          winner: game.result === 'A' ? 'you' : game.result === 'B' ? 'them' : 'draw',
          reward: game.rewardA,
        });
        io.to(game.playerB).emit('rps:result', {
          gameId: game.id,
          myChoice: game.choiceB,
          theirChoice: game.choiceA,
          winner: game.result === 'B' ? 'you' : game.result === 'A' ? 'them' : 'draw',
          reward: game.rewardB,
        });

        rpsGames.delete(game.id);
      }
    });

    // Cancel game
    socket.on('rps:cancel', (data: { gameId: string }) => {
      const game = rpsGames.get(data.gameId);
      if (!game) return;

      const otherId = game.playerA === socket.id ? game.playerB : game.playerA;
      io.to(otherId).emit('rps:cancelled', { gameId: data.gameId });
      rpsGames.delete(data.gameId);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[-] Player disconnected: ${socket.id}`);
      // Clean up any active games
      for (const [id, game] of rpsGames) {
        if (game.playerA === socket.id || game.playerB === socket.id) {
          const otherId = game.playerA === socket.id ? game.playerB : game.playerA;
          io.to(otherId).emit('rps:cancelled', { gameId: id });
          rpsGames.delete(id);
        }
      }
      players.delete(socket.id);
      broadcastPlayers();
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
