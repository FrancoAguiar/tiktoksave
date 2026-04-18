export default async function handler(req, res) {
  // 1. Configuramos CORS para que tu frontend pueda llamarlo
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Obtenemos la URL
  let igUrl = req.query.url;
  if (!igUrl) {
    return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });
  }

  // Limpiamos basura del link
  igUrl = igUrl.split('?')[0];

  // 3. Lista de APIs a probar (Ejecutándose desde los servidores de Vercel)
  const apis = [
    `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(igUrl)}`,
    `https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(igUrl)}`,
    `https://bk9.fun/download/instagram?url=${encodeURIComponent(igUrl)}`
  ];

  for (let api of apis) {
    try {
      const response = await fetch(api, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      const text = await response.text();
      let json;
      
      try {
        json = JSON.parse(text);
      } catch (e) {
        continue; // Si explota al leer el JSON, probamos la siguiente API
      }

      let dlUrl = null;
      let thumb = '';

      // Mapeo según la API
      if (json.data && json.data.url) {
        dlUrl = json.data.url;
      } else if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        dlUrl = json.data[0].url;
        thumb = json.data[0].thumbnail || '';
      } else if (json.BK9 && Array.isArray(json.BK9) && json.BK9.length > 0) {
        dlUrl = json.BK9[0].url;
      }

      if (dlUrl && dlUrl.includes('http')) {
        return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: thumb } });
      }
    } catch (e) {
      // Ignorar errores de red y seguir intentando
      continue; 
    }
  }

  // Si fallan todas las APIs, probamos el Embed directo
  try {
    const shortcodeMatch = igUrl.match(/(?:reel|p|tv)\/([^/?]+)/);
    if (shortcodeMatch) {
      const shortcode = shortcodeMatch[1];
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      
      const embedRes = await fetch(embedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      const embedHtml = await embedRes.text();
      const videoMatch = embedHtml.match(/"video_url"\s*:\s*"([^"]+)"/);
      
      if (videoMatch) {
        const dlUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: '' } });
      }
    }
  } catch(e) {}

  return res.status(502).json({ 
    ok: false, 
    error: 'Instagram bloqueó las APIs. Verificá que el Reel sea público o probá en un rato.' 
  });
}
