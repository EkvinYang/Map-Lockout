// Socket connection
const socket = io();

// Configurable distance limits (meters) — overridden by server on connect
let REACH_DISTANCE = 50;
let INTERACT_DISTANCE = 100;
let END_DISTANCE = 75;

socket.on('server-config', (cfg) => {
  if (cfg.reachDistance !== undefined) REACH_DISTANCE = cfg.reachDistance;
  if (cfg.interactDistance !== undefined) INTERACT_DISTANCE = cfg.interactDistance;
  if (cfg.endDistance !== undefined) END_DISTANCE = cfg.endDistance;
});


// Application State
let myUsername = '';
let lobbyCode = '';
let isHost = false;
let players = {};
let buildings = []; // Loaded from server
let gameTimerInterval = null;

// Leaflet Map Variables
let map = null;
let myMarker = null;
let myAccuracyCircle = null;
let opponentMarker = null;
let buildingMarkers = {}; // buildingId -> L.circleMarker

// Location Tracking Variables
let watchId = null;
let myLat = 0;
let myLng = 0;
let myAccuracy = 0;
let nearestBuilding = null;
const CAPTURE_RADIUS_METERS = 50; // Player must be within 50m of building
let myHeading = 0;
let prevLat = null;
let prevLng = null;

// GPS Smoothing State (speed cap at 8 m/s)
const MAX_SPEED_MPS = 8; // Maximum plausible walking/jogging speed
let smoothLat = null; // Exponentially-smoothed latitude
let smoothLng = null; // Exponentially-smoothed longitude
let lastGpsTimestamp = null;
let currentGameMode = 'golf';
let currentGolfState = null;
let ballMarkers = {}; // socketId -> L.marker
let prevBallPos = null; // Keep track of last hit position to render trail
let golfHoleMarker = null; // Used to calculate dt between updates
let markerAnimFrame = null; // requestAnimationFrame handle for own marker
let targetLat = 0; // Lerp target latitude
let targetLng = 0; // Lerp target longitude
let animStartLat = 0; // Lerp start latitude
let animStartLng = 0; // Lerp start longitude
let animStartTime = 0; // Lerp animation start time
const MARKER_GLIDE_MS = 800; // Duration markers take to glide between positions

// Golf Ball Spin Animation State
let ballSpinAngle = 0;
let ballSpinVelocity = 0;
let ballSpinFrame = null;

// Golf Ball Glide Animation State
let ballGlideStartLat = 0;
let ballGlideStartLng = 0;
let ballGlideTargetLat = 0;
let ballGlideTargetLng = 0;
let ballGlideStartTime = 0;
let ballGlideAnimFrame = null;
let ballGlideDurationMs = 1800; // dynamic glide time based on hit distance

// Opponent marker smoothing state
let oppTargetLat = 0;
let oppTargetLng = 0;
let oppAnimStartLat = 0;
let oppAnimStartLng = 0;
let oppAnimStartTime = 0;
let oppAnimFrame = null;

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username');
const joinCodeInput = document.getElementById('join-code');
const btnCreateLobby = document.getElementById('btn-create-lobby');
const btnJoinLobby = document.getElementById('btn-join-lobby');
const btnLeaveLobby = document.getElementById('btn-leave-lobby');
const btnStartGame = document.getElementById('btn-start-game');
const hostOnlyMsg = document.getElementById('host-only-msg');
const roomCodeDisplay = document.getElementById('room-code-display');
const playerRowsContainer = document.getElementById('player-rows-container');

// Game UI Elements
const scoreMe = document.getElementById('score-me');
const scoreOpp = document.getElementById('score-opp');
const gameTimer = document.getElementById('game-timer');
const gpsAccuracyDisplay = document.getElementById('gps-accuracy-display');
const nearestBuildingName = document.getElementById('nearest-building-name');
const proximityContainer = document.getElementById('proximity-container');
const proximityDot = document.getElementById('proximity-dot');
const proximityText = document.getElementById('proximity-text');
const btnCenterGameMap = document.getElementById('btn-center-game-map');
const eventFeed = document.getElementById('event-feed');
const gpsTimestampDisplay = document.getElementById('gps-timestamp-display');
// Conquest indicators removed
const scoreMeMini = document.getElementById('score-me-mini');
const scoreOppMini = document.getElementById('score-opp-mini');
const hudScoreDividerMini = document.getElementById('hud-score-divider-mini');
// Conquest indicators removed
const golfSwingsDisplay = document.getElementById('golf-swings');
const swingWrapper = document.getElementById('swing-wrapper');
const btnSwingAction = document.getElementById('btn-swing-action');
const compassArrow = document.getElementById('compass-arrow');

// IMU Swing Variables
let swingState = 'IDLE'; // 'IDLE', 'WAITING', 'RECORDING'
let peakAccel = 0;
let peakYaw = 0;
let swingStartTime = 0;
const SWING_RECORDING_MS = 1000;
const SWING_ACCEL_THRESHOLD = 20.0;
let gravity = { x: 0, y: 0, z: 0 };
let gravityInitialized = false;

// Game Over Dialog Elements
const dialogOverlay = document.getElementById('dialog-overlay');
const dialogHeaderTitle = document.getElementById('dialog-header-title');
const dialogSubTitle = document.getElementById('dialog-sub-title');
const finalScoreMe = document.getElementById('final-score-me');
const finalScoreOpp = document.getElementById('final-score-opp');
const dialogResultText = document.getElementById('dialog-result-text');
const btnDialogClose = document.getElementById('btn-dialog-close');
const btnTestSolo = document.getElementById('btn-test-solo');

const finalPar = document.getElementById('final-par');
const finalStrokes = document.getElementById('final-strokes');
const finalVsPar = document.getElementById('final-vs-par');
const finalTime = document.getElementById('final-time');
const dialogMultiplayerScores = document.getElementById('dialog-multiplayer-scores');
const aiGradeContainer = document.getElementById('ai-grade-container');
const gradeLoading = document.getElementById('grade-loading');
const gradeResult = document.getElementById('grade-result');
const gradeScore = document.getElementById('grade-score');
const gradeCommentary = document.getElementById('grade-commentary');

// --- Screen Navigation ---
function showScreen(screenId) {
  lobbyScreen.classList.remove('active');
  waitingScreen.classList.remove('active');
  gameScreen.classList.remove('active');

  if (screenId === 'lobby') {
    lobbyScreen.classList.add('active');
    document.body.classList.remove('golf-mode');
  }
  if (screenId === 'waiting') {
    waitingScreen.classList.add('active');
    document.body.classList.remove('golf-mode');
  }
  if (screenId === 'game') {
    gameScreen.classList.add('active');
  }

  // Force Leaflet to recalculate its container size after screen transitions
  if (map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

// --- Helper Functions ---
function getNickname() {
  const nick = usernameInput.value.trim();
  return nick || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
}

// Haversine Distance Formula (calculates distance in meters between two coordinates)
function calculateDistance(lat1, lon1, lat2, lon2) {
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

// Event Feed Overlay display
function showEventBanner(message, type = 'system') {
  if (!eventFeed) return; // Guard: only show when game screen is active
  const banner = document.createElement('div');
  banner.className = `event-banner ${type === 'opponent' ? 'opponent-captured' : type === 'system' ? 'system-alert' : ''}`;

  let emoji = '🔔';
  if (type === 'me') emoji = '⚡';
  if (type === 'opponent') emoji = '🚨';
  if (type === 'system') emoji = '⚙️';

  let emojiHtml = `<span>${emoji}</span> `;
  if (message.includes('BALL HIT')) {
    emojiHtml = '';
  }

  banner.innerHTML = `${emojiHtml}<span>${message}</span>`;
  eventFeed.appendChild(banner);

  // Slide out and remove after 4 seconds
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translate(-50%, -20px)';
    banner.style.transition = 'all 0.4s ease';
    setTimeout(() => banner.remove(), 400);
  }, 4000);
}

// --- Socket Emitters ---
function getSelectedGameMode() {
  return 'golf';
}

btnCreateLobby.addEventListener('click', () => {
  requestOrientationPermission();
  myUsername = getNickname();
  socket.emit('create-lobby', { username: myUsername, gameMode: getSelectedGameMode() });
});

btnJoinLobby.addEventListener('click', () => {
  requestOrientationPermission();
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    alert('Please enter a valid 4-digit room code.');
    return;
  }
  myUsername = getNickname();
  socket.emit('join-lobby', { code, username: myUsername });
});

btnTestSolo.addEventListener('click', () => {
  requestOrientationPermission();
  myUsername = getNickname();
  socket.emit('create-test-lobby', { username: myUsername, gameMode: getSelectedGameMode() });
});

btnLeaveLobby.addEventListener('click', () => {
  socket.emit('leave-lobby');
  lobbyCode = '';
  // keep tracking active so map continues to show current coordinates
  showScreen('lobby');
});

btnStartGame.addEventListener('click', () => {
  socket.emit('start-game');
});

btnDialogClose.addEventListener('click', () => {
  // Tell the server to remove us from the old room
  socket.emit('leave-lobby');
  lobbyCode = '';
  dialogOverlay.style.display = 'none';
  // Reset local building capture statuses immediately
  if (buildings) {
    buildings.forEach(b => b.capturedBy = null);
    updateBuildingPins();
  }
  // Fully clean up active game state and trackers
  stopTracking();
  // Restart fresh passive tracking for the lobby map
  startTracking();
  showScreen('lobby');
});

// --- Socket Listeners ---
socket.on('lobby-created', (data) => {
  lobbyCode = data.code;
  currentGameMode = data.gameMode || 'lockout';
  isHost = true;
  roomCodeDisplay.textContent = lobbyCode;
  showScreen('waiting');
  updateWaitingRoomUI(data.players);
});

socket.on('lobby-joined', (data) => {
  lobbyCode = data.code;
  currentGameMode = data.gameMode || 'lockout';
  isHost = false;
  roomCodeDisplay.textContent = lobbyCode;
  showScreen('waiting');
  updateWaitingRoomUI(data.players);
});

socket.on('player-updated', (data) => {
  updateWaitingRoomUI(data.players);
});

socket.on('error-msg', (message) => {
  alert(message);
});

socket.on('game-started', (data) => {
  buildings = data.buildings;
  players = data.players;
  currentGameMode = 'golf';
  currentGolfState = data.golfState || null;

  // Clear previous commentaries and shot banners
  if (eventFeed) eventFeed.innerHTML = '';

  // Hide end screen overlay and reset AI Grade displays
  if (dialogOverlay) dialogOverlay.style.display = 'none';
  if (gradeLoading) gradeLoading.style.display = 'none';
  if (gradeResult) {
    gradeResult.style.display = 'none';
    gradeResult.innerHTML = '';
  }

  // Reset ball position tracking and map flight wedges
  prevBallPos = null;
  if (window._activeMainWedge && map) { map.removeLayer(window._activeMainWedge); }
  if (window._activeShadowWedge && map) { map.removeLayer(window._activeShadowWedge); }
  window._activeMainWedge = null;
  window._activeShadowWedge = null;

  document.body.classList.add('golf-mode');
  const meId = socket.id;
  golfSwingsDisplay.textContent = players[meId]?.swings || 0;

  showScreen('game');
  updateBuildingPins();
  // Ensure location tracking is active
  startTracking();
});

socket.on('golf-state-update', (data) => {
  const { playerId, swings, ballLat, ballLng, completed } = data;
  const p = players[playerId];
  if (p) {
    const oldPos = [p.ballLat, p.ballLng];
    p.ballLat = ballLat;
    p.ballLng = ballLng;
    p.swings = swings;
    p.completed = completed;

    const newPos = [ballLat, ballLng];

    if (playerId === socket.id) {
      golfSwingsDisplay.textContent = swings;
      swingWrapper.classList.remove('active');
      
      const roundedStrength = Math.round(data.distance || 0);
      const roundedBearing = Math.round(data.heading || 0);
      showEventBanner(`BALL HIT! Strength: ${roundedStrength}%, Bearing: ${roundedBearing}°`, 'system');
      
      if (prevBallPos && (prevBallPos[0] !== newPos[0] || prevBallPos[1] !== newPos[1])) {
        startBallGlide(oldPos, newPos, data.distance || 0);
      } else {
        const marker = ballMarkers[playerId];
        if (marker) marker.setLatLng(newPos);
      }
      prevBallPos = newPos;
      triggerBallSpin(data.distance || 0);
    } else {
      updateBuildingPins();
    }
  }
  updateOffscreenIndicators();
});

socket.on('commentary-audio', (data) => {
  if (data.text) {
    if (!data.playerId || data.playerId === socket.id) {
      showEventBanner(data.text, 'system');
    }
  }
});

btnSwingAction.addEventListener('click', () => {
  if (currentGameMode === 'golf') {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().catch(console.error);
    }

    swingState = 'WAITING';
    peakAccel = 0;
    peakYaw = 0;
    btnSwingAction.innerHTML = 'SWING';
    btnSwingAction.classList.add('swing-active');
    btnSwingAction.style.pointerEvents = 'none'; // Prevent double clicking
  }
});

window.addEventListener('devicemotion', (event) => {
  if (currentGameMode !== 'golf' || swingState === 'IDLE') return;

  const accGravity = event.accelerationIncludingGravity;
  let linearAcc = null;

  if (accGravity && accGravity.x !== null && accGravity.y !== null && accGravity.z !== null) {
    if (!gravityInitialized) {
      gravity.x = accGravity.x;
      gravity.y = accGravity.y;
      gravity.z = accGravity.z;
      gravityInitialized = true;
    } else {
      const alpha = 0.85;
      gravity.x = alpha * gravity.x + (1 - alpha) * accGravity.x;
      gravity.y = alpha * gravity.y + (1 - alpha) * accGravity.y;
      gravity.z = alpha * gravity.z + (1 - alpha) * accGravity.z;
    }

    linearAcc = {
      x: accGravity.x - gravity.x,
      y: accGravity.y - gravity.y,
      z: accGravity.z - gravity.z
    };
  } else if (event.acceleration && event.acceleration.x !== null) {
    linearAcc = event.acceleration;
  }

  if (!linearAcc) return;

  const accelMagnitude = Math.sqrt(linearAcc.x**2 + linearAcc.y**2 + linearAcc.z**2);

  if (swingState === 'WAITING') {
    if (accelMagnitude > SWING_ACCEL_THRESHOLD) {
      swingState = 'RECORDING';
      swingStartTime = performance.now();
      peakAccel = accelMagnitude;
      peakYaw = myHeading;
    }
  } else if (swingState === 'RECORDING') {
    const elapsed = performance.now() - swingStartTime;
    if (elapsed < SWING_RECORDING_MS) {
      if (accelMagnitude > peakAccel) {
        peakAccel = accelMagnitude;
        peakYaw = myHeading;
      }
    } else {
      // Finished recording
      swingState = 'IDLE';
      btnSwingAction.innerHTML = 'SWING';
      btnSwingAction.classList.remove('swing-active');
      btnSwingAction.style.pointerEvents = 'auto';
      
      const distance = 20 * Math.sqrt(peakAccel) + 20;
      const adjustedYaw = (peakYaw - 90 + 360) % 360;
      
      socket.emit('golf-swing', { distance, heading: adjustedYaw });
      swingWrapper.classList.remove('active');
    }
  }
});

socket.on('game-tick', (data) => {
  // Update time display
  const minutes = Math.floor(data.timeLeft / 60);
  const seconds = data.timeLeft % 60;
  gameTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const initialTime = 900;
  if (data.timeLeft > (2 / 3) * initialTime) {
    gameTimer.style.color = '#10b981'; // Green (first third)
    gameTimer.style.textShadow = '0 0 8px rgba(16, 185, 129, 0.3)';
    gameTimer.style.animation = '';
  } else if (data.timeLeft >= (1 / 3) * initialTime) {
    gameTimer.style.color = '#f59e0b'; // Yellow (middle third)
    gameTimer.style.textShadow = '0 0 8px rgba(245, 158, 11, 0.3)';
    gameTimer.style.animation = '';
  } else {
    gameTimer.style.color = '#ef4444'; // Red (final third)
    gameTimer.style.textShadow = '0 0 8px rgba(239, 68, 68, 0.3)';
    if (data.timeLeft <= 60) {
      gameTimer.style.animation = 'pulse 1s infinite'; // Critical warning
    } else {
      gameTimer.style.animation = '';
    }
  }
});

// Real-time location updates for other players
socket.on('location-broadcast', (data) => {
  const { playerId, lat, lng, accuracy, heading } = data;
  if (playerId === socket.id) return; // Ignore own broadcast

  if (map) {
    const oppHeading = heading || 0;
    const oppDir = getCompassDirection(oppHeading);
    const oppUsername = players[playerId]?.username || "Opponent";

    const pinkDotIcon = L.divIcon({
      className: 'custom-player-pin',
      html: getPlayerIconHtml('#ec4899', oppHeading),
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (!opponentMarker) {
      opponentMarker = L.marker([lat, lng], { icon: pinkDotIcon }).addTo(map);
      opponentMarker.bindTooltip(`${oppUsername} (Facing: ${oppDir})`, { permanent: true, direction: 'top', className: 'hud-tooltip' });
      oppTargetLat = lat;
      oppTargetLng = lng;
    } else {
      opponentMarker.setIcon(pinkDotIcon);
      opponentMarker.setTooltipContent(`${oppUsername} (Facing: ${oppDir})`);
      // Start smooth glide to new position
      const currentOpp = opponentMarker.getLatLng();
      oppAnimStartLat = currentOpp.lat;
      oppAnimStartLng = currentOpp.lng;
      oppTargetLat = lat;
      oppTargetLng = lng;
      oppAnimStartTime = performance.now();
      if (!oppAnimFrame) animateOpponentMarker();
    }
  }
});

// Game state updates removed for Campus Golf mode

socket.on('game-over', (data) => {
  const { players: finalPlayers, winnerId, reason, stats } = data;
  const me = finalPlayers[socket.id];
  const oppId = Object.keys(finalPlayers).find(id => id !== socket.id);
  const opp = oppId ? finalPlayers[oppId] : null;
  const isSolo = Object.keys(finalPlayers).length === 1;

  const strokes = me ? me.swings : 0;
  const par = stats ? stats.par : 3;
  const vsPar = strokes - par;
  const timeElapsed = stats ? stats.timeElapsed : 0;
  const distance = stats ? stats.holeDistance : 500;

  // Format time taken
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const timeText = `${minutes}m ${seconds}s`;

  // Update Stats Grid
  if (finalPar) finalPar.textContent = par;
  if (finalStrokes) finalStrokes.textContent = strokes;
  if (finalVsPar) {
    if (vsPar > 0) {
      finalVsPar.textContent = `+${vsPar}`;
      finalVsPar.style.color = '#ef4444'; // Red for over par
    } else if (vsPar < 0) {
      finalVsPar.textContent = `${vsPar}`;
      finalVsPar.style.color = '#10b981'; // Green for under par
    } else {
      finalVsPar.textContent = 'E';
      finalVsPar.style.color = '#f59e0b'; // Yellow/Amber for even par
    }
  }
  if (finalTime) finalTime.textContent = timeStr;

  // Update multiplayer scoreboard
  if (dialogMultiplayerScores) {
    if (isSolo) {
      dialogMultiplayerScores.style.display = 'none';
    } else {
      dialogMultiplayerScores.style.display = 'flex';
      const listContainer = document.getElementById('dialog-multiplayer-list');
      if (listContainer) {
        listContainer.innerHTML = '';
        
        // Sort players: completed first, then fewer swings
        const sorted = Object.keys(finalPlayers).map(pid => ({
          id: pid,
          ...finalPlayers[pid]
        })).sort((a, b) => {
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return a.swings - b.swings;
        });

        sorted.forEach((p, index) => {
          const row = document.createElement('div');
          row.style.display = 'grid';
          row.style.gridTemplateColumns = '45px 1fr 70px 75px';
          row.style.alignItems = 'center';
          row.style.fontSize = '0.9rem';

          const rankText = index === 0 ? '1st' : '2nd';
          const rankColor = index === 0 ? 'var(--warning)' : 'var(--text-muted)';
          const resultText = p.completed ? 'FINISHED' : 'DNF';
          const resultColor = p.completed ? 'var(--success)' : 'var(--danger)';

          row.innerHTML = `
            <span style="color: ${rankColor}; font-weight: bold;">${rankText}</span>
            <span style="font-weight: bold; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.username}</span>
            <span style="text-align: right; color: var(--text-main);">${p.swings}</span>
            <span style="text-align: right; color: ${resultColor}; font-weight: bold;">${resultText}</span>
          `;
          listContainer.appendChild(row);
        });
      }
    }
  }

  // Set header & victory description (no emojis!)
  dialogSubTitle.textContent = `Reason: ${reason}`;
  const isDisconnect = reason && reason.toLowerCase().includes('disconnect');
  const myCompleted = me ? me.completed : false;

  if (isDisconnect) {
    if (winnerId === socket.id) {
      dialogHeaderTitle.textContent = "YOU WON!";
      dialogHeaderTitle.className = "dialog-title dialog-winner";
      dialogResultText.textContent = "Your opponent left the match.";
    } else {
      dialogHeaderTitle.textContent = "DEFEAT";
      dialogHeaderTitle.className = "dialog-title dialog-loser";
      dialogResultText.textContent = "You disconnected from the game.";
    }
  } else if (isSolo) {
    if (myCompleted) {
      dialogHeaderTitle.textContent = "COURSE COMPLETE";
      dialogHeaderTitle.className = "dialog-title dialog-winner";
      dialogResultText.textContent = `Congratulations! You reached the target hole in ${strokes} swings.`;
    } else {
      dialogHeaderTitle.textContent = "TIME EXPIRED";
      dialogHeaderTitle.className = "dialog-title dialog-loser";
      dialogResultText.textContent = "You failed to complete the course before the timer ran out.";
    }
  } else {
    if (winnerId === 'tie') {
      dialogHeaderTitle.textContent = "MATCH DRAW";
      dialogHeaderTitle.className = "dialog-title";
      dialogResultText.textContent = "A neck-and-neck match! You finished with the same number of swings.";
    } else if (winnerId === socket.id) {
      dialogHeaderTitle.textContent = "VICTORY";
      dialogHeaderTitle.className = "dialog-title dialog-winner";
      dialogResultText.textContent = "Fantastic play! You completed the course in fewer swings.";
    } else {
      dialogHeaderTitle.textContent = "DEFEAT";
      dialogHeaderTitle.className = "dialog-title dialog-loser";
      dialogResultText.textContent = "Almost! Your opponent completed the course in fewer swings.";
    }
  }

  // Display dialog
  dialogOverlay.style.display = 'flex';

  // Fetch AI Grade
  if (gradeLoading && gradeResult) {
    gradeLoading.style.display = 'flex';
    gradeResult.style.display = 'none';

    fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        par,
        strokes,
        timeTaken: timeText,
        distance
      })
    })
      .then(res => res.json())
      .then(result => {
        if (gradeScore) gradeScore.textContent = result.score || 'A';
        if (gradeCommentary) gradeCommentary.textContent = result.commentary || '';
        gradeLoading.style.display = 'none';
        gradeResult.style.display = 'flex';
      })
      .catch(err => {
        console.error('Failed to fetch AI grade:', err);
        // Fallback grade directly on UI
        let score = 'A';
        if (strokes > par + 3) score = 'B';
        if (strokes > par + 6) score = 'C';
        if (strokes <= par - 1) score = 'S';
        if (strokes <= par - 2) score = 'S+';
        
        if (gradeScore) gradeScore.textContent = score;
        if (gradeCommentary) gradeCommentary.textContent = `Nice round! You finished in ${strokes} strokes.`;
        gradeLoading.style.display = 'none';
        gradeResult.style.display = 'flex';
      });
  }
});

// --- Waiting Room UI Helper ---
function updateWaitingRoomUI(lobbyPlayers) {
  playerRowsContainer.innerHTML = '';

  const playerIds = Object.keys(lobbyPlayers);
  playerIds.forEach((id) => {
    const p = lobbyPlayers[id];
    const isMe = id === socket.id;

    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div class="player-info">
        <div class="player-avatar ${isMe ? 'me' : 'opponent'}">${p.username.substring(0, 2).toUpperCase()}</div>
        <span>${p.username} ${isMe ? '(You)' : ''}</span>
      </div>
      <span class="player-status-badge ready">${p.isHost ? 'HOST' : 'READY'}</span>
    `;
    playerRowsContainer.appendChild(row);
  });

  // Enable start button if host and there are 2 players
  if (isHost) {
    btnStartGame.style.display = 'block';
    hostOnlyMsg.style.display = 'none';
    if (playerIds.length === 2) {
      btnStartGame.removeAttribute('disabled');
      btnStartGame.style.opacity = '1';
    } else {
      btnStartGame.setAttribute('disabled', 'true');
      btnStartGame.style.opacity = '0.5';
    }
  } else {
    btnStartGame.style.display = 'none';
    hostOnlyMsg.style.display = 'block';
  }
}

// --- Map Initialization ---
function initGlobalMap() {
  if (map) {
    map.remove();
  }

  // Set default center on Carleton University campus
  const defaultLat = 45.3826;
  const defaultLng = -75.6962;

  map = L.map('game-map', {
    zoomControl: false,
    maxZoom: 21
  }).setView([defaultLat, defaultLng], 17);

  // --- Dual-layer map for colorful labels + dark game aesthetic ---
  // Base layer: CartoDB Voyager (colorful with building names, roads, POIs)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxNativeZoom: 19, // Prevents blank tiles — upscales beyond 19
    maxZoom: 21
  }).addTo(map);

  // Dynamic marker zoom scaling and off-screen pointers update
  map.on('zoomend', () => {
    if (map && myMarker) {
      const size = getCurrentMarkerSize();
      const blueDotIcon = L.divIcon({
        className: 'custom-player-pin',
        html: getPlayerIconHtml('#6366f1', myHeading, size),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      myMarker.setIcon(blueDotIcon);
    }
    updateOffscreenIndicators();
  });

  map.on('move', updateOffscreenIndicators);
}

function drawBuildingPins() {
  // In Campus Golf mode, standard pins are hidden by default and managed by proximity.
  // We'll clear the markers map here.
  for (const id in buildingMarkers) {
    map.removeLayer(buildingMarkers[id]);
  }
  buildingMarkers = {};
}


/**
 * Generates the HTML for a Google Maps-style location pin with a bold name label.
 * @param {string} color - Pin fill color (hex)
 * @param {string} name - Building name to display above the pin
 */
function getBuildingPinHtml(color, name) {
  return `
    <div class="gmap-pin-wrapper">
      <div class="gmap-pin-label">${name}</div>
      <svg class="gmap-pin-svg" viewBox="0 0 30 42" width="30" height="42" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 10.969 13.17 25.313 14.11 26.348a1.2 1.2 0 0 0 1.78 0C16.83 40.313 30 25.969 30 15 30 6.716 23.284 0 15 0z"
              fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
        <circle cx="15" cy="14" r="6" fill="white" opacity="0.9"/>
      </svg>
      <div class="gmap-pin-shadow"></div>
    </div>
  `;
}

function updateBuildingPins() {
  if (currentGameMode === 'golf' && currentGolfState) {
    // Draw Golf Pins
    if (golfHoleMarker) { map.removeLayer(golfHoleMarker); }
    const holeIcon = L.divIcon({
      className: 'map-pin-container',
      html: getBuildingPinHtml('#10b981', currentGolfState.holeName || 'Target'),
      iconSize: [30, 42], iconAnchor: [15, 42]
    });
    golfHoleMarker = L.marker([currentGolfState.holeLat, currentGolfState.holeLng], { icon: holeIcon }).addTo(map);

    // Clear and draw individual player balls
    for (const pid in ballMarkers) {
      map.removeLayer(ballMarkers[pid]);
    }
    ballMarkers = {};

    const ballCoords = [];
    for (const pid in players) {
      const p = players[pid];
      if (p.ballLat === undefined || p.ballLng === undefined) continue;

      let drawLat = p.ballLat;
      let drawLng = p.ballLng;

      // Nudge if overlap (under 0.00001 deg, which is ~1 meter)
      for (const coords of ballCoords) {
        if (Math.abs(drawLat - coords.origLat) < 0.00001 && Math.abs(drawLng - coords.origLng) < 0.00001) {
          // Nudge by a small offset (approx 3 meters)
          drawLat += 0.000025;
          drawLng += 0.000025;
        }
      }
      ballCoords.push({ origLat: p.ballLat, origLng: p.ballLng, lat: drawLat, lng: drawLng });

      const color = p.isHost ? '#6366f1' : '#ec4899';
      const ballIcon = L.divIcon({
        className: 'custom-golf-ball-wrapper',
        html: `
          <div class="golf-ball-img" style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #ffffff;
            border: 3px solid ${color};
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center;
            transition: transform 0.05s linear;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; transform: translateY(-4px);"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([drawLat, drawLng], { icon: ballIcon }).addTo(map);
      ballMarkers[pid] = marker;

      if (pid === socket.id) {
        prevBallPos = [p.ballLat, p.ballLng];
      }
    }
    return;
  }

  // Legacy conquest building logic removed
}

// --- Live Location Loop ---
function startTracking() {
  if (watchId !== null) return; // Already tracking

  if (!navigator.geolocation) {
    alert('Geolocation not supported by this browser. Cannot play GPS game.');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const rawLat = position.coords.latitude;
      const rawLng = position.coords.longitude;
      myAccuracy = position.coords.accuracy;

      // ---- GPS Speed Capping & Smoothing ----
      const now = performance.now();
      if (smoothLat === null || smoothLng === null) {
        // First fix: accept as-is
        smoothLat = rawLat;
        smoothLng = rawLng;
        lastGpsTimestamp = now;
      } else {
        const dtSec = Math.max((now - lastGpsTimestamp) / 1000, 0.1); // seconds since last fix
        lastGpsTimestamp = now;
        const dist = calculateDistance(smoothLat, smoothLng, rawLat, rawLng);
        const speed = dist / dtSec; // m/s

        if (speed > MAX_SPEED_MPS) {
          // GPS jumped too far — clamp to max speed along the same bearing
          const clampRatio = (MAX_SPEED_MPS * dtSec) / dist;
          // Lerp smoothLat/smoothLng toward raw by clampRatio
          smoothLat = smoothLat + (rawLat - smoothLat) * clampRatio;
          smoothLng = smoothLng + (rawLng - smoothLng) * clampRatio;
        } else {
          // Within speed limit — use exponential moving average for jitter reduction
          const alpha = 0.6; // Higher = more responsive, lower = smoother
          smoothLat = smoothLat + (rawLat - smoothLat) * alpha;
          smoothLng = smoothLng + (rawLng - smoothLng) * alpha;
        }
      }

      // Store the smoothed values as the "official" position
      myLat = smoothLat;
      myLng = smoothLng;

      // Update UI (only if game screen is active)
      if (gpsAccuracyDisplay) {
        gpsAccuracyDisplay.textContent = `${myAccuracy.toFixed(1)}m`;
        gpsAccuracyDisplay.style.color = myAccuracy > 25 ? '#ef4444' : '';
      }
      if (gpsTimestampDisplay) {
        const d = new Date();
        gpsTimestampDisplay.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      }

      // Handle Heading
      if (position.coords.heading !== null && position.coords.heading !== undefined && !isNaN(position.coords.heading)) {
        myHeading = position.coords.heading;
      } else if (prevLat !== null && prevLng !== null) {
        const headingDist = calculateDistance(prevLat, prevLng, myLat, myLng);
        if (headingDist > 1.5) {
          myHeading = getHeadingFromCoords(prevLat, prevLng, myLat, myLng);
        }
      }

      prevLat = myLat;
      prevLng = myLng;

      // ---- Smooth Marker Animation (glide, don't jump) ----
      if (map) {
        const size = getCurrentMarkerSize();
        const blueDotIcon = L.divIcon({
          className: 'custom-player-pin',
          html: getPlayerIconHtml('#6366f1', myHeading, size),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });

        if (!myMarker) {
          map.setView([myLat, myLng], 18);
          myMarker = L.marker([myLat, myLng], { icon: blueDotIcon }).addTo(map);
          targetLat = myLat;
          targetLng = myLng;

          myAccuracyCircle = L.circle([myLat, myLng], {
            radius: myAccuracy,
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.1,
            weight: 1
          }).addTo(map);
        } else {
          myMarker.setIcon(blueDotIcon);
          // Set up glide animation toward new smoothed position
          const current = myMarker.getLatLng();
          animStartLat = current.lat;
          animStartLng = current.lng;
          targetLat = myLat;
          targetLng = myLng;
          animStartTime = performance.now();
          if (!markerAnimFrame) animateMyMarker();
        }
      }

      // Emit smoothed location to socket room (only if we are in an active game)
      if (lobbyCode) {
        socket.emit('player-location', { lat: myLat, lng: myLng, accuracy: myAccuracy, heading: myHeading });
        checkProximities();
      }
    },
    (err) => {
      console.error("GPS Watch error: ", err);
      showEventBanner("GPS Signal lost. Retrying...", "system");
    },
    options
  );
}

/**
 * Smoothly lerps own marker from current position toward (targetLat, targetLng)
 * using requestAnimationFrame for 60fps gliding.
 */
function animateMyMarker() {
  const now = performance.now();
  const elapsed = now - animStartTime;
  const t = Math.min(elapsed / MARKER_GLIDE_MS, 1); // 0..1 progress
  // Ease-out cubic for natural deceleration
  const ease = 1 - Math.pow(1 - t, 3);

  const lat = animStartLat + (targetLat - animStartLat) * ease;
  const lng = animStartLng + (targetLng - animStartLng) * ease;

  if (myMarker) {
    myMarker.setLatLng([lat, lng]);
    if (myAccuracyCircle) {
      myAccuracyCircle.setLatLng([lat, lng]);
      myAccuracyCircle.setRadius(myAccuracy);
    }
    updateOffscreenIndicators();
  }

  if (t < 1) {
    markerAnimFrame = requestAnimationFrame(animateMyMarker);
  } else {
    markerAnimFrame = null;
    updateOffscreenIndicators(true);
  }
}

/**
 * Smoothly lerps opponent marker from current position toward (oppTargetLat, oppTargetLng)
 */
function animateOpponentMarker() {
  const now = performance.now();
  const elapsed = now - oppAnimStartTime;
  const t = Math.min(elapsed / MARKER_GLIDE_MS, 1);
  const ease = 1 - Math.pow(1 - t, 3);

  const lat = oppAnimStartLat + (oppTargetLat - oppAnimStartLat) * ease;
  const lng = oppAnimStartLng + (oppTargetLng - oppAnimStartLng) * ease;

  if (opponentMarker) {
    opponentMarker.setLatLng([lat, lng]);
  }

  if (t < 1) {
    oppAnimFrame = requestAnimationFrame(animateOpponentMarker);
  } else {
    oppAnimFrame = null;
    updateOffscreenIndicators(true);
  }
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (markerAnimFrame) { cancelAnimationFrame(markerAnimFrame); markerAnimFrame = null; }
  if (oppAnimFrame) { cancelAnimationFrame(oppAnimFrame); oppAnimFrame = null; }
  if (ballGlideAnimFrame) { cancelAnimationFrame(ballGlideAnimFrame); ballGlideAnimFrame = null; }
  if (ballSpinFrame) { cancelAnimationFrame(ballSpinFrame); ballSpinFrame = null; }

  // Remove old markers from the map before nulling references
  if (myMarker && map) { map.removeLayer(myMarker); }
  if (myAccuracyCircle && map) { map.removeLayer(myAccuracyCircle); }
  if (opponentMarker && map) { map.removeLayer(opponentMarker); }
  for (const pid in ballMarkers) {
    if (map) map.removeLayer(ballMarkers[pid]);
  }
  ballMarkers = {};
  if (golfHoleMarker && map) { map.removeLayer(golfHoleMarker); }

  // Clean up any lingering trail wedges
  if (window._activeMainWedge && map) { map.removeLayer(window._activeMainWedge); window._activeMainWedge = null; }
  if (window._activeShadowWedge && map) { map.removeLayer(window._activeShadowWedge); window._activeShadowWedge = null; }

  myMarker = null;
  myAccuracyCircle = null;
  opponentMarker = null;
  // ballMarkers cleaned up
  golfHoleMarker = null;

  // Reset golf game state so a fresh game starts clean
  currentGolfState = null;
  prevBallPos = null;

  // Remove building proximity markers
  for (const id in buildingMarkers) {
    if (map) map.removeLayer(buildingMarkers[id]);
  }
  buildingMarkers = {};

  smoothLat = null;
  smoothLng = null;
  lastGpsTimestamp = null;
}

// Check proximity to buildings
function checkProximities() {
  if (buildings.length > 0) {
    buildings.forEach(b => {
      const dist = calculateDistance(myLat, myLng, b.lat, b.lng);
      let marker = buildingMarkers[b.id];

      if (dist <= INTERACT_DISTANCE) {
        if (!marker) {
          const icon = L.divIcon({
            className: 'grey-name-tag-wrapper',
            html: `<div class="grey-name-tag">${b.name}</div>`,
            iconSize: [120, 30],
            iconAnchor: [60, 15]
          });
          marker = L.marker([b.lat, b.lng], { icon }).addTo(map);
          
          marker.bindPopup(`<b>${b.name}</b><br><small>${b.description || ''}</small>`, {
            className: 'building-popup',
            closeButton: false,
            offset: [0, -15]
          });



          buildingMarkers[b.id] = marker;
        }
      } else {
        if (marker) {
          map.removeLayer(marker);
          delete buildingMarkers[b.id];
        }
      }
    });
  }

  if (currentGameMode === 'golf' && currentGolfState) {
    const me = players[socket.id];
    if (me && me.ballLat !== undefined) {
      const distToBall = calculateDistance(myLat, myLng, me.ballLat, me.ballLng);
      const distToHole = calculateDistance(me.ballLat, me.ballLng, currentGolfState.holeLat, currentGolfState.holeLng);
      
      const distToBallDisplay = document.getElementById('dist-to-ball-display');
      const distToHoleDisplay = document.getElementById('dist-to-hole-display');
      if (distToBallDisplay) distToBallDisplay.textContent = `${Math.round(distToBall)}m`;
      if (distToHoleDisplay) distToHoleDisplay.textContent = `${Math.round(distToHole)}m`;

      if (distToBall <= REACH_DISTANCE) {
        proximityContainer.style.display = 'flex';
        proximityDot.className = 'proximity-pulse very-near';
        proximityText.textContent = 'Ball Reached!';
        swingWrapper.classList.add('active');
      } else {
        proximityContainer.style.display = 'flex';
        proximityDot.className = 'proximity-pulse near';
        proximityText.textContent = 'Walk to ball';
        swingWrapper.classList.remove('active');
      }
    }
  }
}

// Center map onto self
btnCenterGameMap.addEventListener('click', () => {
  if (map && myLat !== 0) {
    map.setView([myLat, myLng], 18);
  }
});

// --- Compass & Direction Helper Functions ---

function getCurrentMarkerSize() {
  if (!map) return 36;
  const currentZoom = map.getZoom();
  const baseZoom = 18;
  const scale = Math.max(0.5, Math.min(3.0, Math.pow(1.25, currentZoom - baseZoom)));
  return 36 * scale;
}

function getPlayerIconHtml(color, heading, size = 36) {
  const headingDeg = isNaN(heading) ? 0 : heading;
  const coneSize = size * 1.875; // reduced range by 25% (from 2.5 to 1.875)
  const dotSize = size * 0.42;
  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <!-- Blue field-of-view cone -->
      <div style="
        position: absolute;
        bottom: 50%;
        left: 50%;
        width: ${coneSize}px;
        height: ${coneSize}px;
        background: radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.9) 0%, rgba(99, 102, 241, 0.35) 60%, rgba(99, 102, 241, 0) 100%);
        clip-path: polygon(50% 100%, 20% 0%, 80% 0%);
        transform-origin: 50% 100%;
        transform: translateX(-50%) rotate(${headingDeg}deg);
        pointer-events: none;
      "></div>
      
      <!-- Outer border/circle path -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${size}px;
        height: ${size}px;
        border: 2px solid ${color};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.4;
        pointer-events: none;
      "></div>
      
      <!-- Center point -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${dotSize}px;
        height: ${dotSize}px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 6px ${color};
        pointer-events: none;
      "></div>
    </div>
  `;
}

function getScreenBorderIntersection(center, target, boundsWidth, boundsHeight, margin = 20) {
  const minX = margin;
  const maxX = boundsWidth - margin;
  const minY = 95; 
  const maxY = boundsHeight - 215; 

  const dx = target.x - center.x;
  const dy = target.y - center.y;

  let x = center.x;
  let y = center.y;

  if (dx === 0 && dy === 0) return { x, y, angle: 0 };

  const tCandidates = [];
  if (dx > 0) {
    tCandidates.push((maxX - center.x) / dx);
  } else if (dx < 0) {
    tCandidates.push((minX - center.x) / dx);
  }
  if (dy > 0) {
    tCandidates.push((maxY - center.y) / dy);
  } else if (dy < 0) {
    tCandidates.push((minY - center.y) / dy);
  }

  const t = Math.min(...tCandidates.filter(val => val >= 0));
  x = center.x + t * dx;
  y = center.y + t * dy;

  // Post-clamp Y coordinates to strictly prevent corner overlaps with the header & footer card
  y = Math.max(minY, Math.min(maxY, y));

  const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
  return { x, y, angle };
}

let lastIndicatorUpdate = 0;
function updateOffscreenIndicators(force = false) {
  const container = document.getElementById('offscreen-indicators');
  if (!container) return;

  const now = performance.now();
  if (!force && (now - lastIndicatorUpdate < 100)) {
    return; // Limit to 10 FPS to prevent Leaflet map freezes / layout thrashing
  }
  lastIndicatorUpdate = now;

  if (!map || currentGameMode !== 'golf' || !currentGolfState) {
    document.getElementById('indicator-self').style.display = 'none';
    document.getElementById('indicator-ball').style.display = 'none';
    document.getElementById('indicator-opp-ball').style.display = 'none';
    document.getElementById('indicator-hole').style.display = 'none';
    return;
  }

  const bounds = map.getBounds();
  const mapSize = map.getSize();
  const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);

  // Dynamic color coding classes setup
  const ballEl = document.getElementById('indicator-ball');
  const oppBallEl = document.getElementById('indicator-opp-ball');
  if (ballEl) {
    ballEl.className = 'offscreen-indicator ' + (isHost ? 'host-ball' : 'opp-ball');
  }
  if (oppBallEl) {
    oppBallEl.className = 'offscreen-indicator ' + (isHost ? 'opp-ball' : 'host-ball');
  }

  function checkAndPosition(lat, lng, elementId, onClickAction) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (lat === 0 || lng === 0 || lat === undefined || lng === undefined) {
      el.style.display = 'none';
      return;
    }

    const latlng = L.latLng(lat, lng);
    if (bounds.contains(latlng)) {
      el.style.display = 'none';
      return;
    }

    const targetPoint = map.latLngToContainerPoint(latlng);
    const { x, y, angle } = getScreenBorderIntersection(centerPoint, targetPoint, mapSize.x, mapSize.y, 25);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'flex';

    const arrow = el.querySelector('.indicator-arrow');
    if (arrow) {
      arrow.style.transform = `rotate(${angle}deg)`;
    }

    el.onclick = (e) => {
      e.stopPropagation();
      onClickAction();
    };
  }

  // Positioning targets
  checkAndPosition(myLat, myLng, 'indicator-self', () => {
    map.setView([myLat, myLng], 18);
  });

  const me = players[socket.id];
  if (me) {
    checkAndPosition(me.ballLat, me.ballLng, 'indicator-ball', () => {
      map.setView([me.ballLat, me.ballLng], 18);
    });
  } else {
    document.getElementById('indicator-ball').style.display = 'none';
  }

  const oppId = Object.keys(players).find(id => id !== socket.id);
  const opp = oppId ? players[oppId] : null;
  if (opp) {
    checkAndPosition(opp.ballLat, opp.ballLng, 'indicator-opp-ball', () => {
      map.setView([opp.ballLat, opp.ballLng], 18);
    });
  } else {
    document.getElementById('indicator-opp-ball').style.display = 'none';
  }

  checkAndPosition(currentGolfState.holeLat, currentGolfState.holeLng, 'indicator-hole', () => {
    map.setView([currentGolfState.holeLat, currentGolfState.holeLng], 18);
  });
}

/**
 * Converts bearing in degrees to an 8-point compass direction string.
 */
function getCompassDirection(heading) {
  if (isNaN(heading)) return 'N';
  const deg = ((heading % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Calculates bearing in degrees from point A to point B using GPS coordinates.
 */
function getHeadingFromCoords(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const dLon = toRad(lng2 - lng1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return ((brng + 360) % 360);
}

/**
 * Requests iOS DeviceOrientation permission and registers the orientation listener.
 * On Android / desktop, deviceorientation fires without permission.
 */
function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ requires explicit permission
    DeviceOrientationEvent.requestPermission()
      .then(state => {
        if (state === 'granted') {
          window.addEventListener('deviceorientation', onDeviceOrientation, true);
        }
      })
      .catch(console.error);
  } else {
    // Other browsers (Android, desktop) - just attach the listener
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
  }
}

function onDeviceOrientation(event) {
  // webkitCompassHeading is available on iOS (0 = North, clockwise)
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    myHeading = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    // Android: alpha is CCW from North, so we negate and normalise
    myHeading = ((360 - event.alpha) % 360);
  }

  // Update compass arrow rotation
  if (compassArrow) {
    compassArrow.style.transform = `rotate(${myHeading}deg)`;
  }

  // Update own marker heading immediately on the map for responsive rotation
  if (map && myMarker) {
    const size = getCurrentMarkerSize();
    const blueDotIcon = L.divIcon({
      className: 'custom-player-pin',
      html: getPlayerIconHtml('#6366f1', myHeading, size),
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
    myMarker.setIcon(blueDotIcon);
  }
}

function triggerBallSpin(strength) {
  // Set spin speed based on swing speed (slower spin bounds)
  ballSpinVelocity = Math.max(3, Math.min(20, strength * 0.8));
  
  if (!ballSpinFrame) {
    animateBallSpin();
  }
}

function animateBallSpin() {
  if (ballSpinVelocity < 0.1) {
    ballSpinVelocity = 0;
    ballSpinFrame = null;
    return;
  }

  ballSpinAngle = (ballSpinAngle + ballSpinVelocity) % 360;
  
  const myBallMarker = ballMarkers[socket.id];
  if (myBallMarker) {
    const el = myBallMarker.getElement();
    if (el) {
      const img = el.querySelector('.golf-ball-img');
      if (img) {
        img.style.transform = `rotate(${ballSpinAngle}deg)`;
      }
    }
  }

  // Exponential decay
  ballSpinVelocity *= 0.94;
  
  ballSpinFrame = requestAnimationFrame(animateBallSpin);
}

function startBallGlide(fromArray, toArray, distance = 0) {
  if (ballGlideAnimFrame) {
    cancelAnimationFrame(ballGlideAnimFrame);
  }

  // Scale flight time: base 350ms + 6ms per meter, clamped between 350ms and 1200ms
  ballGlideDurationMs = Math.max(350, Math.min(1200, 350 + distance * 6));

  ballGlideStartLat = fromArray[0];
  ballGlideStartLng = fromArray[1];
  ballGlideTargetLat = toArray[0];
  ballGlideTargetLng = toArray[1];
  ballGlideStartTime = performance.now();

  // Clear any existing active trail leftovers
  if (window._activeMainWedge && map) {
    map.removeLayer(window._activeMainWedge);
  }
  if (window._activeShadowWedge && map) {
    map.removeLayer(window._activeShadowWedge);
  }
  window._activeMainWedge = null;
  window._activeShadowWedge = null;

  animateBallGlide();
}

function animateBallGlide() {
  const now = performance.now();
  const elapsed = now - ballGlideStartTime;
  const t = Math.min(elapsed / ballGlideDurationMs, 1);
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in out cubic (ball position)

  // Calculate straight line vector and length
  const dLatTotal = ballGlideTargetLat - ballGlideStartLat;
  const dLngTotal = ballGlideTargetLng - ballGlideStartLng;
  const totalLen = Math.sqrt(dLatTotal * dLatTotal + dLngTotal * dLngTotal);

  let currentLat = ballGlideStartLat + dLatTotal * ease;
  let currentLng = ballGlideStartLng + dLngTotal * ease;

  // Tapering tail progress (starts moving after 25% progress, caps at 75% distance to leave lingering tail on landing)
  const tipT = Math.max(0, (t - 0.25) / 0.75);
  const tipEase = (tipT < 0.5 ? 4 * tipT * tipT * tipT : 1 - Math.pow(-2 * tipT + 2, 3) / 2) * 0.75;
  let tipLat = ballGlideStartLat + dLatTotal * tipEase;
  let tipLng = ballGlideStartLng + dLngTotal * tipEase;

  // Add subtle parabolic 2D map curvature offset if there is motion
  if (totalLen > 0) {
    const perLat = -dLngTotal / totalLen;
    const perLng = dLatTotal / totalLen;
    const maxOffset = totalLen * 0.12; // 12% maximum curve offset in the middle of flight

    // Parabolic arc multiplier: 4 * x * (1 - x)
    const curveScale = 4 * ease * (1 - ease);
    currentLat += perLat * maxOffset * curveScale;
    currentLng += perLng * maxOffset * curveScale;

    const tipCurveScale = 4 * tipEase * (1 - tipEase);
    tipLat += perLat * maxOffset * tipCurveScale;
    tipLng += perLng * maxOffset * tipCurveScale;
  }

  const currentPos = L.latLng(currentLat, currentLng);
  const tipPos = L.latLng(tipLat, tipLng);

  const myBallMarker = ballMarkers[socket.id];
  if (myBallMarker) {
    myBallMarker.setLatLng(currentPos);
  }

  // Dynamic opacity decay during the final 30% of flight to transition smoothly into landing
  let opacityScale = 1.0;
  if (t > 0.7) {
    opacityScale = 1.0 - ((t - 0.7) / 0.3) * 0.5; // fades down to 50% opacity by t=1.0
  }

  // Draw/update trail wedge dynamically along the parabolic curve
  if (totalLen > 0 && ease !== tipEase) {
    const leftPoints = [];
    const rightPoints = [];
    const steps = 6; // divide trail into 6 segments to curve smoothly

    const perLat = -dLngTotal / totalLen;
    const perLng = dLatTotal / totalLen;
    const maxOffset = totalLen * 0.12;
    const baseWidthDeg = 0.000045;

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const u = tipEase + ratio * (ease - tipEase);

      // Lat/Lng on the parabola at parameter u
      let lat = ballGlideStartLat + dLatTotal * u;
      let lng = ballGlideStartLng + dLngTotal * u;
      const curveScale = 4 * u * (1 - u);
      lat += perLat * maxOffset * curveScale;
      lng += perLng * maxOffset * curveScale;

      // Approximate local tangent to orient width perpendicular to local curve direction
      const nextU = Math.min(1, u + 0.01);
      let nextLat = ballGlideStartLat + dLatTotal * nextU;
      let nextLng = ballGlideStartLng + dLngTotal * nextU;
      const nextCurveScale = 4 * nextU * (1 - nextU);
      nextLat += perLat * maxOffset * nextCurveScale;
      nextLng += perLng * maxOffset * nextCurveScale;

      const tangentLat = nextLat - lat;
      const tangentLng = nextLng - lng;
      const tangentLen = Math.sqrt(tangentLat * tangentLat + tangentLng * tangentLng);

      let localPerLat = perLat;
      let localPerLng = perLng;
      if (tangentLen > 0) {
        localPerLat = -tangentLng / tangentLen;
        localPerLng = tangentLat / tangentLen;
      }

      // Taper width from 0 at the trailing tip (ratio=0) to baseWidthDeg at the ball (ratio=1)
      const currentWidth = baseWidthDeg * ratio;

      leftPoints.push(L.latLng(lat + localPerLat * currentWidth, lng + localPerLng * currentWidth));
      rightPoints.push(L.latLng(lat - localPerLat * currentWidth, lng - localPerLng * currentWidth));
    }

    // Combine left boundary (tip-to-base) and right boundary (base-to-tip)
    const polygonLatLngs = [...leftPoints, ...rightPoints.slice().reverse()];

    if (!window._activeMainWedge) {
      window._activeShadowWedge = L.polygon(polygonLatLngs, {
        stroke: false,
        fillColor: '#000000',
        fillOpacity: 0.25 * opacityScale,
        interactive: false
      }).addTo(map);

      window._activeMainWedge = L.polygon(polygonLatLngs, {
        stroke: false,
        fillColor: '#ffffff',
        fillOpacity: 0.4 * opacityScale,
        interactive: false
      }).addTo(map);
    } else {
      window._activeMainWedge.setLatLngs(polygonLatLngs);
      window._activeShadowWedge.setLatLngs(polygonLatLngs);
      
      window._activeMainWedge.setStyle({ fillOpacity: 0.4 * opacityScale });
      window._activeShadowWedge.setStyle({ fillOpacity: 0.25 * opacityScale });
    }
  }

  if (t < 1) {
    ballGlideAnimFrame = requestAnimationFrame(animateBallGlide);
  } else {
    // Complete! Trigger decay fade-out on the active wedges
    ballGlideAnimFrame = null;
    updateOffscreenIndicators(true);
    updateBuildingPins();
    const wedge = window._activeMainWedge;
    const shadow = window._activeShadowWedge;
    
    window._activeMainWedge = null;
    window._activeShadowWedge = null;

    if (wedge && shadow) {
      let fade = 0.5; // start at 50% opacity from the dynamic flight decay
      const fadeInterval = setInterval(() => {
        fade -= 0.08; // disappears completely in ~6 steps (~600ms)
        if (fade <= 0) {
          clearInterval(fadeInterval);
          if (map) {
            map.removeLayer(wedge);
            map.removeLayer(shadow);
          }
        } else {
          wedge.setStyle({
            fillOpacity: 0.4 * fade
          });
          shadow.setStyle({
            fillOpacity: 0.25 * fade
          });
        }
      }, 100);
    }
  }
}

// --- App Initialisation ---
window.addEventListener('DOMContentLoaded', () => {
  // Boot the global map immediately - visible behind the lobby panel
  initGlobalMap();

  // Load buildings from server and draw them on the map
  fetch('/api/buildings')
    .then(r => r.json())
    .then(data => {
      buildings = data;
      drawBuildingPins();
    })
    .catch(err => console.error('Failed to load buildings:', err));

  // Start tracking user location passively so the pin appears on the lobby map
  startTracking();

  // Dropdown change listener removed
});
