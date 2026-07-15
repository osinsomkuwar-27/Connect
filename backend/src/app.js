import express from "express";
import {createServer} from "node:http";
import dotenv from "dotenv";

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import {Server} from "socket.io";
import mongoose from "mongoose";
import { connectTosocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
dotenv.config();
const app = express();
const server = createServer(app);
const io = connectTosocket(server);

app.set("port", (process.env.PORT || 8000))

app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb", extended:true}));

app.use("/api/v1/users", userRoutes);

const start = async () =>{
    const connectionDb = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Mongo database connected to host: ${connectionDb.connection.host}`)
    server.listen(app.get("port") , () =>{
        console.log("LISTENING ON PORT 8000");
    });
};

console.log("Mongo URI:", process.env.MONGODB_URI);
console.log("PORT:", process.env.PORT);

start();