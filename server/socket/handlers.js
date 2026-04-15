import pool from '../db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

let schemaReadyPromise;

const ensureRoomSecuritySchema = async () => {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS password_hash TEXT
    `);
  }

  await schemaReadyPromise;
};

export const registerSocketHandlers = (io) => {

  // ─── MIDDLEWARE ─────────────────────────────────────────
  // this runs when a client first connects
  // it checks their JWT token before allowing the connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error('No token'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // attach user to socket — like req.user in Express
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── ON CONNECTION ──────────────────────────────────────
  // this runs every time a new user connects
  io.on('connection', (socket) => {
    console.log(socket.user.username + ' connected');

    // ─── JOIN ROOM ────────────────────────────────────────
    // client emits 'join_room' → server puts them in that room
    socket.on('join_room', async (payload) => {
      const roomId = typeof payload === 'object' ? payload?.roomId : payload;
      const password = typeof payload === 'object' ? payload?.password : undefined;
      if (!roomId) return;

      await ensureRoomSecuritySchema();

      const roomResult = await pool.query(
        `SELECT password_hash FROM rooms WHERE id = $1`,
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const passwordHash = roomResult.rows[0].password_hash;
      if (passwordHash) {
        if (!password) {
          socket.emit('error', { message: 'Room password required' });
          return;
        }

        const matches = await bcrypt.compare(password, passwordHash);
        if (!matches) {
          socket.emit('error', { message: 'Incorrect room password' });
          return;
        }
      }

      // leave any previous room first
      // socket.rooms contains all rooms this socket is in
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(roomId); // put socket in this room
      socket.currentRoom = roomId; // remember which room they're in

      console.log(socket.user.username + ' joined room ' + roomId);

      // tell everyone else in the room this user joined
      socket.to(roomId).emit('user_joined', {
        username: socket.user.username
      });
    });

    // ─── SEND MESSAGE ─────────────────────────────────────
    // client emits 'send_message' → server saves to DB → broadcasts to room
    socket.on('send_message', async (data) => {
      const { content } = data;
      const roomId = socket.currentRoom;

      if (!content || !roomId) return;

      try {
        // save message to DB
        const result = await pool.query(
          `INSERT INTO messages (room_id, user_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, content, created_at`,
          [roomId, socket.user.id, content]
        );

        const message = {
          ...result.rows[0],
          username: socket.user.username,
          avatar: socket.user.avatar,
          reactions: []
        };

        // emit to EVERYONE in the room including the sender
        // this is how all clients get the message at the same time
        io.to(roomId).emit('new_message', message);

      } catch (err) {
        // only send error back to the person who sent the message
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── EMOJI REACTION ───────────────────────────────────
    // client emits 'add_reaction' → save to DB → broadcast updated reactions
    socket.on('add_reaction', async (data) => {
      const { messageId, emoji } = data;

      try {
        // INSERT or DELETE — if reaction exists remove it (toggle behaviour)
        const existing = await pool.query(
          `SELECT id FROM reactions 
           WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
          [messageId, socket.user.id, emoji]
        );

        if (existing.rows.length > 0) {
          // reaction exists → remove it
          await pool.query(
            `DELETE FROM reactions WHERE id = $1`,
            [existing.rows[0].id]
          );
        } else {
          // reaction doesn't exist → add it
          await pool.query(
            `INSERT INTO reactions (message_id, user_id, emoji)
             VALUES ($1, $2, $3)`,
            [messageId, socket.user.id, emoji]
          );
        }

        // fetch all updated reactions for this message
        const reactions = await pool.query(
          `SELECT emoji, user_id FROM reactions WHERE message_id = $1`,
          [messageId]
        );

        // broadcast updated reactions to everyone in the room
        io.to(socket.currentRoom).emit('reaction_updated', {
          messageId,
          reactions: reactions.rows
        });

      } catch (err) {
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // ─── TYPING INDICATOR ─────────────────────────────────
    // client emits 'typing' → server tells everyone else in the room
    socket.on('typing', () => {
      socket.to(socket.currentRoom).emit('user_typing', {
        username: socket.user.username
      });
    });

    socket.on('stop_typing', () => {
      socket.to(socket.currentRoom).emit('user_stop_typing', {
        username: socket.user.username
      });
    });

    // ─── DISCONNECT ───────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(socket.user.username + ' disconnected');
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user_left', {
          username: socket.user.username
        });
      }
    });
  });
};
