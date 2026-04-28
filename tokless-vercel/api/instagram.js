// api/instagram.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });

  // Limpiamos la URL (chau ?igsh=)
  igUrl = igUrl.split('?')[0];

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
      try { json = JSON.parse(text); } catch (e) { continue; }

      let dlUrl = null;
      let thumb = '';

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
      continue; 
    }
  }

  return res.status(502).json({ 
    ok: false, 
    error: 'Instagram bloqueó la descarga. Verificá que el Reel sea público.' 
  });
}
