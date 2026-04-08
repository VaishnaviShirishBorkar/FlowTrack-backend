import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes.js'
import cors from 'cors'
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import userRoutes from './routes/user.routes.js';
import commentRoutes from './routes/comment.routes.js';
import activityRoutes from './routes/activity.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import searchRoutes from './routes/search.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
const port = process.env.PORT || 5000;

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: frontendUrl,
        credentials: true
    }
});

// Make io accessible to controllers
app.set('io', io);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: frontendUrl,
    credentials: true
}));

// Global request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// db
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Mongodb connected!'))
    .catch((error) => console.log('Connection failed error ', error));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join user's personal room for notifications
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`Socket ${socket.id} joined user-${userId}`);
    });

    socket.on('join-project', (projectId) => {
        socket.join(`project-${projectId}`);
        console.log(`Socket ${socket.id} joined project-${projectId}`);
    });

    socket.on('leave-project', (projectId) => {
        socket.leave(`project-${projectId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);

httpServer.listen(port, () => console.log(`Server running on ${port}`));
