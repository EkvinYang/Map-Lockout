# CampusGolf ⛳

Real-time phone golf across Carleton University's campus — built at cuHacking 7 (July 2026).

<!-- TODO: replace with final game name if "Map-Lockout" isn't sticking -->

## What it is

Players get a starting location and a golf "cup" somewhere else on campus, both real GPS coordinates. Take a swing by physically moving your phone — strength comes from the phone's motion sensors — and the ball travels toward the target. Walk to wherever it landed, swing again, repeat until it's in the cup.

As you walk across campus, the game recognizes real Carleton buildings and surfaces facts about them.

## Features

- **Live GPS tracking** — real-time position over WebSockets, rendered on a Leaflet/OpenStreetMap map
- **Motion-based swing detection** — physically swing your phone; strength and distance are calculated from real accelerometer data (with a practice-swing mode to preview before committing)
- **Building collision** — the ball bounces off real campus buildings using their actual footprints, encouraging players to stay outside
- **Proximity-based campus trivia** — walk within range of any of 44 real Carleton buildings and get a genuine, researched fact about it (naming history, notable alumni, hidden campus lore)


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

### AI commentary (Gemini)
\`\`\`bash
npm install @google/genai
export GEMINI_API_KEY="your-key-here"   # get one free at aistudio.google.com
\`\`\`
`commentary.js` calls the Gemini API directly and falls back to canned lines if the call fails or the key isn't set — a missing key won't crash the game, but the commentary won't be genuinely AI-generated without it. Make sure `GEMINI_API_KEY` is set wherever the server actually runs, not just locally.

The proximity trivia system doesn't call Gemini at all — it reads directly from `buildings.json`, so it works the same regardless of whether the API key is set.

## Team

<!-- TODO: confirm names + GitHub handles -->
- RoboRaccoon
- EkvinYang
- DaGalaxyCosmo
- vutum-labs

## Built for

cuHacking 7, Carleton University's official hackathon — July 2026. 

## Challenges

- **Losing our first direction** — we started building a GPS-based powerup battle game, then pivoted to phone golf partway through the weekend once we realized it reused the same GPS/WebSocket foundation more directly and was more buildable in the time we had. The pivot cost time, but the underlying positioning code carried over rather than being wasted.
- **Getting real trivia, not invented trivia** — researching genuine facts for 44 campus buildings without fabricating anything to fill gaps. A lot of the "obvious" search results turned out to be about a completely different school (Carleton College in Minnesota, not Carleton University), so verifying the right school behind every fact took real care.
- **AI integration didn't fully land** — `commentary.js` genuinely calls the Gemini API and works standalone, but we didn't get it confirmed wired into and running on the live server in time for submission. It's real, tested code — just not confirmed live in the final build.
