/**
 * /api/video.js  →  Vercel Serverless Function
 * GET /api/video?url=<tiktok_url>
 */

const { getVideoInfo } = require('./services/tiktok');

// Simple in-memory rate limit (resets per cold start — good enough for free tier)
const hits = new Map();

function rateLimit(ip, max = 20, windowMs = 60_000) {
  const now  = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };

  if (now - entry.start > windowMs) {
    hits.set(ip, { count: 1, start: now });
    return false; // not limited
  }

  entry.count++;
  hits.set(ip, entry);
  return entry.count > max; // true = blocked
}

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
  if (rateLimit(ip)) {
    return res.status(429).json({
      ok   : false,
      error: 'Too many requests — please wait a moment and try again.',
    });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      ok   : false,
      error: 'Missing required query parameter: url',
    });
  }

  try {
    const data = await getVideoInfo(url);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ ok: false, error: err.message });
  }
};
