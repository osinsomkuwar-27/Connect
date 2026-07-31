import express from "express";
import { createServer } from "node:http";
import dotenv from "dotenv";
import dns from "node:dns";
import mongoose from "mongoose";
import cors from "cors";

import { connectTosocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

// Use Google DNS to avoid resolution failures on Render's network
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const app = express();
const server = createServer(app);

// ── CORS for HTTP REST API ───────────────────────────────────────────────────
// Socket.IO CORS is handled inside socketManager.js.
// This covers the /api/v1/users routes called by axios.
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, "http://localhost:3000"]
    : true; // allow all if not configured

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1/users", userRoutes);

// Health-check endpoint (useful for Render's free-tier keep-alive)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Socket.IO ────────────────────────────────────────────────────────────────
connectTosocket(server);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

const start = async () => {
    try {
        const connectionDb = await mongoose.connect(process.env.MONGODB_URI);
        console.log(
            `Mongo database connected to host: ${connectionDb.connection.host}`
        );
        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

start();