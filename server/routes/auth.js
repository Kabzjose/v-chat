import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// helper — generates a JWT token for a user
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, avatar: user.avatar || null },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // token expires in 7 days
  );
};

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar || null
});

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  try {
    // hash the password — 10 is the "salt rounds" (how complex the hash is)
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3) RETURNING id, username, email, avatar`,
      [username, email, hashed]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user: serializeUser(user), token });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── LOGIN ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'All fields required' });

  try {
    const result = await pool.query(
      `SELECT id, username, email, password, avatar FROM users WHERE email = $1`, [email]
    );

    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ error: 'Invalid credentials' });

    // compare the input password against the stored hash
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GOOGLE OAUTH ────────────────────────────────────────
    res.json({ user: serializeUser(user), token });
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.BASE_URL + '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {

// ─── UPDATE PROFILE ────────────────────────────────────
router.put('/profile', verifyToken, async (req, res) => {
  const { username, email, avatar } = req.body;
  const updates = [];
  const values = [];

  if (typeof username === 'string') {
    const nextUsername = username.trim();
    if (!nextUsername) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }
    updates.push(`username = $${values.length + 1}`);
    values.push(nextUsername);
  }

  if (typeof email === 'string') {
    const nextEmail = email.trim();
    if (!nextEmail) {
      return res.status(400).json({ error: 'Email cannot be empty' });
    }
    updates.push(`email = $${values.length + 1}`);
    values.push(nextEmail);
  }

  if (avatar !== undefined) {
    updates.push(`avatar = $${values.length + 1}`);
    values.push(avatar === '' ? null : avatar);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No changes provided' });
  }

  try {
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, username, email, avatar`,
      values
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.json({ user: serializeUser(user), token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    res.status(500).json({ error: 'Server error' });
  }
});
  try {
    // check if user already exists
    let result = await pool.query(
      `SELECT * FROM users WHERE google_id = $1`, [profile.id]
    );

    let user = result.rows[0];

    if (!user) {
      // first time Google login — create the user
      const inserted = await pool.query(
        `INSERT INTO users (username, email, google_id, avatar)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          profile.displayName,
          profile.emails[0].value,
          profile.id,
          profile.photos[0].value
        ]
      );
      user = inserted.rows[0];
    }

    done(null, user); // pass user to next step
  } catch (err) {
    done(err, null);
  }
}));

// redirect user to Google login page
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google redirects back here after login
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    // send token to frontend via URL param
    res.redirect(process.env.CLIENT_URL + '/auth/callback?token=' + token);
  }
);

export default router;