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
    description: "Journalism and International Affairs building.",
    lat: 45.38263922186898,
    lng: -75.69619565975236,
    powerup: {
      type: "points",
      value: 1,
      description: "Gives +1 Points"
    }
  },
  {
    id: "alumni-park",
    name: "Alumni Park",
    description: "Scenic campus park by the Rideau River.",
    lat: 45.38283623380293,
    lng: -75.69485785509715,
    powerup: {
      type: "points",
      value: 10,
      description: "Gives +10 Points"
    }
  },
  {
    id: "campus-store",
    name: "Campus Store",
    description: "Carleton University bookstore and apparel shop.",
    lat: 45.383395264680864,
    lng: -75.6974631863349,
    powerup: {
      type: "points",
      value: 100,
      description: "Gives +100 Points"
    }
  },
];

module.exports = BUILDINGS;
