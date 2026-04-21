# Skribbl.io Clone

A full-stack, real-time multiplayer drawing and guessing game built as an end-to-end clone of skribbl.io.

## 🚀 Live Demo
**Play here:** [https://your-skribbl-clone.onrender.com](https://your-skribbl-clone.onrender.com) *(Update this with your actual Render URL)*

## ✨ Features

### Core Mechanics
* **Multiplayer Rooms:** Create private rooms and share the invite link to play with friends.
* **Turn-based Drawing:** Players take turns drawing a chosen word while others guess.
* **Real-time Sync:** Canvas strokes, chat messages, and game state are synchronized instantly using WebSockets.
* **Word System & Hints:** Drawers choose from 3 word options. Guessers see progressive hints (letters revealed over time).
* **Dynamic Scoring:** Points are awarded based on how quickly a correct guess is made and the guesser's position. The drawer also earns points for successful guesses.
* **Host Settings:** The room creator can customize the number of rounds and the draw time per round.

### Drawing Tools
* **Smooth Strokes:** Uses Quadratic Bézier curves for fluid, high-quality drawing.
* **Colors & Sizes:** Multiple brush colors and thickness options.
* **Undo & Clear:** Easily correct mistakes or clear the entire canvas.
* **Fill/Eraser:** (Optional features available through color matching and brush size adjustments).

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand (State Management).
* **Backend:** Node.js, Express, TypeScript.
* **Real-time Communication:** Socket.IO.
* **Architecture:** Object-Oriented Programming (OOP) backend structure with `Room`, `Game`, `Player`, and `MessageHandler` classes.

## 🏗 Architecture Overview

The application follows a client-server architecture centered around WebSockets for low-latency, real-time updates:

1.  **WebSocket Server (Node.js/Socket.IO):** 
    *   Acts as the central source of truth.
    *   **OOP Design:** 
        *   `Room`: Manages players in a specific session and holds the `Game` instance.
        *   `Game`: Encapsulates round logic, turn order, scoring, and timers.
        *   `Player`: Tracks individual score and drawing status.
        *   `MessageHandler`: Routes incoming socket events to the appropriate room/game methods.
    *   **Stateless Relay:** Drawing events (`draw_data`) are relayed to all clients in a room without being stored in server memory, ensuring high performance and low overhead.
2.  **Frontend (React/Zustand):**
    *   **Canvas:** Listens to mouse/touch events, normalizes coordinates to a 0-1 scale (ensuring cross-device compatibility), and emits them to the server. Incoming remote strokes are rendered using Bézier curves for smoothness.
    *   **State Management:** Zustand manages the local game state (players, chat, timers, UI phase) driven by Socket.IO events.

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd skribbl-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development servers:**
   This project uses npm workspaces. You can start both the client and server concurrently from the root directory:
   ```bash
   npm run dev
   ```
   * The server will run on `http://localhost:3001`
   * The client will run on `http://localhost:5173`

## 🌍 Deployment (Render)

This project is configured for easy deployment on Render:

1. **Web Service (Backend):**
   * Build Command: `npm install && npm run build -w apps/server`
   * Start Command: `node --no-warnings --loader ts-node/esm apps/server/src/index.ts`
   * Env Vars: Set `CLIENT_ORIGIN` to your deployed frontend URL.
2. **Static Site (Frontend):**
   * Build Command: `npm install && npm run build -w apps/client`
   * Publish Directory: `apps/client/dist`
   * Env Vars: Set `VITE_SERVER_URL` to your Render Web Service URL.

## 🎮 Code Walkthrough Guide

Be prepared to explain:
*   **Drawing Sync:** How `x, y` coordinates are captured, normalized (divided by canvas width/height), sent via `socket.emit`, and rendered on receiving clients using `quadraticCurveTo`.
*   **Game State:** How the `Game` class manages `round`, `currentDrawerIndex`, and `timeLeft`, and how `Zustand` reflects this on the UI.
*   **Word Matching:** The `checkGuess` method in `Game.ts` does a case-insensitive, trimmed comparison against the `currentWord`.
