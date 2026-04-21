import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MessageHandler } from './classes/MessageHandler.js';

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ["GET", "POST"]
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const handler = new MessageHandler(io);

io.on('connection', (socket) => {
  handler.handle(socket);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Skribbl Server running on :${PORT}`);
});
