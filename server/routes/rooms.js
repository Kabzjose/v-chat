import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ─── GET ALL ROOMS ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rooms.*, users.username as creator,
      COUNT(messages.id) as message_count
      FROM rooms
      LEFT JOIN users ON rooms.created_by = users.id
      LEFT JOIN messages ON messages.room_id = rooms.id
      GROUP BY rooms.id, users.username
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
  const { name, description } = req.body;

  if (!name) return res.status(400).json({ error: 'Room name required' });

  try {
    const result = await pool.query(
      `INSERT INTO rooms (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, req.user.id] // req.user comes from verifyToken
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Room name already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET MESSAGES FOR A ROOM ─────────────────────────────
router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  try {
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