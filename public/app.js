// Socket connection
const socket = io();

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
let golfBallMarker = null;
let golfHoleMarker = null; // Used to calculate dt between updates
let markerAnimFrame = null; // requestAnimationFrame handle for own marker
let targetLat = 0; // Lerp target latitude
let targetLng = 0; // Lerp target longitude
let animStartLat = 0; // Lerp start latitude
let animStartLng = 0; // Lerp start longitude
let animStartTime = 0; // Lerp animation start time
const MARKER_GLIDE_MS = 800; // Duration markers take to glide between positions

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
let attemptedCaptures = new Set();
const scoreMeMini = document.getElementById('score-me-mini');
const scoreOppMini = document.getElementById('score-opp-mini');
const hudScoreDividerMini = document.getElementById('hud-score-divider-mini');
// Conquest indicators removed
const hudGolfScoreLeft = document.getElementById('hud-golf-score-left');
const golfSwingsDisplay = document.getElementById('golf-swings');
const swingWrapper = document.getElementById('swing-wrapper');
const btnSwingAction = document.getElementById('btn-swing-action');

// IMU Swing Variables
let swingState = 'IDLE'; // 'IDLE', 'WAITING', 'RECORDING'
let peakAccel = 0;
let peakYaw = 0;
let swingStartTime = 0;
const SWING_RECORDING_MS = 1000;
const SWING_ACCEL_THRESHOLD = 10.0;
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

  banner.innerHTML = `<span>${emoji}</span> <span>${message}</span>`;
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
  lobbyCode = '';
  dialogOverlay.style.display = 'none';
  // Reset local building capture statuses immediately
  if (buildings) {
    buildings.forEach(b => b.capturedBy = null);
    updateBuildingPins();
  }
  // Clear capture attempts
  attemptedCaptures.clear();
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

  document.body.classList.add('golf-mode');
  const meId = socket.id;
  golfSwingsDisplay.textContent = players[meId]?.swings || 0;

  showScreen('game');
  updateBuildingPins();
  // Reset capture attempts
  attemptedCaptures.clear();
  // Ensure location tracking is active
  startTracking();
});

socket.on('golf-state-update', (data) => {
  currentGolfState = data.golfState;
  const { playerId, swings } = data;
  if (playerId === socket.id) {
    golfSwingsDisplay.textContent = swings;
    swingWrapper.classList.remove('active');
  }
  
  if (golfBallMarker && map) {
    const newPos = [currentGolfState.ballLat, currentGolfState.ballLng];
    // Simple transition animation by moving it smoothly 
    // For simplicity, just setLatLng with transition (Leaflet handles it instantly, but we can do a micro-animation if needed, or just set it)
    golfBallMarker.setLatLng(newPos);
    showEventBanner(`Golf ball hit!`, 'system');
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
    btnSwingAction.innerHTML = 'WAITING FOR SWING...';
    btnSwingAction.style.background = '#6b21a8'; // Purple
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
      btnSwingAction.innerHTML = 'RECORDING!';
      btnSwingAction.style.background = '#06b6d4'; // Cyan
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
      btnSwingAction.innerHTML = '🏌️‍♂️ SWING';
      btnSwingAction.style.background = '';
      btnSwingAction.style.pointerEvents = 'auto';
      
      const distance = peakAccel * 1.0;
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

  if (data.timeLeft <= 15) {
    gameTimer.style.color = '#ef4444';
    gameTimer.style.animation = 'pulse 1s infinite';
  } else {
    gameTimer.style.color = '';
    gameTimer.style.animation = '';
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
  const { players: finalPlayers, winnerId, reason } = data;
  const me = finalPlayers[socket.id];
  const oppId = Object.keys(finalPlayers).find(id => id !== socket.id);
  const opp = oppId ? finalPlayers[oppId] : null;
  const isSolo = Object.keys(finalPlayers).length === 1;

  finalScoreMe.textContent = `${me ? me.swings : 0} Swings`;
  dialogSubTitle.textContent = `Reason: ${reason}`;

  const dialogScoreBoxDivs = document.querySelectorAll('.dialog-score-box > div');
  if (isSolo) {
    if (dialogScoreBoxDivs[1]) dialogScoreBoxDivs[1].style.display = 'none';
    
    dialogHeaderTitle.textContent = "⛳ HOLE IN!";
    dialogHeaderTitle.className = "dialog-title dialog-winner";
    dialogResultText.textContent = `You finished the hole in ${me ? me.swings : 0} swings!`;
  } else {
    if (dialogScoreBoxDivs[1]) {
      dialogScoreBoxDivs[1].style.display = 'block';
      finalScoreOpp.textContent = `${opp ? opp.swings : 0} Swings`;
    }
    
    if (winnerId === 'tie') {
      dialogHeaderTitle.textContent = "IT'S A DRAW!";
      dialogHeaderTitle.className = "dialog-title";
      dialogResultText.textContent = "A neck-and-neck match! You finished with the same number of swings.";
    } else if (winnerId === socket.id) {
      dialogHeaderTitle.textContent = "🏆 VICTORY IS YOURS!";
      dialogHeaderTitle.className = "dialog-title dialog-winner";
      dialogResultText.textContent = "Fantastic play! You completed the course in fewer swings.";
    } else {
      dialogHeaderTitle.textContent = "🥈 OPPONENT WINS";
      dialogHeaderTitle.className = "dialog-title dialog-loser";
      dialogResultText.textContent = "Almost! Your opponent completed the course in fewer swings.";
    }
  }

  dialogOverlay.style.display = 'flex';
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
}

function drawBuildingPins() {
  // Clear any existing pins and pulse markers
  for (const id in buildingMarkers) {
    map.removeLayer(buildingMarkers[id]);
  }
  if (window._buildingPulseMarkers) {
    window._buildingPulseMarkers.forEach(m => map.removeLayer(m));
  }
  buildingMarkers = {};
  window._buildingPulseMarkers = [];

  buildings.forEach(b => {
    const pinIcon = L.divIcon({
      className: 'map-pin-container',
      html: getBuildingPinHtml('#9ca3af', b.name), // Grey pin (uncaptured)
      iconSize: [30, 42],
      iconAnchor: [15, 42], // Bottom center of the pin
      popupAnchor: [0, -44]
    });

    const marker = L.marker([b.lat, b.lng], { icon: pinIcon }).addTo(map);

    // Click tooltip with powerup info
    marker.bindPopup(`<b>${b.name}</b><br><small>${b.powerup.description}</small>`, {
      className: 'building-popup',
      closeButton: false,
      offset: [0, -30]
    });

    // Subtle pulse ring beneath pin
    const pulseDiv = L.divIcon({
      className: 'pulse-container',
      html: `<div class="pulse-ring" style="border-color: #9ca3af"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    const pulseMarker = L.marker([b.lat, b.lng], { icon: pulseDiv }).addTo(map);
    window._buildingPulseMarkers.push(pulseMarker);

    buildingMarkers[b.id] = marker;
  });
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
    // Hide standard buildings
    buildings.forEach(b => {
      const marker = buildingMarkers[b.id];
      if (marker) marker.setOpacity(0);
      if (window._buildingPulseMarkers) {
        window._buildingPulseMarkers.forEach(m => map.removeLayer(m));
      }
    });
    
    // Draw Golf Pins
    if (golfBallMarker) { map.removeLayer(golfBallMarker); }
    if (golfHoleMarker) { map.removeLayer(golfHoleMarker); }
    
    const holeIcon = L.divIcon({
      className: 'map-pin-container',
      html: getBuildingPinHtml('#10b981', `⛳ Hole: ${currentGolfState.holeName || 'Target'}`),
      iconSize: [30, 42], iconAnchor: [15, 42]
    });
    golfHoleMarker = L.marker([currentGolfState.holeLat, currentGolfState.holeLng], { icon: holeIcon }).addTo(map);

    const ballIcon = L.divIcon({
      className: 'map-pin-container',
      html: getBuildingPinHtml('#ffffff', '⚪ Ball'),
      iconSize: [30, 42], iconAnchor: [15, 42]
    });
    golfBallMarker = L.marker([currentGolfState.ballLat, currentGolfState.ballLng], { icon: ballIcon }).addTo(map);
    return;
  }

  buildings.forEach(b => {
    const marker = buildingMarkers[b.id];
    if (!marker) return;

    let color, name;
    const isSolo = Object.keys(players).length <= 1;
    if (b.capturedBy) {
      if (isSolo || b.capturedBy === socket.id) {
        color = '#ef4444'; // Red — captured by me (or solo)
        name = `✅ ${b.name}`;
      } else {
        color = '#3b82f6'; // Blue — captured by opponent
        name = `🔒 ${b.name}`;
      }
    } else {
      color = '#9ca3af'; // Grey — uncaptured
      name = b.name;
    }

    const pinIcon = L.divIcon({
      className: 'map-pin-container',
      html: getBuildingPinHtml(color, name),
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -44]
    });
    marker.setIcon(pinIcon);
  });
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
        const dirString = getCompassDirection(myHeading);
        const blueDotIcon = L.divIcon({
          className: 'custom-player-pin',
          html: getPlayerIconHtml('#6366f1', myHeading),
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        if (!myMarker) {
          map.setView([myLat, myLng], 18);
          myMarker = L.marker([myLat, myLng], { icon: blueDotIcon }).addTo(map);
          myMarker.bindTooltip(`You (Facing: ${dirString})`, { permanent: true, direction: 'top', className: 'hud-tooltip' });
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
          myMarker.setTooltipContent(`You (Facing: ${dirString})`);
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
  }

  if (t < 1) {
    markerAnimFrame = requestAnimationFrame(animateMyMarker);
  } else {
    markerAnimFrame = null;
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
  }
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (markerAnimFrame) { cancelAnimationFrame(markerAnimFrame); markerAnimFrame = null; }
  if (oppAnimFrame) { cancelAnimationFrame(oppAnimFrame); oppAnimFrame = null; }
  myMarker = null;
  myAccuracyCircle = null;
  opponentMarker = null;
  buildingMarkers = {};
  if (golfBallMarker) { map.removeLayer(golfBallMarker); golfBallMarker = null; }
  if (golfHoleMarker) { map.removeLayer(golfHoleMarker); golfHoleMarker = null; }
  smoothLat = null;
  smoothLng = null;
  lastGpsTimestamp = null;
}

// Check proximity to buildings
function checkProximities() {
  const proximityLabel = document.getElementById('proximity-label');

  if (currentGameMode === 'golf' && currentGolfState) {
    const distToBall = calculateDistance(myLat, myLng, currentGolfState.ballLat, currentGolfState.ballLng);
    const distToHole = calculateDistance(currentGolfState.ballLat, currentGolfState.ballLng, currentGolfState.holeLat, currentGolfState.holeLng);
    
    const distToBallDisplay = document.getElementById('dist-to-ball-display');
    const distToHoleDisplay = document.getElementById('dist-to-hole-display');
    if (distToBallDisplay) distToBallDisplay.textContent = `${Math.round(distToBall)}m`;
    if (distToHoleDisplay) distToHoleDisplay.textContent = `${Math.round(distToHole)}m`;

    if (distToBall <= 50) {
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
    return;
  }

  swingWrapper.classList.remove('active');
  if (proximityLabel) proximityLabel.textContent = 'Nearest Building';
  if (buildings.length === 0) return;

  let closestDist = Infinity;
  let closestBuilding = null;

  buildings.forEach(b => {
    if (b.capturedBy) return; // Skip already captured buildings
    const dist = calculateDistance(myLat, myLng, b.lat, b.lng);
    if (dist < closestDist) {
      closestDist = dist;
      closestBuilding = b;
    }
  });

  nearestBuilding = closestBuilding;

  if (nearestBuilding) {
    nearestBuildingName.textContent = `${nearestBuilding.name} (${Math.round(closestDist)}m)`;

    // Proximity logic
    if (closestDist <= CAPTURE_RADIUS_METERS) {
      proximityContainer.style.display = 'flex';
      proximityDot.className = 'proximity-pulse very-near';
      proximityText.textContent = 'Reached!';
      
      // Auto-trigger capture immediately
      if (!attemptedCaptures.has(nearestBuilding.id)) {
        attemptedCaptures.add(nearestBuilding.id);
        socket.emit('capture-powerup', { buildingId: nearestBuilding.id });
      }
    } else {
      if (closestDist <= 50) {
        proximityContainer.style.display = 'flex';
        proximityDot.className = 'proximity-pulse near';
        proximityText.textContent = 'Approaching';
      } else {
        proximityContainer.style.display = 'none';
      }
    }
  } else {
    nearestBuildingName.textContent = 'None Nearby';
    proximityContainer.style.display = 'none';
  }
}

// Center map onto self
btnCenterGameMap.addEventListener('click', () => {
  if (map && myLat !== 0) {
    map.setView([myLat, myLng], 18);
  }
});

// --- Compass & Direction Helper Functions ---

/**
 * Returns an HTML string for a player marker with a direction arrow.
 * @param {string} color - Hex color for the dot (e.g. '#6366f1')
 * @param {number} heading - Degrees from North (0-360)
 */
function getPlayerIconHtml(color, heading) {
  const headingDeg = isNaN(heading) ? 0 : heading;
  // The outer div contains a dot and an arrow triangle that rotates around the dot.
  return `
    <div style="position: relative; width: 20px; height: 20px;">
      <!-- Direction arrow -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 10px solid ${color};
        transform-origin: 0px 6px;
        transform: translate(-50%, -100%) translate(0px, -4px) rotate(${headingDeg}deg);
        opacity: 0.9;
      "></div>
      <!-- Center dot -->
      <div style="
        position: absolute;
        top: 50%; left: 50%;
        width: 14px; height: 14px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px ${color}, 0 0 20px ${color}55;
        transform: translate(-50%, -50%);
      "></div>
    </div>
  `;
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

  // Update own marker heading immediately on the map for responsive rotation
  if (map && myMarker) {
    const dirString = getCompassDirection(myHeading);
    const blueDotIcon = L.divIcon({
      className: 'custom-player-pin',
      html: getPlayerIconHtml('#6366f1', myHeading),
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    myMarker.setIcon(blueDotIcon);
    myMarker.setTooltipContent(`You (Facing: ${dirString})`);
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
