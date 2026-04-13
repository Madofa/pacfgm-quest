const nodemailer = require('nodemailer');

function getTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function enviarRecuperacioContrasenya(email, nom, token) {
  const baseUrl = process.env.APP_URL || 'https://quest.sinilos.com';
  const link = `${baseUrl}/reset-password?token=${token}`;

  const transport = getTransport();
  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Recuperació de contrasenya — PACFGM Quest',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a2e;color:#e0e0e0;border-radius:8px;">
        <h2 style="color:#ffd700;font-family:monospace;letter-spacing:2px;">PACFGM QUEST</h2>
        <p>Hola <strong>${nom}</strong>,</p>
        <p>Has sol·licitat recuperar la contrasenya. Fes clic al botó per crear-ne una de nova:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${link}"
             style="background:#ffd700;color:#1a1a2e;padding:14px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:monospace;letter-spacing:1px;">
            CANVIAR CONTRASENYA
          </a>
        </div>
        <p style="color:#888;font-size:12px;">Aquest enllaç caduca en 1 hora. Si no has fet aquesta sol·licitud, ignora aquest correu.</p>
      </div>
    `,
  });
}

async function enviarBenvinguda(email, nom, alias) {
  const transport = getTransport();
  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Benvingut/da a PACFGM Quest!',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a2e;color:#e0e0e0;border-radius:8px;">
        <h2 style="color:#ffd700;font-family:monospace;letter-spacing:2px;">PACFGM QUEST</h2>
        <p>Hola <strong>${nom}</strong>!</p>
        <p>El teu compte s'ha creat correctament. El teu alias és: <strong style="color:#39ff14;">${alias}</strong></p>
        <p>Pots accedir a l'aplicació i començar a estudiar:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${process.env.APP_URL || 'https://quest.sinilos.com'}"
             style="background:#ffd700;color:#1a1a2e;padding:14px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:monospace;letter-spacing:1px;">
            ACCEDIR
          </a>
        </div>
      </div>
    `,
  });
}

async function enviarVerificacioEmail(email, nom, token) {
  const baseUrl = process.env.APP_URL || 'https://quest.sinilos.com';
  const link = `${baseUrl}/verificar-email?token=${token}`;

  const transport = getTransport();
  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Verifica el teu compte — PACFGM Quest',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a2e;color:#e0e0e0;border-radius:8px;">
        <h2 style="color:#39ff14;font-family:monospace;letter-spacing:2px;">PACFGM QUEST</h2>
        <p>Hola <strong>${nom}</strong>!</p>
        <p>Gràcies per registrar-te. Per activar el teu compte, fes clic al botó:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${link}"
             style="background:#39ff14;color:#080c14;padding:14px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:monospace;letter-spacing:1px;">
            VERIFICAR COMPTE
          </a>
        </div>
        <p style="color:#888;font-size:12px;">Aquest enllaç caduca en 24 hores. Si no t'has registrat, ignora aquest correu.</p>
      </div>
    `,
  });
}

async function enviarFeedback({ alias, tipus, descripcio, url_page }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const transport = getTransport();
  const tipusLabel = { bug: '🐛 BUG', suggeriment: '💡 SUGGERIMENT', pregunta: '❓ PREGUNTA' }[tipus] || tipus;
  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      adminEmail,
    subject: `[PACFGM Quest] ${tipusLabel} de ${alias}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#1a1a2e;color:#e0e0e0;border-radius:8px;">
        <h2 style="color:#ffd700;font-family:monospace;letter-spacing:2px;">PACFGM QUEST — ${tipusLabel}</h2>
        <p><strong>Usuari:</strong> ${alias}</p>
        ${url_page ? `<p><strong>Pàgina:</strong> ${url_page}</p>` : ''}
        <div style="background:#0d1117;border-left:4px solid #ffd700;padding:16px;margin:16px 0;border-radius:4px;">
          <p style="margin:0;white-space:pre-wrap;">${descripcio}</p>
        </div>
      </div>
    `,
  });
}

module.exports = { enviarRecuperacioContrasenya, enviarBenvinguda, enviarFeedback, enviarVerificacioEmail };
