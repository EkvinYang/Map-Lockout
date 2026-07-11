#CampusGolf ⛳

Real-time phone golf across Carleton University's campus — built at cuHacking 7 (July 2026).

<!-- TODO: replace with final game name if "Map-Lockout" isn't sticking -->

## What it is

Players get a starting location and a golf "cup" somewhere else on campus, both real GPS coordinates. Take a swing by physically moving your phone — strength comes from the phone's motion sensors — and the ball travels toward the target. Walk to wherever it landed, swing again, repeat until it's in the cup.

As you walk across campus, the game recognizes real Carleton buildings and surfaces facts about them, narrated live using Gemini.

## Features

- **Live GPS tracking** — real-time position over WebSockets, rendered on a Leaflet/OpenStreetMap map
- **Motion-based swing detection** — physically swing your phone; strength and distance are calculated from real accelerometer data (with a practice-swing mode to preview before committing)
- **Building collision** — the ball bounces off real campus buildings using their actual footprints, encouraging players to stay outside
- **Proximity-based campus trivia** — walk within range of any of 44 real Carleton buildings and get a genuine, researched fact about it (naming history, notable alumni, hidden campus lore)
- **AI live commentary** — Gemini-generated sportscaster-style commentary fires on swings, landings, and sinks

## Tech stack

- Frontend: Leaflet.js (map), vanilla JS
- Backend: Node.js, WebSockets (live position + game state sync)
- Data: 44 Carleton campus buildings with real coordinates and researched facts

<!-- TODO: confirm/add anything else in the stack (hosting, ngrok for demo, etc.) -->

## Project structure

```
buildings.json          # 44 campus buildings: code, name, lat/lng, trivia fact
proximity-trivia.js     # fires trivia when a player walks near a building (Haversine distance check)
commentary.js           # Gemini-powered live commentary on swing/landing/sink events
detect-swing.js         # phone motion sensor → swing strength/direction
<!-- TODO: fill in remaining files, e.g. server.js, index.html, whatever handles GPS/socket state -->
```

## Setup

### AI features (trivia + commentary)
```bash
npm install @google/genai
export GEMINI_API_KEY="your-key-here"   # get one free at aistudio.google.com
```
Both `commentary.js` and the trivia system fall back to canned lines if the Gemini call fails or the key isn't set, so a missing key won't crash the game — but it also won't be genuinely AI-powered without it. Make sure `GEMINI_API_KEY` is set wherever the server actually runs, not just locally.

<!-- TODO: full run instructions for the whole app (npm install, npm start, port, etc.) -->

## Team

<!-- TODO: confirm names + GitHub handles -->
- RoboRaccoon
- EkvinYang
- DaGalaxyCosmo
- vutum-labs

## Built for

cuHacking 7, Carleton University's official hackathon — July 2026. Targeting the Gemini and Best AI Hack challenge tracks.

## Challenges

<!-- TODO: this section doubles as material for tomorrow's writeup — worth filling in as a team:
- what didn't work (e.g. direction detection on swings, if that ended up hard)
- what pivoted (started as a battle-royale powerup game, became phone golf)
- what you're proud of
-->
