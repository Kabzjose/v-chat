import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  // token comes in the header like: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();             // move on to the actual route
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};