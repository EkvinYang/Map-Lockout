const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const BUILDINGS = require('./buildings');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// API check
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', activeLobbies: Object.keys(lobbies).length });
});

// GET buildings configuration
app.get('/api/buildings', (req, res) => {
  res.json(BUILDINGS);
});

// Real-time state
// lobbies = {
//   [code]: {
//     code: string,
//     players: { [socketId]: { username, isHost, score, multiplier, lat, lng, accuracy } },
//     buildings: [...BUILDINGS cloned with capturedBy: null],
//     gameStarted: boolean,
//     timeLeft: number,
//     timerInterval: NodeJS.Timeout
//   }
// }
const lobbies = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid lookalikes (O, 0, I, 1)
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (lobbies[code]);
  return code;
}

// Helper to remove socket from lobbies
function leaveActiveLobby(socket) {
  let lobbyCodeToClean = null;
  
  for (const code in lobbies) {
    if (lobbies[code].players[socket.id]) {
      lobbyCodeToClean = code;
      const player = lobbies[code].players[socket.id];
      console.log(`[Lobby] Player ${player.username} (${socket.id}) leaving room ${code}`);
      
      delete lobbies[code].players[socket.id];
      socket.leave(code);
      
      const remainingIds = Object.keys(lobbies[code].players);
      if (remainingIds.length === 0) {
        // Stop timer and delete empty lobby
        if (lobbies[code].timerInterval) {
          clearInterval(lobbies[code].timerInterval);
        }
        delete lobbies[code];
        console.log(`[Lobby] Room ${code} empty, deleted.`);
      } else {
        // If host left, assign host role to next player
        if (player.isHost) {
          const nextHostId = remainingIds[0];
          lobbies[code].players[nextHostId].isHost = true;
          console.log(`[Lobby] Host left. Transferred Host role to ${lobbies[code].players[nextHostId].username}`);
        }
        
        // Notify remaining player
        io.to(code).emit('player-updated', { players: lobbies[code].players });
        
        if (lobbies[code].gameStarted) {
          // End game if someone disconnected mid-game
          endGame(code, 'opponent-disconnected');
        }
      }
      break;
    }
  }
}

// End the game and compute results
function endGame(code, reason) {
  const lobby = lobbies[code];
  if (!lobby) return;
  
  // Clear game timer loop
  if (lobby.timerInterval) {
    clearInterval(lobby.timerInterval);
    lobby.timerInterval = null;
  }
  
  lobby.gameStarted = false;
  
  // Determine winner
  const playerIds = Object.keys(lobby.players);
  let winnerId = 'tie';
  
  if (playerIds.length === 1) {
    winnerId = playerIds[0];
  } else if (playerIds.length === 2) {
    const p1 = lobby.players[playerIds[0]];
    const p2 = lobby.players[playerIds[1]];
    if (p1.score > p2.score) {
      winnerId = playerIds[0];
    } else if (p2.score > p1.score) {
      winnerId = playerIds[1];
    }
  }
  
  let reasonText = "Time has run out!";
  if (reason === 'all-captured') reasonText = "All campus powerups have been captured!";
  if (reason === 'opponent-disconnected') reasonText = "Your opponent disconnected from the game.";

  io.to(code).emit('game-over', {
    players: lobby.players,
    winnerId,
    reason: reasonText
  });
  
  console.log(`[Game Over] Room ${code} ended: ${reasonText}. Winner: ${winnerId}`);
}

io.on('connection', (socket) => {
  console.log(`[Socket] Device connected: ${socket.id}`);

  // --- Phase 1: Simple GPS Test ---
  socket.on('test-gps-update', (data) => {
    console.log(`[GPS-Test] Device ${socket.id} | Lat: ${data.latitude}, Lng: ${data.longitude}, Acc: ${data.accuracy}m`);
    socket.emit('test-gps-response', { status: 'received', time: new Date() });
  });

  // --- Phase 2: Multiplayer & Lobby System ---
  
  // Create Lobby
  socket.on('create-lobby', (data) => {
    const code = generateRoomCode();
    lobbies[code] = {
      code,
      gameMode: data.gameMode || 'lockout',
      players: {
        [socket.id]: {
          username: data.username || 'Host',
          isHost: true,
          score: 0,
          swings: 0,
          multiplier: 1.0,
          lat: 0,
          lng: 0,
          accuracy: 0,
          heading: 0
        }
      },
      buildings: BUILDINGS.map(b => ({ ...b, capturedBy: null })),
      gameStarted: false,
      timeLeft: 300, // 5 minutes game duration
      timerInterval: null,
      golfState: data.gameMode === 'golf' ? {
        ballLat: 45.38263922186898,
        ballLng: -75.69619565975236,
        holeLat: 45.383395264680864,
        holeLng: -75.6974631863349,
      } : null
    };
    
    socket.join(code);
    socket.emit('lobby-created', { code, gameMode: lobbies[code].gameMode, players: lobbies[code].players });
    console.log(`[Lobby] Room ${code} created by host ${data.username} (Mode: ${lobbies[code].gameMode})`);
  });

  // Create Test Lobby (Solo)
  socket.on('create-test-lobby', (data) => {
    const code = generateRoomCode();
    lobbies[code] = {
      code,
      gameMode: data.gameMode || 'lockout',
      players: {
        [socket.id]: {
          username: data.username || 'Tester',
          isHost: true,
          score: 0,
          swings: 0,
          multiplier: 1.0,
          lat: 0,
          lng: 0,
          accuracy: 0,
          heading: 0
        }
      },
      buildings: BUILDINGS.map(b => ({ ...b, capturedBy: null })),
      gameStarted: true, // Start immediately
      timeLeft: 300,
      timerInterval: null,
      golfState: data.gameMode === 'golf' ? {
        ballLat: 45.38263922186898,
        ballLng: -75.69619565975236,
        holeLat: 45.383395264680864,
        holeLng: -75.6974631863349,
      } : null
    };
    
    socket.join(code);
    socket.emit('lobby-created', { code, gameMode: lobbies[code].gameMode, players: lobbies[code].players });
    
    console.log(`[Test Game] Solo test room ${code} created and started for ${data.username} (Mode: ${lobbies[code].gameMode})`);
    
    io.to(code).emit('game-started', {
      players: lobbies[code].players,
      buildings: lobbies[code].buildings,
      gameMode: lobbies[code].gameMode,
      golfState: lobbies[code].golfState
    });
    
    // Start countdown timer loop immediately
    lobbies[code].timerInterval = setInterval(() => {
      const lobby = lobbies[code];
      if (!lobby) return;
      
      lobby.timeLeft--;
      io.to(code).emit('game-tick', { timeLeft: lobby.timeLeft });
      
      if (lobby.timeLeft <= 0) {
        endGame(code, 'timeout');
      }
    }, 1000);
  });

  // Join Lobby
  socket.on('join-lobby', (data) => {
    const code = data.code ? data.code.toUpperCase() : '';
    const lobby = lobbies[code];
    
    if (!lobby) {
      socket.emit('error-msg', 'Lobby not found. Check the code and try again.');
      return;
    }
    
    if (lobby.gameStarted) {
      socket.emit('error-msg', 'Game has already started in this room.');
      return;
    }
    
    const playerIds = Object.keys(lobby.players);
    if (playerIds.length >= 2) {
      socket.emit('error-msg', 'This lobby is full (max 2 players).');
      return;
    }

    // Join room
    lobby.players[socket.id] = {
      username: data.username || 'Opponent',
      isHost: false,
      score: 0,
      swings: 0,
      multiplier: 1.0,
      lat: 0,
      lng: 0,
      accuracy: 0,
      heading: 0
    };
    
    socket.join(code);
    socket.emit('lobby-joined', { code, gameMode: lobby.gameMode, players: lobby.players });
    
    // Notify all players in lobby
    io.to(code).emit('player-updated', { players: lobby.players });
    console.log(`[Lobby] Player ${data.username} joined room ${code}`);
  });

  // Leave Lobby
  socket.on('leave-lobby', () => {
    leaveActiveLobby(socket);
  });

  // Start Game
  socket.on('start-game', () => {
    // Find active room
    let roomCode = null;
    for (const code in lobbies) {
      if (lobbies[code].players[socket.id]?.isHost) {
        roomCode = code;
        break;
      }
    }
    
    if (!roomCode) return;
    const lobby = lobbies[roomCode];
    if (!lobby || lobby.gameStarted) return;
    
    if (Object.keys(lobby.players).length < 2) {
      socket.emit('error-msg', 'Waiting for a second player to join before starting.');
      return;
    }
    
    console.log(`[Game Start] Starting game in room ${roomCode}`);
    lobby.gameStarted = true;
    lobby.timeLeft = 300; // Reset timer to 5 minutes
    
    // Reset players states
    for (const pid in lobby.players) {
      lobby.players[pid].score = 0;
      lobby.players[pid].multiplier = 1.0;
    }
    
    // Reset powerup buildings
    lobby.buildings = BUILDINGS.map(b => ({ ...b, capturedBy: null }));
    
    io.to(roomCode).emit('game-started', {
      players: lobby.players,
      buildings: lobby.buildings,
      gameMode: lobby.gameMode,
      golfState: lobby.golfState
    });
    
    // Start countdown timer loop
    lobby.timerInterval = setInterval(() => {
      lobby.timeLeft--;
      
      io.to(roomCode).emit('game-tick', { timeLeft: lobby.timeLeft });
      
      if (lobby.timeLeft <= 0) {
        endGame(roomCode, 'timeout');
      }
    }, 1000);
  });

  // Real-time location stream from players
  socket.on('player-location', (data) => {
    let roomCode = null;
    for (const code in lobbies) {
      if (lobbies[code].players[socket.id]) {
        roomCode = code;
        break;
      }
    }
    
    if (!roomCode) return;
    const lobby = lobbies[roomCode];
    const player = lobby.players[socket.id];
    
    // Update server state coordinates
    player.lat = data.lat;
    player.lng = data.lng;
    player.accuracy = data.accuracy;
    player.heading = data.heading;
    
    // Broadcast coordinates to room opponent
    socket.to(roomCode).emit('location-broadcast', {
      playerId: socket.id,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      heading: data.heading
    });
  });

  // Capture Powerup
  socket.on('capture-powerup', (data) => {
    let roomCode = null;
    for (const code in lobbies) {
      if (lobbies[code].players[socket.id]) {
        roomCode = code;
        break;
      }
    }
    
    if (!roomCode) return;
    const lobby = lobbies[roomCode];
    if (!lobby || !lobby.gameStarted) return;
    
    const player = lobby.players[socket.id];
    const building = lobby.buildings.find(b => b.id === data.buildingId);
    
    // Guard: building does not exist or has already been captured
    if (!building || building.capturedBy) return;
    
    // Process Capture Lockout
    building.capturedBy = socket.id;
    let scoreAddition = 0;
    
    if (building.powerup.type === 'points') {
      scoreAddition = Math.round(building.powerup.value * player.multiplier);
      player.score += scoreAddition;
    } else if (building.powerup.type === 'multiplier') {
      player.multiplier *= building.powerup.value;
      // Small bonus score for multiplier capture
      scoreAddition = 50;
      player.score += scoreAddition;
    }
    
    console.log(`[Capture] Room ${roomCode} | Player ${player.username} captured ${building.name} for +${scoreAddition} pts (Mult: ${player.multiplier.toFixed(1)}x)`);
    
    // Broadcast updated state to room
    io.to(roomCode).emit('game-state-update', {
      players: lobby.players,
      buildings: lobby.buildings,
      captureEvent: {
        playerId: socket.id,
        username: player.username,
        buildingId: building.id,
        buildingName: building.name,
        powerupDesc: building.powerup.description
      }
    });
    
    // Check if all buildings have been captured
    const allCaptured = lobby.buildings.every(b => b.capturedBy !== null);
    if (allCaptured) {
      endGame(roomCode, 'all-captured');
    }
  });

  // Golf Swing Action
  socket.on('golf-swing', (data) => {
    let roomCode = null;
    for (const code in lobbies) {
      if (lobbies[code].players[socket.id]) {
        roomCode = code;
        break;
      }
    }
    
    if (!roomCode) return;
    const lobby = lobbies[roomCode];
    if (!lobby || !lobby.gameStarted || lobby.gameMode !== 'golf') return;
    
    const player = lobby.players[socket.id];
    const gs = lobby.golfState;
    
    // Increment swing count
    player.swings += 1;
    
    const distance = data.distance || 0;
    const heading = data.heading || 0;

    const metersPerLat = 111320;
    const metersPerLng = 111320 * Math.cos(gs.ballLat * Math.PI / 180);

    // Convert heading to dx/dy (0 deg = North)
    const headingRad = heading * Math.PI / 180;
    const dyMeters = distance * Math.cos(headingRad);
    const dxMeters = distance * Math.sin(headingRad);

    gs.ballLat += dyMeters / metersPerLat;
    gs.ballLng += dxMeters / metersPerLng;

    // Check distance to hole
    const holeLat = gs.holeLat;
    const holeLng = gs.holeLng;
    const dyToHole = holeLat - gs.ballLat;
    const dxToHole = holeLng - gs.ballLng;
    const distanceToHoleMeters = Math.sqrt(
      Math.pow(dyToHole * metersPerLat, 2) + Math.pow(dxToHole * metersPerLng, 2)
    );
    
    if (distanceToHoleMeters <= 50) {
      // It goes in!
      gs.ballLat = holeLat;
      gs.ballLng = holeLng;
      
      io.to(roomCode).emit('golf-state-update', {
        golfState: gs,
        playerId: socket.id,
        swings: player.swings
      });
      
      setTimeout(() => endGame(roomCode, 'golf-finished'), 2000);
    } else {
      io.to(roomCode).emit('golf-state-update', {
        golfState: gs,
        playerId: socket.id,
        swings: player.swings
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Device disconnected: ${socket.id}`);
    leaveActiveLobby(socket);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` To test on your iPhone, use an HTTPS tunnel:`);
  console.log(` e.g., ngrok http ${PORT}`);
  console.log(`==================================================`);
});
