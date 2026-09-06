import jwt from 'jsonwebtoken';

export const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  return jwt.sign(payload, secret, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  return jwt.verify(token, secret);
};

export const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key';
  return jwt.verify(token, secret);
};
