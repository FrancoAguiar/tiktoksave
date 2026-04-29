export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });

  // Agregamos soporte para /reels/ con 's' por si acaso
  const shortcodeMatch = igUrl.match(/(?:reel|reels|p|tv)\/([^/?]+)/);
  if (!shortcodeMatch) {
    return res.status(400).json({ ok: false, error: 'El enlace de Instagram no es válido.' });
  }
  const shortcode = shortcodeMatch[1];

  const RAPIDAPI_KEY = '873c72c332msh2a0a5a4051f7217p109503jsn693569b8315a'; 
  const RAPIDAPI_HOST = 'instagram-best-experience.p.rapidapi.com';

  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}/post?shortcode=${shortcode}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch(e) {
        return res.status(502).json({ ok: false, error: 'La API devolvió un formato incorrecto.' });
    }

    // Si RapidAPI tira un mensaje de error propio (ej: límite alcanzado)
    if (json.message && !json.data) {
        return res.status(502).json({ ok: false, error: `RapidAPI dice: ${json.message}` });
    }

    // ── ESCÁNER AGRESIVO DE MP4 ──
    const jsonString = JSON.stringify(json);
    let dlUrl = null;
    let thumbUrl = '';

    // Buscamos cualquier enlace que termine en .mp4
    const mp4Match = jsonString.match(/(https:\/\/[^"']+\.mp4[^"']*)/);
    if (mp4Match) {
        dlUrl = mp4Match[1];
    } else {
        // Fallback: buscamos una etiqueta que diga video_url
        const videoMatch = jsonString.match(/"video_url"\s*:\s*"([^"]+)"/);
        if (videoMatch) dlUrl = videoMatch[1];
    }

    // Buscamos la miniatura
    const thumbMatch = jsonString.match(/"(thumbnail_url|display_url)"\s*:\s*"([^"]+)"/);
    if (thumbMatch) thumbUrl = thumbMatch[2];

    if (dlUrl) {
      // Limpiamos la basura del link
      dlUrl = dlUrl.replace(/\\u0026/g, '&').replace(/\\/g, '');
      if (thumbUrl) thumbUrl = thumbUrl.replace(/\\u0026/g, '&').replace(/\\/g, '');
      
      return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: thumbUrl } });
    } else {
      // SI FALLA: Imprimimos los primeros 150 caracteres de lo que mandó la API para investigar
      const debugData = jsonString.substring(0, 150);
      return res.status(502).json({ 
        ok: false, 
        error: `API falló. Reporte: ${debugData}` 
      });
    }
    
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Error de conexión con RapidAPI.' });
  }
}
