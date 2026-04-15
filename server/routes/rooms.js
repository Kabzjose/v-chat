import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
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

// ─── GET ALL ROOMS ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    await ensureRoomSecuritySchema();

    const result = await pool.query(`
      SELECT rooms.id, rooms.name, rooms.description, rooms.created_at,
      users.username as creator,
      (rooms.password_hash IS NOT NULL) as is_protected,
      COUNT(messages.id) as message_count
      FROM rooms
      LEFT JOIN users ON rooms.created_by = users.id
      LEFT JOIN messages ON messages.room_id = rooms.id
      GROUP BY rooms.id, users.username, rooms.password_hash
      ORDER BY rooms.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CREATE A ROOM ───────────────────────────────────────
// verifyToken runs first — if no valid JWT, request is rejected
router.post('/', verifyToken, async (req, res) => {
  const { name, description, password } = req.body;

  if (!name) return res.status(400).json({ error: 'Room name required' });
  if (password && password.length < 4)
    return res.status(400).json({ error: 'Room password must be at least 4 characters' });

  try {
    await ensureRoomSecuritySchema();

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await pool.query(
      `INSERT INTO rooms (name, description, created_by, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_at, (password_hash IS NOT NULL) as is_protected`,
      [name, description, req.user.id, passwordHash]
    );
    res.status(201).json({
      ...result.rows[0],
      creator: req.user.username,
      message_count: 0
    });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Room name already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;

  try {
    await ensureRoomSecuritySchema();

    const result = await pool.query(
      `SELECT rooms.id, rooms.name, rooms.description, rooms.created_at,
       users.username as creator,
       (rooms.password_hash IS NOT NULL) as is_protected
       FROM rooms
       LEFT JOIN users ON rooms.created_by = users.id
       WHERE rooms.id = $1`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ ...result.rows[0], message_count: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:roomId/unlock', async (req, res) => {
  const { roomId } = req.params;
  const { password } = req.body;

  try {
    await ensureRoomSecuritySchema();

    const result = await pool.query(
      `SELECT password_hash FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = result.rows[0];
    if (!room.password_hash) {
      return res.json({ ok: true });
    }

    if (!password) {
      return res.status(400).json({ error: 'Room password required' });
    }

    const matches = await bcrypt.compare(password, room.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Incorrect room password' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET MESSAGES FOR A ROOM ─────────────────────────────
router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  try {
    await ensureRoomSecuritySchema();

    const roomResult = await pool.query(
      `SELECT password_hash FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const passwordHash = roomResult.rows[0].password_hash;
    const roomPassword = req.headers['x-room-password'];

    if (passwordHash) {
      if (typeof roomPassword !== 'string' || !roomPassword) {
        return res.status(401).json({ error: 'Room password required' });
      }

      const matches = await bcrypt.compare(roomPassword, passwordHash);
      if (!matches) {
        return res.status(401).json({ error: 'Incorrect room password' });
      }
    }

    // fetch last 50 messages with username and reactions
    const result = await pool.query(`
      SELECT 
        messages.id,
        messages.content,
        messages.created_at,
        users.username,
        users.avatar,
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
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
