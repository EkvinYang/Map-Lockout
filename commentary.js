/**
 * AI commentary layer for phone golf.
 * Fires on game events (swing, landing, sink) and generates a short
 * sportscaster-style line using Gemini, using real game context
 * (building name, swing count, distance to hole).
 *
 * Setup:
 *   npm install @google/genai
 *   export GEMINI_API_KEY="your-key-here"
 *
 * Usage (wire into your socket event handlers):
 *   const { generateCommentary } = require('./commentary');
 *   const line = await generateCommentary('swing', { buildingName: 'Richcraft Hall', swingCount: 3 });
 *   socket.emit('commentary', { text: line });
 */

import { GoogleGenAI } from '@google/genai';

// Alias that always points to Google's current recommended fast model
// (Gemini 3.5 Flash as of July 2026) so this doesn't break if the model
// lineup changes mid-weekend.
const MODEL = 'gemini-flash-latest';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Canned fallback lines per event, used if the API call fails or times out.
// Keeps the demo running smoothly even on a bad connection.
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
 * Generate a short live-commentary line for a golf event.
 *
 * @param {'swing'|'landing'|'sink'|'outOfBounds'} eventType
 * @param {object} context
 * @param {string} [context.buildingName] - nearby landmark/building, e.g. "Richcraft Hall"
 * @param {number} [context.swingCount] - swings taken so far this hole
 * @param {number} [context.distanceToHole] - meters remaining to the cup
 * @returns {Promise<string>} a short (1 sentence) commentary line
 */
export async function generateCommentary(eventType, context = {}) {
  const { buildingName, swingCount, distanceToHole } = context;

  const prompt = `You are a witty live sportscaster commentating a campus phone-golf game in real time.

Event: ${eventType}
${buildingName ? `Nearby landmark: ${buildingName}` : ''}
${swingCount !== undefined ? `Swings taken so far: ${swingCount}` : ''}
${distanceToHole !== undefined ? `Distance remaining to hole: ${distanceToHole}m` : ''}

Write ONE short, punchy sentence of live commentary for this moment.
No markdown, no quotes around it, just the sentence itself. Keep it under 20 words.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = response.text?.trim();
    return text && text.length > 0 ? text : pickFallback(eventType);
  } catch (err) {
    console.error('[commentary] Gemini call failed, using fallback:', err.message);
    return pickFallback(eventType);
  }
}

// Quick manual test: `node commentary.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const line = await generateCommentary('landing', {
      buildingName: 'Richcraft Hall',
      swingCount: 3,
      distanceToHole: 9,
    });
    console.log(line);
  })();
}
