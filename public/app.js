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
const CAPTURE_RADIUS_METERS = 20; // Player must be within 20m of building
let myHeading = 0;
let prevLat = null;
let prevLng = null;

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
const captureWrapper = document.getElementById('capture-wrapper');
const btnCaptureAction = document.getElementById('btn-capture-action');

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

  if (screenId === 'lobby') lobbyScreen.classList.add('active');
  if (screenId === 'waiting') waitingScreen.classList.add('active');
  if (screenId === 'game') gameScreen.classList.add('active');

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
btnCreateLobby.addEventListener('click', () => {
  requestOrientationPermission();
  myUsername = getNickname();
  socket.emit('create-lobby', { username: myUsername });
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
  socket.emit('create-test-lobby', { username: myUsername });
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
  showScreen('lobby');
});

// --- Socket Listeners ---
socket.on('lobby-created', (data) => {
  lobbyCode = data.code;
  isHost = true;
  roomCodeDisplay.textContent = lobbyCode;
  // If 'game-started' fires on the same connection immediately (solo test),
  // skip going to the waiting room. We check inside game-started.
  showScreen('waiting');
  updateWaitingRoomUI(data.players);
});

socket.on('lobby-joined', (data) => {
  lobbyCode = data.code;
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

  // Hide opponent score column in HUD if solo mode
  const isSolo = Object.keys(players).length === 1;
  const oppScoreItem = document.querySelector('.score-panel .score-item:nth-child(3)');
  const scoreDivider = document.querySelector('.score-panel .score-divider');
  if (oppScoreItem && scoreDivider) {
    if (isSolo) {
      oppScoreItem.style.display = 'none';
      scoreDivider.style.display = 'none';
    } else {
      oppScoreItem.style.display = 'flex';
      scoreDivider.style.display = 'block';
    }
  }

  showScreen('game');
  updateBuildingPins();
  // Ensure location tracking is active
  startTracking();
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
    } else {
      opponentMarker.setLatLng([lat, lng]);
      opponentMarker.setIcon(pinkDotIcon);
      opponentMarker.setTooltipContent(`${oppUsername} (Facing: ${oppDir})`);
    }
  }
});

// Score & building updates from server
socket.on('game-state-update', (data) => {
  const { players: updatedPlayers, buildings: updatedBuildings, captureEvent } = data;

  // Sync local state
  buildings = updatedBuildings;

  // Update Scores
  const me = updatedPlayers[socket.id];
  const oppId = Object.keys(updatedPlayers).find(id => id !== socket.id);
  const opp = oppId ? updatedPlayers[oppId] : null;

  scoreMe.textContent = Math.round(me ? me.score : 0);
  scoreOpp.textContent = opp ? Math.round(opp.score) : 0;

  // Update building pin styles
  updateBuildingPins();

  // Display capture popups/feed if matching event
  if (captureEvent) {
    const isMe = captureEvent.playerId === socket.id;
    const name = captureEvent.buildingName;
    const desc = captureEvent.powerupDesc;

    if (isMe) {
      showEventBanner(`You captured ${name}! ${desc}`, 'me');
    } else {
      showEventBanner(`${captureEvent.username} captured ${name}! LOCKED OUT!`, 'opponent');
    }
  }
});

socket.on('game-over', (data) => {
  const { players: finalPlayers, winnerId, reason } = data;
  const me = finalPlayers[socket.id];
  const oppId = Object.keys(finalPlayers).find(id => id !== socket.id);
  const opp = oppId ? finalPlayers[oppId] : null;

  finalScoreMe.textContent = Math.round(me ? me.score : 0);
  finalScoreOpp.textContent = opp ? Math.round(opp.score) : 0;

  dialogSubTitle.textContent = `Reason: ${reason}`;

  const isSolo = Object.keys(finalPlayers).length === 1;
  const dialogScoreBoxDivs = document.querySelectorAll('.dialog-score-box > div');
  if (isSolo) {
    if (dialogScoreBoxDivs[1]) dialogScoreBoxDivs[1].style.display = 'none';
  } else {
    if (dialogScoreBoxDivs[1]) dialogScoreBoxDivs[1].style.display = 'block';
  }

  if (winnerId === 'tie') {
    dialogHeaderTitle.textContent = "IT'S A DRAW!";
    dialogHeaderTitle.className = "dialog-title";
    dialogResultText.textContent = "What a neck-and-neck race across campus! Good game!";
  } else if (winnerId === socket.id) {
    dialogHeaderTitle.textContent = "🏆 VICTORY IS YOURS!";
    dialogHeaderTitle.className = "dialog-title dialog-winner";
    dialogResultText.textContent = isSolo ? `Great training session! You captured all building powerups!` : `Incredible speed! You dominated the campus and claimed the crown.`;
  } else {
    dialogHeaderTitle.textContent = "🥈 OPPONENT WINS";
    dialogHeaderTitle.className = "dialog-title dialog-loser";
    dialogResultText.textContent = `Almost! Your opponent captured the critical buildings first. Better luck next time!`;
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
    maxZoom: 20
  }).setView([defaultLat, defaultLng], 17);

  // Styled Dark Matter Map
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd'
  }).addTo(map);
}

function drawBuildingPins() {
  // Clear any existing pins
  for (const id in buildingMarkers) {
    map.removeLayer(buildingMarkers[id]);
  }
  buildingMarkers = {};

  buildings.forEach(b => {
    // CircleMarker coordinates
    const marker = L.circleMarker([b.lat, b.lng], {
      radius: 12,
      fillColor: '#fbbf24', // Gold
      color: '#ffffff',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.6
    }).addTo(map);

    // Dynamic Pulsing rings for buildings
    const pulseDiv = L.divIcon({
      className: 'pulse-container',
      html: `<div class="pulse-ring" style="border-color: #fbbf24"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker([b.lat, b.lng], { icon: pulseDiv }).addTo(map);

    marker.bindTooltip(`🎁 ${b.name}<br><small>${b.powerup.description}</small>`, {
      permanent: false,
      direction: 'top'
    });

    buildingMarkers[b.id] = marker;
  });
}

function updateBuildingPins() {
  buildings.forEach(b => {
    const marker = buildingMarkers[b.id];
    if (!marker) return;

    if (b.capturedBy) {
      if (b.capturedBy === socket.id) {
        marker.setStyle({ fillColor: '#6366f1', color: '#818cf8', fillOpacity: 0.85 }); // Captured by me (Blue)
        marker.setTooltipContent(`✅ ${b.name} (Captured by You)`);
      } else {
        marker.setStyle({ fillColor: '#ec4899', color: '#f472b6', fillOpacity: 0.85 }); // Captured by opponent (Pink)
        marker.setTooltipContent(`🔒 ${b.name} (Locked Out)`);
      }
    } else {
      marker.setStyle({ fillColor: '#fbbf24', color: '#fbbf24', fillOpacity: 0.6 }); // Uncaptured (Gold)
      marker.setTooltipContent(`🎁 ${b.name}<br><small>${b.powerup.description}</small>`);
    }
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
      myLat = position.coords.latitude;
      myLng = position.coords.longitude;
      myAccuracy = position.coords.accuracy;

      // Update UI (only if game screen is active)
      if (gpsAccuracyDisplay) {
        gpsAccuracyDisplay.textContent = `${myAccuracy.toFixed(1)}m`;
        gpsAccuracyDisplay.style.color = myAccuracy > 25 ? '#ef4444' : '';
      }

      // Handle Heading
      if (position.coords.heading !== null && position.coords.heading !== undefined && !isNaN(position.coords.heading)) {
        myHeading = position.coords.heading;
      } else if (prevLat !== null && prevLng !== null) {
        const dist = calculateDistance(prevLat, prevLng, myLat, myLng);
        if (dist > 1.5) { // Only calculate heading if moved more than 1.5 meters to avoid compass jitter
          myHeading = getHeadingFromCoords(prevLat, prevLng, myLat, myLng);
        }
      }

      prevLat = myLat;
      prevLng = myLng;

      // Update own marker on Leaflet
      if (map) {
        const coords = [myLat, myLng];
        const dirString = getCompassDirection(myHeading);
        const blueDotIcon = L.divIcon({
          className: 'custom-player-pin',
          html: getPlayerIconHtml('#6366f1', myHeading),
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        if (!myMarker) {
          map.setView(coords, 18); // Focus map first time
          myMarker = L.marker(coords, { icon: blueDotIcon }).addTo(map);
          myMarker.bindTooltip(`You (Facing: ${dirString})`, { permanent: true, direction: 'top', className: 'hud-tooltip' });

          myAccuracyCircle = L.circle(coords, {
            radius: myAccuracy,
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.1,
            weight: 1
          }).addTo(map);
        } else {
          myMarker.setLatLng(coords);
          myMarker.setIcon(blueDotIcon);
          myMarker.setTooltipContent(`You (Facing: ${dirString})`);

          myAccuracyCircle.setLatLng(coords);
          myAccuracyCircle.setRadius(myAccuracy);
        }
      }

      // Emit location to socket room (only if we are in an active game)
      if (lobbyCode) {
        socket.emit('player-location', { lat: myLat, lng: myLng, accuracy: myAccuracy, heading: myHeading });
        // Calculate proximities & look for nearest building
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

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  myMarker = null;
  myAccuracyCircle = null;
  opponentMarker = null;
  buildingMarkers = {};
}

// Check proximity to buildings
function checkProximities() {
  if (buildings.length === 0) return;

  let closestDist = Infinity;
  let closestBuilding = null;

  buildings.forEach(b => {
    const dist = calculateDistance(myLat, myLng, b.lat, b.lng);
    if (dist < closestDist) {
      closestDist = dist;
      closestBuilding = b;
    }
  });

  nearestBuilding = closestBuilding;

  if (nearestBuilding) {
    const isCaptured = nearestBuilding.capturedBy;
    nearestBuildingName.textContent = `${nearestBuilding.name} (${Math.round(closestDist)}m)`;

    // Proximity logic
    if (closestDist <= CAPTURE_RADIUS_METERS) {
      proximityContainer.style.display = 'flex';

      if (isCaptured) {
        proximityDot.className = 'proximity-pulse';
        proximityText.textContent = 'Captured';
        captureWrapper.classList.remove('active');
      } else {
        proximityDot.className = 'proximity-pulse very-near';
        proximityText.textContent = 'In Range!';
        captureWrapper.classList.add('active');
      }
    } else {
      if (closestDist <= 50) {
        proximityContainer.style.display = 'flex';
        proximityDot.className = 'proximity-pulse near';
        proximityText.textContent = 'Approaching';
      } else {
        proximityContainer.style.display = 'none';
      }
      captureWrapper.classList.remove('active');
    }
  } else {
    nearestBuildingName.textContent = 'None Nearby';
    proximityContainer.style.display = 'none';
    captureWrapper.classList.remove('active');
  }
}

// Trigger powerup capture action
btnCaptureAction.addEventListener('click', () => {
  if (nearestBuilding && !nearestBuilding.capturedBy) {
    socket.emit('capture-powerup', { buildingId: nearestBuilding.id });
    captureWrapper.classList.remove('active'); // Hide button instantly to prevent double-taps
  }
});

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
});
