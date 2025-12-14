## 🚀 OpenSky Flight Radar — Pure C HTTP Server + Leaflet.js

This project is a real-time flight radar application that combines a **custom HTTP server written entirely in pure C** with a modern, interactive **Leaflet.js** frontend powered by the **OpenSky Network API**.

The objective is to demonstrate how a low-level backend written in C can successfully serve a web-based frontend that performs real-time data visualization using external APIs — without using any web frameworks.

---

## 📖 Table of Contents

1. Project Overview  
2. Features  
3. Architecture & Data Flow  
4. Prerequisites  
5. Setup & Execution  
6. Configuration  
7. Technology Stack  
8. Contributing  

---

## 📌 Project Overview

This project consists of two clearly separated components:

### Backend — Pure C HTTP Server
- Implemented using POSIX socket programming
- Manually handles HTTP `GET` requests
- Serves a static `index.html` file
- No frameworks or external libraries used

### Frontend — Leaflet.js Flight Radar
- Runs entirely in the browser
- Periodically fetches live flight data from the OpenSky Network API
- Displays aircraft positions on a Leaflet map
- Rotates aircraft markers based on heading
- Updates data dynamically without page refresh

The C server **only serves the frontend**.  
All flight data fetching and visualization logic runs on the client side.

---

## ✨ Features

### 🖥️ C Server Features
- Pure C implementation
- Low-level POSIX socket usage
- Manual HTTP response handling
- Lightweight and efficient
- Serves static files

### 🌍 Frontend Features
- Real-time aircraft tracking
- Automatic data refresh at fixed intervals
- Bounding-box based geographic filtering
- Rotated airplane markers using heading data
- Interactive OpenStreetMap-based UI

---

## 🏗️ Architecture & Data Flow

1. User opens `http://localhost:8080` in a browser  
2. Browser sends an HTTP request to the C server  
3. C server responds with `index.html`  
4. Browser executes embedded JavaScript  
5. JavaScript fetches live data from OpenSky API  
6. Leaflet renders and updates aircraft markers  
Browser → C HTTP Server → index.html
│
└──→ OpenSky API → Leaflet Map Rendering
---
## 🛠️ Prerequisites

- GCC or any standard C compiler
- POSIX-compatible OS (Linux, macOS, or WSL)
- Modern web browser
- Internet connection

---

## ▶️ Setup & Execution

### Project Structure
project/\
├── server.c\
└── index.html
### Compile the C Server

```bash
gcc server.c -o flight_server
```
### Run the server

`server.exe`
### Open site 
`http://localhost:8080`

# 🧰 Technology Stack
## Backend

- C (POSIX socket programming)

## Frontend

- HTML5

- CSS3

- JavaScript (ES6+)

## Visualization

- Leaflet.js

- OpenStreetMap tiles

## Data Source

- OpenSky Network API