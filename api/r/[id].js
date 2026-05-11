/**
 * api/r/[id].js  —  Stavy Tracking Redirect
 *
 * Registra cada escaneo de QR/NFC en Supabase y redirige
 * al usuario a la página de reseñas de Google del bar.
 *
 * Ejemplo de URL: https://tu-proyecto.vercel.app/r/alambique-sabina
 */

const crypto = require('crypto');

// Fallback de URLs por bar_id (cuando Supabase no está configurado)
// Añade aquí cada nuevo cliente
const BARES_FALLBACK = {
  'alambique-sabina': {
    nombre: 'El Alambique de la Sabina',
    google_maps_review_url: 'https://www.google.com/maps/place/El+Alambique+de+la+Sabina/@41.6444211,-0.8972779,711m/data=!3m1!1e3!4m18!1m9!3m8!1s0xd5914d0786e5d11:0xa9d78a226c2ed264!2sEl+Alambique+de+la+Sabina!8m2!3d41.6444211!4d-0.8972779!9m1!1b1!16s%2Fg%2F1q62mttfc!3m7!1s0xd5914d0786e5d11:0xa9d78a226c2ed264!8m2!3d41.6444211!4d-0.8972779!9m1!1b1!16s%2Fg%2F1q62mttfc?entry=ttu&g_ep=EgoyMDI2MDUwNi4wIKXMDSoASAFQAw%3D%3D'
  }
};

module.exports = async (req, res) => {
  const { id } = req.query;

  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    return res.redirect(302, '/');
  }

  let googleMapsUrl = null;

  // 1. Intentar Supabase si está configurado
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/bares?id=eq.${encodeURIComponent(id)}&select=nombre,google_maps_review_url`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        }
      );
      if (resp.ok) {
        const rows = await resp.json();
        if (rows?.length > 0 && rows[0].google_maps_review_url) {
          googleMapsUrl = rows[0].google_maps_review_url;
        }
      }
    } catch (e) {
      console.error('[track] Supabase lookup error:', e.message);
    }
  }

  // 2. Fallback hardcoded
  if (!googleMapsUrl && BARES_FALLBACK[id]) {
    googleMapsUrl = BARES_FALLBACK[id].google_maps_review_url;
  }

  if (!googleMapsUrl) {
    return res.redirect(302, '/');
  }

  // 3. Registrar el scan
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const ipRaw = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
      const ipHash = crypto.createHash('sha256').update(ipRaw + SUPABASE_SERVICE_KEY).digest('hex').slice(0, 16);
      const userAgent = (req.headers['user-agent'] || '').slice(0, 250);
      const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);

      await fetch(`${SUPABASE_URL}/rest/v1/scans`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          bar_id:    id,
          timestamp: new Date().toISOString(),
          ip_hash:   ipHash,
          user_agent: userAgent,
          source:    isMobile ? 'qr_mobile' : 'qr_desktop',
          is_mobile: isMobile
        })
      });
    } catch (e) {
      console.error('[track] Error registrando scan:', e.message);
      // No bloqueamos la redirección
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, googleMapsUrl);
};
