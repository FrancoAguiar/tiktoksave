export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });

  const shortcodeMatch = igUrl.match(/(?:reel|p|tv)\/([^/?]+)/);
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
    
    const json = await response.json();

    let dlUrl = null;
    let thumbUrl = ''; // Agregamos la variable para atrapar la miniatura

    // Lógica para video y miniatura
    if (json.data && json.data.items && json.data.items[0]) {
        const item = json.data.items[0];
        
        // 1. Extraer video
        if (item.video_versions && item.video_versions.length > 0) {
            dlUrl = item.video_versions[0].url; 
        }
        
        // 2. Extraer miniatura (cover)
        if (item.image_versions2 && item.image_versions2.candidates && item.image_versions2.candidates.length > 0) {
            thumbUrl = item.image_versions2.candidates[0].url;
        }
    } 

    // Respaldos por si la API cambia su estructura levemente
    if (!dlUrl && json.video_url) dlUrl = json.video_url;
    if (!dlUrl && json.data && json.data.video_url) dlUrl = json.data.video_url;
    if (!thumbUrl && json.thumbnail_url) thumbUrl = json.thumbnail_url;

    if (dlUrl) {
      dlUrl = dlUrl.replace(/\\u0026/g, '&');
      if (thumbUrl) thumbUrl = thumbUrl.replace(/\\u0026/g, '&');
      
      return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: thumbUrl } });
    } else {
      return res.status(502).json({ ok: false, error: 'La API no encontró el video. Verificá que no sea una foto.' });
    }
    
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Error de conexión con RapidAPI.' });
  }
}
