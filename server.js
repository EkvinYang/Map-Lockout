try {
  require('dotenv').config();
} catch (e) {
  console.warn('[Server] dotenv not loaded, using system environment variables.');
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const BUILDINGS = require('./buildings');
const { generateCommentary } = require('./commentary');

const REACH_DISTANCE = parseInt(process.env.REACH_DISTANCE) || 50;
const INTERACT_DISTANCE = parseInt(process.env.INTERACT_DISTANCE) || 100;
const END_DISTANCE = parseInt(process.env.END_DISTANCE) || 75;

function calculateDistanceServer(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getHeadingFromCoordsServer(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const dLon = toRad(lng2 - lng1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return ((brng + 360) % 360);
}
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

function initializeGolfState() {
  // Find a target hole at random (avoiding Richcraft Hall as the starting ball position)
  const candidateHoles = BUILDINGS.filter(b => b.id !== 'richcraft');
  const targetHole = candidateHoles.length > 0
    ? candidateHoles[Math.floor(Math.random() * candidateHoles.length)]
    : BUILDINGS[0]; // fallback

  const startLat = 45.38263922186898;
  const startLng = -75.69619565975236;
  const dist = calculateDistanceServer(startLat, startLng, targetHole.lat, targetHole.lng);
  const par = Math.ceil(dist / 200) + 1;

  return {
    holeLat: targetHole.lat,
    holeLng: targetHole.lng,
    holeName: targetHole.name,
    par
  };
}

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

// Import GoogleGenAI for grading
const { GoogleGenAI } = require('@google/genai');
const aiApiKey = process.env.GEMINI_API_KEY;
const ai = aiApiKey ? new GoogleGenAI({ apiKey: aiApiKey }) : null;

function getFallbackGrade(par, strokes) {
  let score = 'A';
  if (strokes > par + 3) score = 'B';
  if (strokes > par + 6) score = 'C';
  if (strokes <= par - 1) score = 'S';
  if (strokes <= par - 2) score = 'S+';
  
  const comments = {
    'S+': "Spectacular performance! You played like a seasoned professional.",
    'S': "Superb match! You completed the course well under par.",
    'A': "Great job! A few more practice runs and you'll be hitting under par.",
    'B': "Decent effort. Keep working on your swing and approach.",
    'C': "Good practice run. Focus on your alignment and power control."
  };
  
  return {
    score,
    commentary: comments[score] || `Well played! You reached the target hole in ${strokes} strokes against a par of ${par}.`
  };
}

app.use(express.json());

// API check
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', activeLobbies: Object.keys(lobbies).length });
});

// GET buildings configuration
app.get('/api/buildings', (req, res) => {
  res.json(BUILDINGS);
});

// AI grading endpoint
app.post('/api/grade', async (req, res) => {
  const { par, strokes, timeTaken, distance } = req.body;
  
  if (!ai) {
    console.warn('[grade] GEMINI_API_KEY not set. Using fallback grading.');
    return res.json(getFallbackGrade(par, strokes));
  }
  
  const prompt = `a beginner golf player completed a course with a par of ${par} in ${strokes} strokes, in a time of ${timeTaken}, and the total distance to the hole taken into account (${distance} meters), give the player a score from C, B, A, S, and S+. Tend to award higher scores, with an average around A depending on the previous 3 factors. Also include a short, encouraging and witty 1-2 sentence feedback commentary. Return the response in EXACTLY this JSON format (no markdown code blocks, just raw JSON):
{
  "score": "A",
  "commentary": "Great job! A few more practice runs and you'll be hitting under par."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    
    let text = response.text?.trim() || "";
    if (text.startsWith("```json")) {
      text = text.substring(7);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();
    
    console.log('[grade] Gemini raw response:', text);
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    console.error('[grade] Gemini grading failed:', err);
    res.json(getFallbackGrade(par, strokes));
  }
});

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

  // Compute time taken
  const initialTime = 900;
  const timeElapsed = initialTime - lobby.timeLeft;

  // Determine winner (lowest swing count wins in golf)
  const playerIds = Object.keys(lobby.players);
  let winnerId = 'tie';

  if (playerIds.length === 1) {
    winnerId = playerIds[0];
  } else if (playerIds.length === 2) {
    const p1 = lobby.players[playerIds[0]];
    const p2 = lobby.players[playerIds[1]];
    
    if (p1.completed && !p2.completed) {
      winnerId = playerIds[0];
    } else if (!p1.completed && p2.completed) {
      winnerId = playerIds[1];
    } else if (p1.completed && p2.completed) {
      // Both completed: compare swings
      if (p1.swings < p2.swings) {
        winnerId = playerIds[0];
      } else if (p2.swings < p1.swings) {
        winnerId = playerIds[1];
      } else {
        winnerId = 'tie';
      }
    } else {
      // Neither completed (timeout): player closer to the hole wins
      const gs = lobby.golfState;
      if (gs) {
        const d1 = calculateDistanceServer(p1.ballLat, p1.ballLng, gs.holeLat, gs.holeLng);
        const d2 = calculateDistanceServer(p2.ballLat, p2.ballLng, gs.holeLat, gs.holeLng);
        if (d1 < d2) {
          winnerId = playerIds[0];
        } else if (d2 < d1) {
          winnerId = playerIds[1];
        } else {
          // If distances are exactly equal, compare swings
          if (p1.swings < p2.swings) {
            winnerId = playerIds[0];
          } else if (p2.swings < p1.swings) {
            winnerId = playerIds[1];
          } else {
            winnerId = 'tie';
          }
        }
      } else {
        winnerId = 'tie';
      }
    }
  }

  let reasonText = "Time has run out!";
  if (reason === 'golf-finished') reasonText = "Course complete!";
  if (reason === 'opponent-disconnected') reasonText = "Your opponent disconnected from the game.";

  // Compute course par
  const gs = lobby.golfState;
  const par = gs ? gs.par : 3;
  const startLat = 45.38263922186898;
  const startLng = -75.69619565975236;
  const dist = gs ? calculateDistanceServer(startLat, startLng, gs.holeLat, gs.holeLng) : 0;

  io.to(code).emit('game-over', {
    players: lobby.players,
    winnerId,
    reason: reasonText,
    stats: {
      par,
      timeElapsed,
      holeDistance: Math.round(dist),
      holeName: gs ? gs.holeName : 'Unknown',
      completed: reason === 'golf-finished'
    }
  });

  console.log(`[Game Over] Room ${code} ended: ${reasonText}. Winner: ${winnerId}`);
}

io.on('connection', (socket) => {
  console.log(`[Socket] Device connected: ${socket.id}`);
  socket.emit('server-config', {
    reachDistance: REACH_DISTANCE,
    interactDistance: INTERACT_DISTANCE,
    endDistance: END_DISTANCE
  });

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
      gameMode: 'golf',
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
      timeLeft: 900, // 15 minutes game duration
      timerInterval: null,
      golfState: initializeGolfState()
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
      gameMode: 'golf',
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
          heading: 0,
          ballLat: 45.38263922186898,
          ballLng: -75.69619565975236,
          completed: false
        }
      },
      buildings: BUILDINGS.map(b => ({ ...b, capturedBy: null })),
      gameStarted: true, // Start immediately
      timeLeft: 900,
      timerInterval: null,
      golfState: initializeGolfState()
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
      heading: 0,
      ballLat: 45.38263922186898,
      ballLng: -75.69619565975236,
      completed: false
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
    lobby.timeLeft = 900; // Reset timer to 15 minutes

    // Reset players states
    for (const pid in lobby.players) {
      lobby.players[pid].score = 0;
      lobby.players[pid].swings = 0;
      lobby.players[pid].multiplier = 1.0;
      lobby.players[pid].ballLat = 45.38263922186898;
      lobby.players[pid].ballLng = -75.69619565975236;
      lobby.players[pid].completed = false;
    }

    // Reset powerup buildings and select fresh random hole
    lobby.buildings = BUILDINGS.map(b => ({ ...b, capturedBy: null }));
    lobby.golfState = initializeGolfState();

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

  // Capture Powerup removed for Campus Golf mode

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
    if (player.completed) return; // Ignore swings if player already completed the course

    const gs = lobby.golfState;

    // Increment swing count
    player.swings += 1;

    const distance = data.distance || 0;
    let heading = data.heading || 0;

    // Aim Assist Plan:
    const targetHeading = getHeadingFromCoordsServer(player.ballLat, player.ballLng, gs.holeLat, gs.holeLng);
    let diff = heading - targetHeading;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    if (Math.abs(diff) <= 100) {
      diff = diff * 0.67;
      heading = (targetHeading + diff + 360) % 360;
    }

    const metersPerLat = 111320;
    const metersPerLng = 111320 * Math.cos(player.ballLat * Math.PI / 180);

    // Convert heading to dx/dy (0 deg = North)
    const headingRad = heading * Math.PI / 180;
    const dyMeters = distance * Math.cos(headingRad);
    const dxMeters = distance * Math.sin(headingRad);

    player.ballLat += dyMeters / metersPerLat;
    player.ballLng += dxMeters / metersPerLng;

    // Check distance to hole
    const holeLat = gs.holeLat;
    const holeLng = gs.holeLng;
    const dyToHole = holeLat - player.ballLat;
    const dxToHole = holeLng - player.ballLng;
    const distanceToHoleMeters = Math.sqrt(
      Math.pow(dyToHole * metersPerLat, 2) + Math.pow(dxToHole * metersPerLng, 2)
    );

    if (distanceToHoleMeters <= END_DISTANCE) {
      // It goes in!
      player.ballLat = holeLat;
      player.ballLng = holeLng;
      player.completed = true;

      io.to(roomCode).emit('golf-state-update', {
        playerId: socket.id,
        swings: player.swings,
        ballLat: player.ballLat,
        ballLng: player.ballLng,
        completed: true,
        distance,
        heading
      });

      generateCommentary('sink', {
        buildingName: gs.holeName,
        swingCount: player.swings,
        distanceToHole: Math.round(distanceToHoleMeters)
      }).then(text => {
        io.to(roomCode).emit('commentary-audio', { text });
      });

      // Check if all players finished the course
      const allCompleted = Object.keys(lobby.players).every(pid => lobby.players[pid].completed);
      if (allCompleted) {
        setTimeout(() => endGame(roomCode, 'golf-finished'), 2000);
      } else {
        // In multiplayer, when one person has finished the course, ensure the timer for the other person is reduced to 5:00, if previously above
        const playerIds = Object.keys(lobby.players);
        if (playerIds.length > 1) {
          const completedCount = playerIds.filter(pid => lobby.players[pid].completed).length;
          if (completedCount === 1) {
            if (lobby.timeLeft > 300) {
              lobby.timeLeft = 300;
              io.to(roomCode).emit('game-tick', { timeLeft: lobby.timeLeft });
            }
          }
        }
      }
    } else {
      io.to(roomCode).emit('golf-state-update', {
        playerId: socket.id,
        swings: player.swings,
        ballLat: player.ballLat,
        ballLng: player.ballLng,
        completed: false,
        distance,
        heading
      });

      let nearestDist = Infinity;
      let nearestName = null;
      BUILDINGS.forEach(b => {
        const d = calculateDistanceServer(player.ballLat, player.ballLng, b.lat, b.lng);
        if (d < nearestDist) {
          nearestDist = d;
          nearestName = b.name;
        }
      });
      const bName = nearestDist <= 100 ? nearestName : null;

      generateCommentary('swing', {
        buildingName: bName,
        swingCount: player.swings,
        distanceToHole: Math.round(distanceToHoleMeters)
      }).then(text => {
        io.to(roomCode).emit('commentary-audio', { text });
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
