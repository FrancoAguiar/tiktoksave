/**
 * /api/proxy.js  →  Vercel Serverless Function
 * GET /api/proxy?url=<cdn_url>
 *
 * Streams TikTok CDN video/audio through this server so the browser
 * can download it without CORS errors.
 *
 * Security: only URLs from the ALLOWED_CDN list are proxied.
 */

const axios        = require('axios');
const { isCdnAllowed } = require('./services/tiktok');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ ok: false, error: 'Missing url parameter.' });
  }

  if (!isCdnAllowed(url)) {
    return res.status(403).json({ ok: false, error: 'URL not from an allowed CDN.' });
  }

  try {
    const upstream = await axios.get(url, {
      responseType: 'stream',
      timeout     : 30_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
      },
    });

    const ct = upstream.headers['content-type'] || 'video/mp4';
    const cl = upstream.headers['content-length'];

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', 'attachment; filename="tokless-video.mp4"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    if (cl) res.setHeader('Content-Length', cl);

    upstream.data.pipe(res);
  } catch (err) {
    console.error('[proxy] error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ ok: false, error: 'Failed to fetch from CDN.' });
    }
  }
};
