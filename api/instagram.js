export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });

  // Limpiamos los trackers de la URL
  igUrl = igUrl.split('?')[0];

  // =====================================================================
  // RED DE APIS DE NUEVA GENERACIÓN (Menos bloqueos de Vercel)
  // =====================================================================
  const apis = [
    `https://itzpire.com/download/instagram?url=${encodeURIComponent(igUrl)}`,
    `https://api.davidcyriltech.my.id/instagram?url=${encodeURIComponent(igUrl)}`,
    `https://api.nyxs.pw/dl/ig?url=${encodeURIComponent(igUrl)}`
  ];

  for (let api of apis) {
    try {
      const response = await fetch(api, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { continue; }

      let dlUrl = null;

      // Mapeo Itzpire
      if (json.status === "success" && json.data) {
         if (Array.isArray(json.data) && json.data.length > 0) dlUrl = json.data[0].url;
         else if (json.data.url) dlUrl = json.data.url;
      } 
      // Mapeo DavidCyril
      else if (json.video_url) {
         dlUrl = json.video_url;
      }
      // Mapeo Nyxs
      else if (json.result && Array.isArray(json.result) && json.result.length > 0) {
         dlUrl = json.result[0].url || json.result[0];
      }

      // Si encontramos un enlace válido, lo devolvemos y cortamos el bucle
      if (dlUrl && dlUrl.startsWith('http')) {
        return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: '' } });
      }
    } catch (e) {
      // Si esta API falla o está caída, pasamos a la siguiente en silencio
      continue;
    }
  }

  // Si las 3 APIs nuevas fallaron
  return res.status(502).json({ 
    ok: false, 
    error: 'Instagram bloqueó la descarga en todos los servidores. Verificá que el Reel sea público o intentá en 5 minutos.' 
  });
}
