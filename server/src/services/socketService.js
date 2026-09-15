// server/src/services/socketService.js

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Caps concurrent tabs/devices per user so a single account cannot exhaust
// the server's connection memory.
const MAX_CONNECTIONS_PER_USER = 5;

class SocketService {
    constructor() {
        this.io = null;
        this.connectionCounts = new Map();
    }

    #increment(userId) {
        const next = (this.connectionCounts.get(userId) || 0) + 1;
        this.connectionCounts.set(userId, next);
        return next;
    }

    #decrement(userId) {
        const current = this.connectionCounts.get(userId) || 0;

        if (current <= 1) {
            this.connectionCounts.delete(userId);
            return 0;
        }

        this.connectionCounts.set(userId, current - 1);
        return current - 1;
    }

    init(server, allowedOrigins) {
        this.io = new Server(server, {
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true
            },
            // Drop half-open connections reasonably fast without being chatty.
            pingInterval: 25000,
            pingTimeout: 20000,
            maxHttpBufferSize: 1e5
        });

        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth?.token;

                if (!token) {
                    return next(new Error("Authentication error: no token provided."));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // Refresh tokens must not open a socket.
                if (decoded.type && decoded.type !== "access") {
                    return next(new Error("Authentication error: invalid token."));
                }

                const userId = decoded.id || decoded._id;

                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    return next(new Error("Authentication error: invalid token."));
                }

                const userIdStr = String(userId);

                /*
                 * The counter is incremented here rather than in the connection
                 * handler so two simultaneous handshakes cannot both pass the
                 * limit check before either one has been counted.
                 */
                if ((this.connectionCounts.get(userIdStr) || 0) >= MAX_CONNECTIONS_PER_USER) {
                    return next(new Error("Connection limit reached. Close other tabs."));
                }

                this.#increment(userIdStr);
                socket.userIdStr = userIdStr;

                /*
                 * The decrement is registered here, next to the increment, so a
                 * handshake that never reaches the connection handler (client
                 * aborts mid-connect) still releases its slot.
                 */
                socket.once("disconnect", () => {
                    this.#decrement(userIdStr);
                });

                return next();
            } catch {
                return next(new Error("Authentication error: invalid or expired token."));
            }
        });

        this.io.on("connection", (socket) => {
            // Each user has a private room, which is how targeted
            // notifications reach every one of that user's open tabs.
            socket.join(socket.userIdStr);
        });

        return this.io;
    }

    sendToUser(userId, event, payload) {
        if (!this.io || !userId) return;

        this.io.to(String(userId)).emit(event, payload);
    }

    /** Release the WebSocket server during graceful shutdown. */
    async close() {
        if (!this.io) return;

        await new Promise((resolve) => {
            this.io.close(() => resolve());
        });

        this.io = null;
        this.connectionCounts.clear();
    }

    getConnectionCount(userId) {
        return this.connectionCounts.get(String(userId)) || 0;
    }
}

module.exports = new SocketService();
module.exports.MAX_CONNECTIONS_PER_USER = MAX_CONNECTIONS_PER_USER;
