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

- **Live GPS positioning**  
  Tracks player locations using the browser Geolocation API and displays them on a Leaflet map.

- **Motion-controlled swings**  
  Uses phone accelerometer data to estimate swing strength.

- **Directional shots**  
  Uses the phone's heading to determine shot direction, with server-side aim assistance.

- **Two-player multiplayer**  
  Create and join private lobbies using a short room code.

- **Real-time synchronization**  
  Player locations, ball positions, swing counts, timers, and match state are synchronized using Socket.IO.

- **Solo test mode**  
  Test the full course without waiting for a second player.

- **Location-based gameplay**  
  Players must physically reach their ball before they can take another swing.

- **Random campus targets**  
  Each course selects a Carleton building as the target hole and calculates a par based on its distance from the starting point.

- **Match results**  
  Displays course completion, stroke count, score relative to par, elapsed time, and multiplayer victory or defeat.

- **GPS smoothing**  
  Filters implausible GPS jumps and smooths marker movement to reduce location jitter.

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

### Backend

- Node.js
- Express
- Socket.IO

### Data

- Building coordinates and metadata stored in JavaScript and JSON
- Researched trivia for 44 Carleton University buildings

## Project structure

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
