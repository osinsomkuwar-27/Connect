# Connect

Connect is a real-time video calling and messaging web application built with WebRTC for peer-to-peer media streaming, Socket.io for signaling, and a secure token-based authentication system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [How WebRTC Connection Works](#how-webrtc-connection-works)
- [Authentication Flow](#authentication-flow)
- [CORS](#cors)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Connect allows users to register, log in, and start real-time video calls with other users directly from the browser. It uses WebRTC for peer-to-peer audio/video streaming, a Socket.io signaling server to exchange connection metadata between peers, and JWT-based authentication to secure user sessions.

---

## Tech Stack

### Frontend
- React
- Material UI
- WebRTC
- Axios
- CSS

### Backend
- Express.js
- Socket.io
- Bcrypt
- Crypto

### Database
- MongoDB

---

## Architecture
```
                    ┌───────────────────────┐
                    │        Client A       │
                    │  (React + WebRTC)     │
                    └───────────┬───────────┘
                                │
                 Signaling (Socket.io)  │  Peer-to-Peer Media (WebRTC)
                                │                  │
                    ┌───────────▼───────────┐      │
                    │      Backend Server   │      │
                    │Express.js + Socket.io │      │
                    │  Auth (JWT, Bcrypt)   │      │
                    └───────────┬───────────┘      │
                                │                  │
                    ┌───────────▼───────────┐      │
                    │        MongoDB        │      │
                    │   Users / Sessions    │      │
                    └───────────┬───────────┘      │
                                │                  │
                    ┌───────────▼───────────┐      │
                    │        Client B       │◄─────┘
                    │  (React + WebRTC)     │
                    └───────────────────────┘
```

The backend server handles authentication and acts as a signaling relay only. Once two clients have exchanged connection information through the server, audio and video data flows directly between them without passing through the backend.

---

## How WebRTC Connection Works

WebRTC enables direct browser-to-browser communication, but two peers first need a way to discover each other's network information. This is handled through a signaling and negotiation process:

1. **Signaling** — Clients connect to the backend through Socket.io to exchange session information such as call requests and connection offers.
2. **STUN Server** — A STUN server is a lightweight public server that returns the public IP address of the requesting device. This allows peers behind NAT/routers to discover how they can be reached.
3. **Offer/Answer Exchange** — One peer creates a connection offer, sends it through the signaling server, and the other peer responds with an answer.
4. **ICE Candidates** — Both peers exchange possible connection paths (ICE candidates) until a direct route is established.
5. **Media Access** — The `navigator.mediaDevices` API is used to request access to the user's camera and microphone, returning a `MediaStream` that is attached to the peer connection.

Once the connection is established, video and audio flow directly between the two browsers, reducing latency and backend load.

---

## Authentication Flow

Connect uses token-based authentication instead of maintaining server-side session state.

1. **User Login** — The user submits credentials (email/username and password).
2. **Password Verification** — Passwords are hashed using Bcrypt at registration and compared securely at login; Crypto is used for any additional token or randomness generation.
3. **Token Generation** — On successful login, the server issues a signed token (JWT) containing user identity information.
4. **Token Storage** — The client stores the token and attaches it to future requests.
5. **Authenticated Requests** — Protected routes require the token to be sent in the request header:Authorization: Bearer <token>
6. **Token Verification** — The server verifies the token's signature and expiry before granting access to protected resources.

### JWT Structure

A JSON Web Token consists of three parts:

| Part | Purpose |
|------|---------|
| Header | Metadata about the token, including the signing algorithm |
| Payload | The actual claims/data, such as user ID |
| Signature | Verifies the token has not been tampered with |

---

## CORS

Cross-Origin Resource Sharing (CORS) is a browser security mechanism that restricts how a web application on one origin can request resources from a different origin. It prevents unauthorized cross-domain requests from being made on behalf of a user.

The backend explicitly allows the frontend's origin and defines which HTTP methods and headers are permitted, using headers such as:

| Header | Purpose |
|--------|---------|
| `Access-Control-Allow-Origin` | Specifies which origin(s) may access the resource |
| `Access-Control-Allow-Methods` | Specifies which HTTP methods are permitted (GET, POST, PUT, DELETE) |
| `Access-Control-Allow-Headers` | Specifies which request headers are permitted |
| `Access-Control-Allow-Credentials` | Specifies whether cookies/credentials may be included in requests |
| `Access-Control-Expose-Headers` | Specifies which response headers the browser may expose to client-side scripts |

---

## Project Structure
```
Connect/
├── backend/
│ ├── controllers/ # Route logic (auth, users, calls)
│ ├── models/ # MongoDB schemas
│ ├── routes/ # Express route definitions
│ ├── middleware/ # Auth guards, error handling
│ ├── socket/ # Socket.io signaling logic
│ └── server.js # Entry point
│
├── frontend/
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── pages/ # Page-level views
│ │ ├── context/ # Auth/socket context providers
│ │ ├── services/ # Axios API calls
│ │ └── App.js
│ └── public/
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js and npm installed
- A running MongoDB instance (local or cloud, e.g. MongoDB Atlas)

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
PORT=
MONGO_URI=
JWT_SECRET=
CLIENT_URL=
```

---

## Running Locally

```bash
# Backend
cd backend
npm install
npm start

# Frontend (in a separate terminal)
cd frontend
npm install
npm start
```

The frontend will typically run on `http://localhost:3000` and the backend on the port specified in your `.env` file.

---

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT License — see [LICENSE](LICENSE) for details.
