import pool from '../db.js';
import jwt from 'jsonwebtoken';
import redis from '../redis.js';

export const registerSocketHandlers = (io) => {

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(socket.user.username + ' connected');

    // ─── MARK USER ONLINE ──────────────────────────────
    // store in Redis with 60 second expiry
    await redis.setex(
      'online:' + socket.user.id,  // key
      60,                           // expires in 60 seconds
      socket.user.username          // value
    );

    // tell everyone this user is online
    io.emit('user_online', { userId: socket.user.id, username: socket.user.username });

    // ─── HEARTBEAT ─────────────────────────────────────
    // every 30 seconds refresh the online status
    // if server stops getting heartbeats → key expires → user appears offline
    const heartbeat = setInterval(async () => {
      await redis.setex('online:' + socket.user.id, 60, socket.user.username);
    }, 30000);

    // ─── JOIN ROOM ─────────────────────────────────────
    socket.on('join_room', async (roomId) => {
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(roomId);
      socket.currentRoom = roomId;

      // ─── CACHE: load messages from Redis first ──────
      // check if messages are cached
      const cached = await redis.get('messages:' + roomId);

      if (cached) {
        // send cached messages instantly
        socket.emit('room_messages', JSON.parse(cached));
      } else {
        // not cached → fetch from PostgreSQL
        const result = await pool.query(`
          SELECT messages.id, messages.content, messages.created_at,
            users.username, users.avatar,
            json_agg(
              json_build_object('emoji', reactions.emoji, 'user_id', reactions.user_id)
            ) FILTER (WHERE reactions.id IS NOT NULL) as reactions
          FROM messages
          JOIN users ON messages.user_id = users.id
          LEFT JOIN reactions ON reactions.message_id = messages.id
          WHERE messages.room_id = $1
          GROUP BY messages.id, users.username, users.avatar
          ORDER BY messages.created_at ASC
          LIMIT 50
        `, [roomId]);

        const messages = result.rows;

        // store in Redis for 5 minutes
        await redis.setex('messages:' + roomId, 300, JSON.stringify(messages));

        socket.emit('room_messages', messages);
      }

      socket.to(roomId).emit('user_joined', { username: socket.user.username });
    });

    // ─── SEND MESSAGE ───────────────────────────────────
    socket.on('send_message', async (data) => {
      const { content } = data;
      const roomId = socket.currentRoom;

      if (!content || !roomId) return;

      try {
        const result = await pool.query(
          `INSERT INTO messages (room_id, user_id, content)
           VALUES ($1, $2, $3) RETURNING id, content, created_at`,
          [roomId, socket.user.id, content]
        );

        const message = {
          ...result.rows[0],
          username: socket.user.username,
          avatar: socket.user.avatar,
          reactions: []
        };

        // invalidate cache — next user to join will get fresh messages from DB
        await redis.del('messages:' + roomId);

        io.to(roomId).emit('new_message', message);

      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── GET ONLINE USERS ───────────────────────────────
    socket.on('get_online_users', async () => {
      // scan Redis for all online:* keys
      const keys = await redis.keys('online:*');

      const onlineUsers = await Promise.all(
        keys.map(async (key) => {
          const username = await redis.get(key);
          const userId = key.replace('online:', '');
          return { userId, username };
        })
      );

      socket.emit('online_users', onlineUsers);
    });

    // ─── DISCONNECT ─────────────────────────────────────
    socket.on('disconnect', async () => {
      clearInterval(heartbeat); // stop the heartbeat
      await redis.del('online:' + socket.user.id); // mark offline
      io.emit('user_offline', { userId: socket.user.id });
      console.log(socket.user.username + ' disconnected');
    });
  });
};