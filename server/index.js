import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './db.js';
import authRouter from './routes/auth.js';
import roomsRouter from './routes/rooms.js';
import { registerSocketHandlers } from './socket/handlers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PgSession = connectPgSimple(session);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRouter);
app.use('/api/rooms', roomsRouter);

registerSocketHandlers(io);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log('Server running on port ' + PORT));

export { io };