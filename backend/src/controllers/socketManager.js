import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectTosocket = (server) => {
    const io = new Server(server, {
        cors: {
            // Allow any origin in production.
            // Credentials cannot be used with wildcard "*", so we use
            // a function that dynamically reflects the requesting origin —
            // this is safe for a public meeting app.
            origin: (origin, callback) => {
                callback(null, true);
            },
            methods: ["GET", "POST"],
            credentials: false,
        },
        // Always allow both transports so the client can fall back to
        // long-polling on networks that block WebSocket upgrades.
        transports: ["websocket", "polling"],
        // Raise ping/pong timeouts so slow networks don't disconnect.
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", (socket) => {
        console.log("a user connected", socket.id);

        // ── join-call ────────────────────────────────────────────────────
        // path = the meeting room identifier sent by the client.
        socket.on("join-call", (path) => {
            if (connections[path] === undefined) {
                connections[path] = [];
            }

            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            // Notify every participant in the room (including the newcomer)
            // who just joined and who is currently in the room.
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit(
                    "user-joined",
                    socket.id,
                    connections[path]
                );
            }

            // Replay buffered chat history to the newly joined user.
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit(
                        "chat-message",
                        messages[path][a]["data"],
                        messages[path][a]["sender"],
                        messages[path][a]["socket-id-sender"]
                    );
                }
            }
        });

        // ── signal (SDP offer/answer + ICE candidates) ───────────────────
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // ── chat-message ─────────────────────────────────────────────────
        socket.on("chat-message", (data, sender) => {
            // Find which room this socket belongs to.
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (found) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    sender: sender,
                    data: data,
                    "socket-id-sender": socket.id,
                });

                console.log("message:", sender, data);

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // ── disconnect ───────────────────────────────────────────────────
        socket.on("disconnect", () => {
            const diffTime = Math.abs(timeOnline[socket.id] - new Date());
            console.log(
                `User ${socket.id} disconnected after ${Math.round(diffTime / 1000)}s`
            );

            // Deep-clone entries so we can mutate connections[] safely.
            for (const [k, v] of Object.entries(connections)) {
                const idx = v.indexOf(socket.id);
                if (idx === -1) continue;

                // Tell everyone in the room this peer left.
                connections[k].forEach((peerId) => {
                    io.to(peerId).emit("user-left", socket.id);
                });

                // Remove socket from the room list.
                connections[k].splice(idx, 1);

                // Clean up empty rooms.
                if (connections[k].length === 0) {
                    delete connections[k];
                    delete messages[k];
                }

                break; // a socket can only be in one room
            }

            delete timeOnline[socket.id];
        });
    });

    return io;
};
