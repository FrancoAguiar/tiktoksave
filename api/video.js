// api/video.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const tiktokUrl = req.query.url;
  
  if (!tiktokUrl) {
    return res.status(400).json({ ok: false, error: 'Falta la URL de TikTok' });
  }

  try {
    // Intento 1: API de TikWM pública
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`);
    const json = await response.json();
    
    if (json.code === 0 && json.data) {
      return res.status(200).json({ ok: true, data: json.data });
    }

    // Intento 2: API de Ryzendesu (Respaldo)
    const res2 = await fetch(`https://api.ryzendesu.vip/api/downloader/ttdl?url=${encodeURIComponent(tiktokUrl)}`);
    const json2 = await res2.json();
    
    if (json2.data) {
      // Adaptamos la data para que el frontend la lea igual
      return res.status(200).json({ 
        ok: true, 
        data: {
          play: json2.data.play,
          music: json2.data.music,
          cover: json2.data.cover,
          author: { unique_id: json2.data.author.nickname },
          title: json2.data.title,
          digg_count: json2.data.digg_count,
          play_count: json2.data.play_count
        } 
      });
    }

    throw new Error('Todas las APIs fallaron');
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'No se pudo obtener el video de TikTok. Probá de nuevo.' });
  }
}
