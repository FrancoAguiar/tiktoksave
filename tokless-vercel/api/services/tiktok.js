/**
 * api/services/tiktok.js
 * Shared logic for all serverless functions.
 * Fetches TikTok video data with automatic provider fallback.
 */

const axios = require('axios');

const http = axios.create({
  timeout: 15_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
});

// ── URL validation ────────────────────────────────────────────────────────────
const TIKTOK_RE = /https?:\/\/(www\.)?(vm\.|vt\.)?tiktok\.com\/[@\w\-./?=&%]+/i;

function isValidTiktokUrl(url) {
  return typeof url === 'string' && TIKTOK_RE.test(url.trim());
}

// ── Normalise provider responses into one clean shape ─────────────────────────
function normalise(raw, provider) {
  if (provider === 'tikwm') {
    return {
      id      : raw.id       || null,
      title   : raw.title    || '',
      cover   : raw.cover    || raw.origin_cover || null,
      author  : {
        username : raw.author?.unique_id || null,
        nickname : raw.author?.nickname  || null,
        avatar   : raw.author?.avatar    || null,
      },
      stats: {
        plays    : raw.play_count    || 0,
        likes    : raw.digg_count    || 0,
        comments : raw.comment_count || 0,
        shares   : raw.share_count   || 0,
      },
      duration  : raw.duration || null,
      downloads : {
        hd        : raw.hdplay  || null,
        sd        : raw.play    || null,
        watermark : raw.wmplay  || null,
        audio     : raw.music   || null,
      },
    };
  }

  if (provider === 'rapidapi') {
    const v = raw.data || raw;
    return {
      id      : v.id    || null,
      title   : v.desc  || v.title || '',
      cover   : v.cover || v.thumbnail || null,
      author  : {
        username : v.author?.uniqueId || null,
        nickname : v.author?.nickname || null,
        avatar   : v.author?.avatarThumb || null,
      },
      stats: {
        plays    : v.playCount    || 0,
        likes    : v.diggCount    || 0,
        comments : v.commentCount || 0,
        shares   : v.shareCount   || 0,
      },
      duration  : v.duration || null,
      downloads : {
        hd        : v.hdVideo || v.videoUrl || null,
        sd        : v.videoUrl || null,
        watermark : v.videoUrlWatermark || null,
        audio     : v.musicUrl || null,
      },
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ── Provider 1: tikwm.com (free, no key needed) ───────────────────────────────
async function fromTikwm(url) {
  const params = new URLSearchParams({ url, hd: '1' });
  if (process.env.TIKWM_TOKEN) params.set('token', process.env.TIKWM_TOKEN);

  const { data } = await http.get(`https://tikwm.com/api/?${params}`);
  if (!data || data.code !== 0 || !data.data) {
    throw new Error(data?.msg || 'tikwm: no data returned');
  }
  return normalise(data.data, 'tikwm');
}

// ── Provider 2: RapidAPI (optional fallback) ──────────────────────────────────
async function fromRapidApi(url) {
  if (!process.env.RAPIDAPI_KEY) throw new Error('RAPIDAPI_KEY not set — skipping');

  const { data } = await http.get(
    'https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/index',
    {
      params : { url },
      headers: {
        'X-RapidAPI-Key' : process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host':
          'tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com',
      },
    }
  );

  if (!data?.video?.length && !data?.data) throw new Error('RapidAPI: no data');
  return normalise(data, 'rapidapi');
}

// ── Main export ───────────────────────────────────────────────────────────────
async function getVideoInfo(url) {
  if (!isValidTiktokUrl(url)) {
    const e = new Error('Invalid or unsupported TikTok URL.');
    e.status = 400;
    throw e;
  }

  const providers = [
    { name: 'tikwm',    fn: () => fromTikwm(url)    },
    { name: 'rapidapi', fn: () => fromRapidApi(url) },
  ];

  let lastError;
  for (const p of providers) {
    try {
      const result = await p.fn();
      return result;
    } catch (err) {
      console.warn(`[tiktok] ${p.name} failed: ${err.message}`);
      lastError = err;
    }
  }

  const final = new Error(
    'Could not retrieve video. The link may be private, removed, or invalid.'
  );
  final.status = 502;
  final.cause  = lastError;
  throw final;
}

// ── CDN allowlist (used by proxy function) ────────────────────────────────────
const ALLOWED_CDN = ['tiktokcdn.com', 'tiktokv.com', 'muscdn.com', 'tikwm.com'];

function isCdnAllowed(rawUrl) {
  try {
    const { hostname } = new URL(rawUrl);
    return ALLOWED_CDN.some(d => hostname.endsWith(d));
  } catch {
    return false;
  }
}

module.exports = { getVideoInfo, isValidTiktokUrl, isCdnAllowed };
