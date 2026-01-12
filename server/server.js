const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const homeworkRoutes = require('./routes/homework');
const notifRoutes = require('./routes/notifications');
const marksRoutes = require('./routes/marks');
const timetableRoutes = require('./routes/timetable');

const app = express();
const server = http.createServer(app);

// CORS configuration
// CORS configuration
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity and to fixing Vercel connection
        methods: ["GET", "POST", "DELETE"]
    }
});

app.use(cors({
    origin: "*" // Allow all origins
}));
app.use(express.json());

// Track online users
const onlineUsers = new Set();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('login', (user) => {
        if (user) {
            socket.user = user;
            socket.join(user.email); // Join personal room
            onlineUsers.add(user.email);
            io.emit('online_users', Array.from(onlineUsers));
        }
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            onlineUsers.delete(socket.user.email);
            io.emit('online_users', Array.from(onlineUsers));
        }
    });
});

// Pass io to request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.send('Homework API is running');
});

app.get('/api/seed', (req, res) => {
    try {
        const seed = require('./scripts/seed_students');
        seed();
        res.send('Seeding initiated successfully. Check logs/db.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error seeding: ' + err.message);
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/notifications', notifRoutes.router);
app.use('/api/marks', marksRoutes);
app.use('/api/timetable', timetableRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
