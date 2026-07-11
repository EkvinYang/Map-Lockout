/**
 * Campus Buildings and Powerups Configuration
 * Customize the coordinates (lat, lng) to match your own university campus!
 * 
 * Recommended building spacing is 50-150 meters for gameplay.
 * Capture radius (configured in server.js) defaults to 15-20 meters.
 */
const BUILDINGS = [
  {
    id: "richcraft",
    name: "Richcraft Hall",
    lat: 45.38263922186898,
    lng: -75.69619565975236,
    powerup: {
      type: "points",
      value: 150,
      description: "Gives +150 Points"
    }
  },
  {
    id: "hs",
    name: "Health Sciences Building",
    lat: 45.38351249177754,
    lng:  -75.6966545609963,
    powerup: {
      type: "points",
      value: 200,
      description: "Gives +200 Points"
    }
  },
];

module.exports = BUILDINGS;
