# CampusGolf ⛳

**Turn your phone into a golf club and Carleton University into the course.**

CampusGolf is a real-time, location-based golf game built at cuHacking 7 in July 2026.

## What it is

CampusGolf places a golf ball and a target hole at real locations across Carleton University's campus.

When a player reaches their ball, they physically swing their phone to take a shot. Swing strength is calculated using the phone's motion sensors, while shot direction comes from the phone's heading. The ball's new GPS position is calculated by the server and synchronized between players.

Players then walk to wherever the ball landed and swing again until they reach the target.

CampusGolf supports both solo testing and two-player matches.

## How to play

1. Enter a username and create a lobby, join an existing lobby, or start a solo test.
2. In multiplayer, share the four-character lobby code with another player.
3. Walk to your golf ball's current GPS location.
4. Press the swing button and physically swing your phone.
5. Follow the ball across campus and repeat until it reaches the target building.
6. Complete the course in as few swings as possible before time runs out.

## Current features

- **Live GPS positioning** — tracks player locations using the browser Geolocation API and displays them on a Leaflet map.
- **Motion-controlled swings** — uses phone accelerometer data to estimate swing strength.
- **Directional shots** — uses the phone's heading to determine shot direction, with server-side aim assistance.
- **Two-player multiplayer** — create and join private lobbies using a short room code.
- **Real-time synchronization** — player locations, ball positions, swing counts, timers, and match state are synchronized using Socket.IO.
- **Solo test mode** — test the full course without waiting for a second player.
- **Location-based gameplay** — players must physically reach their ball before they can take another swing.
- **Random campus targets** — each course selects a Carleton building as the target hole and calculates par based on its distance from the starting point.
- **Match results** — displays course completion, stroke count, score relative to par, elapsed time, and multiplayer victory or defeat.
- **Optional Gemini-powered grading** — generates post-game feedback when an API key is configured and falls back to local grading otherwise.
- **GPS smoothing** — filters implausible GPS jumps and smooths marker movement to reduce location jitter.

## Campus data

The repository contains coordinates and researched historical information for 44 Carleton University buildings.

A standalone proximity-trivia module uses the Haversine formula to detect when a player walks near a building and prevents the same fact from being repeatedly triggered.

The building dataset and proximity detector are complete, but full trivia display integration is still future work.

## Tech stack

### Frontend

- HTML
- CSS
- Vanilla JavaScript
- Leaflet.js
- OpenStreetMap and CARTO map tiles
- Browser Geolocation API
- Browser Device Motion and Device Orientation APIs

### Optional AI

- Google Gemini API for post-game performance grading
- Local fallback grading when no API key is configured

### Backend

- Node.js
- Express
- Socket.IO

### Data

- Building coordinates and metadata stored in JavaScript and JSON
- Researched trivia for 44 Carleton University buildings

## Project structure

## Setup and installation

### Requirements

- Node.js
- npm
- A smartphone with GPS, accelerometer, and orientation-sensor support
- An HTTPS connection when testing on a physical phone

### Install and run

```bash
git clone https://github.com/EkvinYang/Map-Lockout.git
cd Map-Lockout
npm install
node server.js
```

The server runs on:

```text
http://localhost:3000
```

The project currently does not define an `npm start` script, so launch it with `node server.js`.

### Testing on a phone

Mobile browsers generally require HTTPS before allowing access to motion, orientation, and precise location sensors. Use an HTTPS tunnel such as ngrok:

```bash
ngrok http 3000
```

Open the generated HTTPS address on the phone, allow location and motion permissions, and keep the phone connected while playing.

## Configuration

Create a `.env` file in the project root:

```env
PORT=3000
REACH_DISTANCE=50
INTERACT_DISTANCE=100
END_DISTANCE=75

# Optional: enables Gemini-powered post-game grading
GEMINI_API_KEY=your_api_key_here
```

The game remains playable without a Gemini key. When the key is missing or the API request fails, the server returns local fallback grading and feedback.

## Challenges

- **Pivoting during the hackathon** — we began with the QNX embedded-hardware challenge, then explored a GPS power-up game before converging on phone golf. The pivot cost time, but the GPS and real-time networking foundation carried over.

- **Working with real-world sensors** — GPS drift, accelerometer noise, device headings, browser permissions, and differences between phones made the physical interaction less predictable than ordinary desktop input.

- **Synchronizing multiplayer state** — player positions, separate ball locations, swing counts, timers, completion state, and match results had to remain synchronized across devices.

- **Researching accurate campus data** — we compiled information for 44 Carleton University buildings and had to carefully filter results referring to Carleton College in Minnesota.

- **Managing scope** — we prioritized a complete playable loop over partially shipping every planned feature.

## Future work

- Expand CampusGolf to other universities using replaceable campus datasets
- Integrate the proximity-trivia module fully into the live game interface
- Add collision physics using real building footprints
- Improve swing calibration and device-to-device consistency
- Add preset courses, difficulty levels, and shorter demonstration routes
- Support larger multiplayer matches
- Expand commentary and audio feedback

## Development tools

Claude was used as a coding and debugging assistant during development. The core GPS, motion-sensor, multiplayer, mapping, and scoring systems run independently of an AI model.

Google Gemini is used optionally for post-game grading and feedback. The game falls back to local grading when Gemini is unavailable.

## Team

- Kevin Yang
- George Song
- Fatum Ali
- Jason Law

## Built for

CampusGolf was created for **cuHacking 7**, Carleton University's official hackathon, in July 2026.

## Links

- [Devpost submission](https://devpost.com/software/campusgolf)
- [Source code](https://github.com/EkvinYang/Map-Lockout)

```text
server.js
    Express and Socket.IO server
    Lobby creation and multiplayer synchronization
    Golf-course generation, timers, scoring, and ball movement

public/
    index.html
        Main game interface

    app.js
        GPS tracking, map rendering, swing detection, lobby controls,
        ball animations, and client-side game state

    style.css
        Mobile interface and game styling

    test_gps.html
        GPS and Socket.IO testing interface

buildings.js
    Building data used by the server

buildings.json
    Building coordinates and researched trivia

proximity-trivia.js
    Standalone proximity-based trivia detector

commentary.js
    Lightweight fallback commentary for swing and course events
