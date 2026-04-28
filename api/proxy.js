// api/proxy.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const fileUrl = req.query.url;
  
  if (!fileUrl) return res.status(400).send('Falta URL');

  try {
    const upstream = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.instagram.com/'
      }
    });

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const ext = contentType.includes('audio') ? 'mp3' : 'mp4';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="tikdrop.${ext}"`);
    
    // Leemos el archivo y lo enviamos al usuario
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    // Si el proxy falla, lo mandamos al link original para que no se quede sin video
    res.redirect(fileUrl);
  }
}
