export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ ok: false, error: 'Falta la URL de Instagram' });

  // 1. Extraemos el "shortcode" del enlace (ej: de /reel/C123XYZ/ saca C123XYZ)
  const shortcodeMatch = igUrl.match(/(?:reel|p|tv)\/([^/?]+)/);
  if (!shortcodeMatch) {
    return res.status(400).json({ ok: false, error: 'El enlace de Instagram no es válido.' });
  }
  const shortcode = shortcodeMatch[1];

  // 2. Tus credenciales de RapidAPI (Instagram Best Experience)
  const RAPIDAPI_KEY = '873c72c332msh2a0a5a4051f7217p109503jsn693569b8315a'; 
  const RAPIDAPI_HOST = 'instagram-best-experience.p.rapidapi.com';

  try {
    // 3. Llamamos a la API pasándole solo el shortcode
    const response = await fetch(`https://${RAPIDAPI_HOST}/post?shortcode=${shortcode}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const json = await response.json();

    // 4. Lógica "Atrapa-MP4" (Buscamos el link del video en la respuesta)
    let dlUrl = null;

    if (json.data && json.data.video_url) {
        dlUrl = json.data.video_url;
    } else if (json.data && json.data.items && json.data.items[0] && json.data.items[0].video_versions) {
        // Formato nativo de Instagram
        dlUrl = json.data.items[0].video_versions[0].url; 
    } else if (json.video_url) {
        dlUrl = json.video_url;
    } else {
        // Modo tanque: Si cambiaron el formato, escaneamos todo el texto buscando un mp4
        const jsonString = JSON.stringify(json);
        const match = jsonString.match(/"(https:\/\/[^"]+\.mp4[^"]*)"/);
        if (match) dlUrl = match[1];
    }

    if (dlUrl) {
      // Limpiamos el link por si viene con caracteres raros
      dlUrl = dlUrl.replace(/\\u0026/g, '&');
      return res.status(200).json({ ok: true, data: { download: dlUrl, thumb: '' } });
    } else {
      return res.status(502).json({ 
        ok: false, 
        error: 'La API no encontró el video. Verificá que no sea una foto o una cuenta privada.' 
      });
    }
    
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Error de conexión con RapidAPI.' });
  }
}
