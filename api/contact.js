module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, negocio, telefono, poblacion } = req.body;

  if (!nombre || !negocio || !telefono) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_TO       = process.env.EMAIL_TO || 'zakaria.larbi.official@gmail.com';
  const EMAIL_FROM     = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY no configurada');
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [EMAIL_TO],
        subject: `Nuevo lead Stavy — ${negocio}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#faf8ff;border-radius:12px;">
            <h2 style="color:#2e1065;font-size:22px;font-weight:700;margin-bottom:4px;">Nuevo contacto desde Stavy</h2>
            <p style="color:#7c3aed;font-size:13px;margin-bottom:28px;">Solicitud de instalación recibida</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #ede9fe;color:#6b7280;font-size:13px;width:140px;">Nombre</td>
                <td style="padding:12px 0;border-bottom:1px solid #ede9fe;color:#0f0a1e;font-size:14px;font-weight:600;">${nombre}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #ede9fe;color:#6b7280;font-size:13px;">Negocio</td>
                <td style="padding:12px 0;border-bottom:1px solid #ede9fe;color:#0f0a1e;font-size:14px;font-weight:600;">${negocio}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #ede9fe;color:#6b7280;font-size:13px;">Teléfono</td>
                <td style="padding:12px 0;border-bottom:1px solid #ede9fe;color:#0f0a1e;font-size:14px;font-weight:600;">${telefono}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;color:#6b7280;font-size:13px;">Población</td>
                <td style="padding:12px 0;color:#0f0a1e;font-size:14px;font-weight:600;">${poblacion || '—'}</td>
              </tr>
            </table>
            <div style="margin-top:28px;background:#7c3aed;border-radius:8px;padding:16px;text-align:center;">
              <a href="tel:${telefono}" style="color:white;font-size:15px;font-weight:600;text-decoration:none;">Llamar a ${nombre}</a>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Error al enviar el email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
