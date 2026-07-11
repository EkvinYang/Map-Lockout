/**
 * Kinetic Tracker - Core Application Logic
 * Monitors phone orientation (yaw) and 3D acceleration magnitude.
 */

// Application state
const state = {
    // Yaw (Orientation)
    yaw: 0,
    yawBaseline: 0, // calibration offset
    rawYaw: 0,
    
    // Acceleration (IMU)
    acceleration: { x: 0, y: 0, z: 0 },
    accelMagnitude: 0,
    accelerationSource: 'None',

    // Swing Test Configuration
    swingState: 'IDLE', // 'IDLE', 'WAITING', 'RECORDING'
    peakAccel: 0,
    peakYaw: 0,
    swingStartTime: 0,
    recordingDuration: 1000, // ms (1.0 second)
    swingThreshold: 10.0, // m/s^2 trigger threshold

    // UI Configuration
    maxAccelLimit: 15.0, // m/s^2 (approx 1.5g) for gauge limit
};

// Elements DOM
const elements = {
    permissionCard: document.getElementById('permission-card'),
    dashboard: document.getElementById('dashboard'),
    btnRequestPermission: document.getElementById('btn-request-permission'),
    
    // Yaw Elements
    yawValue: document.getElementById('yaw-value'),
    yawDirection: document.getElementById('yaw-direction'),
    compassRing: document.querySelector('.compass-ring'),
    btnZeroYaw: document.getElementById('btn-zero-yaw'),
    
    // Acceleration Elements
    accelValue: document.getElementById('accel-value'),
    accelBar: document.getElementById('accel-bar'),
    accelSource: document.getElementById('accel-source'),
    accelStatus: document.getElementById('accel-status'),

    // Swing Test Elements
    btnStartSwing: document.getElementById('btn-start-swing'),
    btnStopSwing: document.getElementById('btn-stop-swing'),
    swingStatus: document.getElementById('swing-status'),
    swingResults: document.getElementById('swing-results'),
    peakAccel: document.getElementById('peak-accel'),
    peakYaw: document.getElementById('peak-yaw'),
    peakDirection: document.getElementById('peak-direction'),
};

// High-pass filter state to isolate gravity from raw acceleration readings
let gravity = { x: 0, y: 0, z: 0 };
let gravityInitialized = false;

/**
 * Initialize application
 */
function init() {
    setupEventHandlers();
}

/**
 * Register button listeners
 */
function setupEventHandlers() {
    elements.btnRequestPermission.addEventListener('click', requestSensorPermissions);
    elements.btnZeroYaw.addEventListener('click', zeroYaw);
    elements.btnStartSwing.addEventListener('click', startSwingTest);
    elements.btnStopSwing.addEventListener('click', stopSwingTest);
}

/**
 * Requests device orientation & motion permissions concurrently
 * Required for iOS 13+ inside a click event handler
 */
async function requestSensorPermissions() {
    try {
        let orientationGranted = false;
        let motionGranted = false;

        const hasOrientationRequest = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
        const hasMotionRequest = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';

        if (hasOrientationRequest || hasMotionRequest) {
            // Request permissions in parallel within the same user-click event loop
            const requests = [];
            if (hasOrientationRequest) {
                requests.push(DeviceOrientationEvent.requestPermission());
            } else {
                requests.push(Promise.resolve('granted'));
            }

            if (hasMotionRequest) {
                requests.push(DeviceMotionEvent.requestPermission());
            } else {
                requests.push(Promise.resolve('granted'));
            }

            const results = await Promise.all(requests);
            orientationGranted = (results[0] === 'granted');
            motionGranted = (results[1] === 'granted');
        } else {
            // Android / Standard Browsers
            orientationGranted = true;
            motionGranted = true;
        }

        if (orientationGranted && motionGranted) {
            startSensorListeners();
            showDashboard();
        } else {
            alert(`Permission denied. Orientation: ${orientationGranted ? 'Allowed' : 'Denied'}, Motion: ${motionGranted ? 'Allowed' : 'Denied'}.`);
        }
    } catch (error) {
        console.error('Error requesting permissions:', error);
        startSensorListeners();
        showDashboard();
    }
}

/**
 * Toggle dashboard views
 */
function showDashboard() {
    elements.permissionCard.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
}

/**
 * Register sensor listeners
 */
function startSensorListeners() {
    window.addEventListener('deviceorientation', handleOrientation);
    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation);
    }
    window.addEventListener('devicemotion', handleMotion);
}

/**
 * Process orientation data (yaw)
 */
function handleOrientation(event) {
    let rawYaw = 0;
    
    // Check for iOS-specific absolute compass direction
    if (event.webkitCompassHeading !== undefined) {
        rawYaw = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
        rawYaw = (360 - event.alpha) % 360;
    } else {
        return;
    }

    state.rawYaw = rawYaw;
    state.yaw = (rawYaw - state.yawBaseline + 360) % 360;
    
    updateYawUI();
}

/**
 * Process motion/acceleration data
 */
function handleMotion(event) {
    const acc = event.acceleration; 
    const accGravity = event.accelerationIncludingGravity;
    
    let linearAcc = null;
    let source = "None";

    // 1. Try direct linear acceleration (excludes gravity)
    if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        linearAcc = { x: acc.x, y: acc.y, z: acc.z };
        source = "Direct";
    } 
    // 2. Fallback: Extract linear acceleration using a high-pass gravity filter
    else if (accGravity && accGravity.x !== null && accGravity.y !== null && accGravity.z !== null) {
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
        source = "Filtered";
    }

    if (!linearAcc) return;

    state.acceleration = linearAcc;
    state.accelerationSource = source;

    // Calculate the magnitude of the net acceleration in 3D:
    // |a| = sqrt(ax^2 + ay^2 + az^2)
    state.accelMagnitude = Math.sqrt(
        linearAcc.x ** 2 + 
        linearAcc.y ** 2 + 
        linearAcc.z ** 2
    );

    // Swing Test State Machine
    if (state.swingState === 'WAITING') {
        if (state.accelMagnitude > state.swingThreshold) {
            state.swingState = 'RECORDING';
            state.swingStartTime = performance.now();
            state.peakAccel = state.accelMagnitude;
            state.peakYaw = state.yaw;
            updateSwingUI();
        }
    } else if (state.swingState === 'RECORDING') {
        const elapsed = performance.now() - state.swingStartTime;
        if (elapsed < state.recordingDuration) {
            if (state.accelMagnitude > state.peakAccel) {
                state.peakAccel = state.accelMagnitude;
                state.peakYaw = state.yaw;
            }
        } else {
            // Finished 0.5s recording
            state.swingState = 'IDLE';
            displaySwingResults();
        }
    }
    
    updateAccelerationUI();
}

/**
 * Calibrate yaw baseline
 */
function zeroYaw() {
    state.yawBaseline = state.rawYaw;
    state.yaw = 0;
    updateYawUI();
}

/**
 * Update UI for Orientation
 */
function updateYawUI() {
    elements.yawValue.textContent = state.yaw.toFixed(1);
    elements.compassRing.style.transform = `rotate(${-state.yaw}deg)`;
    elements.yawDirection.textContent = getHeadingCardinal(state.yaw);
}

/**
 * Update UI for Acceleration
 */
function updateAccelerationUI() {
    elements.accelValue.textContent = state.accelMagnitude.toFixed(3);
    elements.accelSource.textContent = state.accelerationSource;
    elements.accelStatus.textContent = "Active";
    elements.accelStatus.style.color = "var(--color-cyan)";
    elements.accelStatus.style.fontWeight = "bold";

    // Update flat rectangular progress bar width percentage
    const ratio = Math.min(state.accelMagnitude / state.maxAccelLimit, 1.0);
    elements.accelBar.style.width = (ratio * 100) + "%";
}

/**
 * Convert degree heading to cardinal labels
 */
function getHeadingCardinal(deg) {
    const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(deg / 22.5) % 16;
    return sectors[idx];
}

/**
 * Starts the swing test waiting phase
 */
function startSwingTest() {
    state.swingState = 'WAITING';
    state.peakAccel = 0;
    state.peakYaw = 0;

    // Toggle button visibilities
    elements.swingResults.classList.add('hidden');
    elements.btnStartSwing.classList.add('hidden');
    elements.btnStopSwing.classList.remove('hidden');

    updateSwingUI();
}

/**
 * Aborts the swing test wait or recording phase
 */
function stopSwingTest() {
    state.swingState = 'IDLE';

    // Toggle button visibilities
    elements.btnStartSwing.classList.remove('hidden');
    elements.btnStopSwing.classList.add('hidden');

    updateSwingUI();
}

/**
 * Updates status badge for swing state
 */
function updateSwingUI() {
    if (!elements.swingStatus) return;

    if (state.swingState === 'IDLE') {
        elements.swingStatus.textContent = 'Idle';
        elements.swingStatus.className = 'badge';
    } else if (state.swingState === 'WAITING') {
        elements.swingStatus.textContent = 'Waiting...';
        elements.swingStatus.className = 'badge badge-purple';
    } else if (state.swingState === 'RECORDING') {
        elements.swingStatus.textContent = 'Recording!';
        elements.swingStatus.className = 'badge badge-cyan';
    }
}

/**
 * Displays peak swing metrics at the end of recording
 */
function displaySwingResults() {
    // Subtract 90 degrees mod 360 from the peak orientation angle
    const adjustedYaw = (state.peakYaw - 90 + 360) % 360;

    elements.peakAccel.textContent = state.peakAccel.toFixed(3);
    elements.peakYaw.textContent = adjustedYaw.toFixed(1);
    elements.peakDirection.textContent = `(${getHeadingCardinal(adjustedYaw)})`;

    elements.swingResults.classList.remove('hidden');
    elements.btnStartSwing.classList.remove('hidden');
    elements.btnStopSwing.classList.add('hidden');

    updateSwingUI();
}

// Start execution
window.addEventListener('DOMContentLoaded', init);
