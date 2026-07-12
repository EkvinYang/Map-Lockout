/**
 * Commentary layer for phone golf.
 * Returns randomised canned lines for each game event.
 *
 * Usage:
 *   const { generateCommentary } = require('./commentary');
 *   const line = await generateCommentary('swing');
 */

const FALLBACKS = {
  swing: ["That's a swing!", 'Ball is airborne.', 'Nice contact.'],
  landing: ['Ball has landed.', "It's down.", 'Landed near the target.'],
  sink: ['Sunk it! Nice work.', 'That one is in the cup.', 'Hole complete!'],
  outOfBounds: ['Uh oh, out of bounds.', "That one's lost.", 'Ball went astray.'],
};

function pickFallback(eventType) {
  const options = FALLBACKS[eventType] || ['...'];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Return a short commentary line for a golf event.
 *
 * @param {'swing'|'landing'|'sink'|'outOfBounds'} eventType
 * @returns {Promise<string>} a short commentary line
 */
async function generateCommentary(eventType) {
  return pickFallback(eventType);
}

module.exports = {
  generateCommentary
};

// Quick manual test: `node commentary.js`
if (require.main === module) {
  (async () => {
    const line = await generateCommentary('landing');
    console.log(line);
  })();
}
