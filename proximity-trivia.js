/**
 * Proximity-based trivia trigger for phone golf.
 * Checks the player's live GPS position against known building locations.
 * When they walk within range of a building, its trivia fires once
 * (won't spam the same fact every GPS tick while they're standing there).
 *
 * Requires: building data merged from two sources, keyed by Building Code:
 *   - RoboRaccoon's coordinates spreadsheet (lat/lng per building)
 *   - The trivia text (Carleton_Building_Trivia.xlsx)
 *
 * Usage (wire into your existing GPS update handler):
 *   const { checkProximityTrivia } = require('./proximity-trivia');
 *   const trivia = checkProximityTrivia(playerLat, playerLng, buildings, seenSet);
 *   if (trivia) socket.emit('trivia', trivia);
 */

const TRIGGER_RADIUS_METERS = 30; // how close the player needs to be
const EARTH_RADIUS_METERS = 6371000;

/**
 * Distance between two lat/lng points in meters (Haversine formula).
 */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Check the player's current position against all buildings and return
 * trivia for the first one they're newly within range of.
 *
 * @param {number} playerLat
 * @param {number} playerLng
 * @param {Array<{code: string, name: string, lat: number, lng: number, trivia: string}>} buildings
 * @param {Set<string>} seenCodes - building codes already triggered this game (mutated in place)
 * @returns {{code: string, name: string, trivia: string} | null}
 */
function checkProximityTrivia(playerLat, playerLng, buildings, seenCodes) {
  for (const building of buildings) {
    if (seenCodes.has(building.code)) continue; // already shown this one

    const dist = distanceMeters(playerLat, playerLng, building.lat, building.lng);
    if (dist <= TRIGGER_RADIUS_METERS) {
      seenCodes.add(building.code); // mark as seen so it doesn't repeat
      return {
        code: building.code,
        name: building.name,
        trivia: building.trivia,
        distance: Math.round(dist),
      };
    }
  }
  return null;
}

module.exports = { checkProximityTrivia, distanceMeters, TRIGGER_RADIUS_METERS };

// Quick manual test: node proximity-trivia.js
if (require.main === module) {
  const testBuildings = [
    { code: 'DT', name: 'Dunton Tower', lat: 45.38658, lng: -75.69707, trivia: "Carleton's tallest building, 22 storeys." },
  ];
  const seen = new Set();

  // Simulate player standing right next to Dunton Tower
  const result = checkProximityTrivia(45.38660, -75.69709, testBuildings, seen);
  console.log('First check (should trigger):', result);

  // Simulate the same check again a second later (should NOT re-trigger)
  const result2 = checkProximityTrivia(45.38660, -75.69709, testBuildings, seen);
  console.log('Second check (should be null):', result2);
}
