const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Store active rooms and users
const rooms = {};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Generic Messaging System is running' });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join_room', (data) => {
    const { username, room } = data;
    
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!rooms[room]) {
      rooms[room] = [];
    }
    rooms[room].push({ id: socket.id, username });

    // Notify everyone in the room
    io.to(room).emit('user_joined', {
      message: `${username} joined the room`,
      users: rooms[room],
      timestamp: new Date()
    });

    console.log(`${username} joined room: ${room}`);
  });

  socket.on('send_message', (data) => {
    const { message } = data;
    const room = socket.room;
    const username = socket.username;

    if (room && message.trim()) {
      io.to(room).emit('receive_message', {
        username,
        message,
        timestamp: new Date().toLocaleTimeString()
      });
      console.log(`[${room}] ${username}: ${message}`);
    }
  });

  socket.on('disconnect', () => {
    const room = socket.room;
    const username = socket.username;

    if (room && rooms[room]) {
      rooms[room] = rooms[room].filter(user => user.id !== socket.id);
      
      if (rooms[room].length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit('user_left', {
          message: `${username} left the room`,
          users: rooms[room]
        });
      }
    }

    console.log(`${username} disconnected from room: ${room}`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Generic Messaging System running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server is ready for connections`);
});

module.exports = app;
