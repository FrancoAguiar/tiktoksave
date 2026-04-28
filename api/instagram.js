export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });

  // Limpieza total del enlace (sacamos el rastreo y forzamos el formato)
  igUrl = igUrl.split('?')[0];
  if (!igUrl.endsWith('/')) igUrl += '/';

  // =====================================================================
  // MÉTODO 1: Enjambre de instancias Cobalt (Las más rápidas y blindadas)
  // =====================================================================
  const cobaltInstances = [
    'https://api.cobalt.tools/api/json', // Oficial
    'https://co.wuk.sh/api/json',        // Comunitaria muy estable
    'https://cobalt.mrrudy.dev/api/json' // Respaldo
  ];

  for (let instance of cobaltInstances) {
    try {
      // Calculamos el dominio base para engañar a la seguridad de la API
      const origin = instance.replace('/api/json', '');
      
      const resCobalt = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Origin': origin,
          'Referer': origin + '/'
        },
        body: JSON.stringify({ url: igUrl })
      });
      
      if (!resCobalt.ok) continue; 
      
      const dataCobalt = await resCobalt.json();
      
      // Cobalt puede devolver el link directo o un "picker" si es un carrusel
      let finalUrl = dataCobalt.url;
      if (!finalUrl && dataCobalt.picker && dataCobalt.picker.length > 0) {
        // Si es carrusel, agarramos el primer archivo
        finalUrl = dataCobalt.picker[0].url;
      }
      
      if (finalUrl) {
        return res.status(200).json({ ok: true, data: { download: finalUrl, thumb: '' } });
      }
    } catch (e) {
      console.log(`Fallo instancia Cobalt: ${instance}`);
    }
  }

  // =====================================================================
  // MÉTODO 2: APIs asiáticas de bots (Cambian de proxy constantemente)
  // =====================================================================
  const botApis = [
    `https://api.agatz.my.id/api/instagram?url=${encodeURIComponent(igUrl)}`,
    `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(igUrl)}`
  ];

  for (let api of botApis) {
    try {
      const response = await fetch(api, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { continue; }

      let dlUrl = null;

      // Normalizamos la respuesta según qué API haya funcionado
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
         dlUrl = json.data[0].url || json.data[0];
      } else if (json.data && json.data.url) {
         dlUrl = json.data.url;
      }

      if (dlUrl && dlUrl.startsWith('http')) {
        return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: '' } });
      }
    } catch (e) {
      continue;
    }
  }

  // =====================================================================
  // MÉTODO 3: Extracción rústica del Embed Oficial de Instagram
  // =====================================================================
  try {
    const shortcodeMatch = igUrl.match(/(?:reel|p|tv)\/([^/?]+)/);
    if (shortcodeMatch) {
      const shortcode = shortcodeMatch[1];
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      
      const embedRes = await fetch(embedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      const embedHtml = await embedRes.text();
      const videoMatch = embedHtml.match(/"video_url"\s*:\s*"([^"]+)"/);
      
      if (videoMatch) {
        const dlUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: '' } });
      }
    }
  } catch(e) {}

  // =====================================================================
  // SI TODO FALLA
  // =====================================================================
  return res.status(502).json({ 
    ok: false, 
    error: 'Instagram bloqueó la descarga en todos los servidores. Verificá que el Reel sea público o intentá en 5 minutos.' 
  });
}
