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
    subject: 'Recuperacio de contrasenya - PACFGM Quest',
    text: `Hola ${nom},\n\nHas sol·licitat recuperar la contrasenya de PACFGM Quest.\n\nFes clic a aquest enllaç per crear-ne una de nova:\n${link}\n\nAquest enllaç caduca en 1 hora. Si no has fet aquesta sol·licitud, ignora aquest correu.\n\nPACFGM Quest`,
    html: `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:8px;padding:32px;font-family:Arial,sans-serif;color:#e0e0e0;max-width:480px;">
        <tr><td style="padding-bottom:24px;">
          <h2 style="margin:0;color:#ffd700;font-family:monospace;letter-spacing:2px;font-size:18px;">PACFGM QUEST</h2>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <p style="margin:0;">Hola <strong>${nom}</strong>,</p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;">Has sol·licitat recuperar la contrasenya. Fes clic al botó per crear-ne una de nova:</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${link}" style="display:inline-block;background:#ffd700;color:#1a1a2e;padding:14px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:monospace;letter-spacing:1px;">CANVIAR CONTRASENYA</a>
        </td></tr>
        <tr><td>
          <p style="margin:0;color:#888;font-size:12px;">Aquest enllaç caduca en 1 hora. Si no has fet aquesta sol·licitud, ignora aquest correu.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

async function enviarBenvinguda(email, nom, alias) {
  const appUrl = process.env.APP_URL || 'https://quest.sinilos.com';

  const transport = getTransport();
  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Benvingut a PACFGM Quest!',
    text: `Hola ${nom}!\n\nEl teu compte s'ha creat correctament. El teu alias és: ${alias}\n\nPots accedir a l'aplicació i començar a estudiar:\n${appUrl}\n\nBona sort!\n\nPACFGM Quest`,
    html: `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:8px;padding:32px;font-family:Arial,sans-serif;color:#e0e0e0;max-width:480px;">
        <tr><td style="padding-bottom:24px;">
          <h2 style="margin:0;color:#ffd700;font-family:monospace;letter-spacing:2px;font-size:18px;">PACFGM QUEST</h2>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <p style="margin:0;">Hola <strong>${nom}</strong>!</p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <p style="margin:0;">El teu compte s'ha creat correctament. El teu alias és: <strong style="color:#39ff14;">${alias}</strong></p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;">Pots accedir a l'aplicació i començar a estudiar:</p>
        </td></tr>
        <tr><td align="center">
          <a href="${appUrl}" style="display:inline-block;background:#ffd700;color:#1a1a2e;padding:14px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:monospace;letter-spacing:1px;">ACCEDIR</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

async function enviarVerificacioEmail(email, nom, token) {
  const baseUrl = process.env.APP_URL || 'https://quest.sinilos.com';
  const link = `${baseUrl}/verificar-email?token=${token}`;

  const transport = getTransport();
  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Verifica el teu compte - PACFGM Quest',
    text: `Hola ${nom}!\n\nGracies per registrar-te a PACFGM Quest. Per activar el teu compte, visita aquest enllaç:\n${link}\n\nAquest enllaç caduca en 24 hores. Si no t'has registrat, ignora aquest correu.\n\nPACFGM Quest`,
    html: `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:8px;padding:32px;font-family:Arial,sans-serif;color:#e0e0e0;max-width:480px;">
        <tr><td style="padding-bottom:24px;">
          <h2 style="margin:0;color:#39ff14;font-family:monospace;letter-spacing:2px;font-size:18px;">PACFGM QUEST</h2>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <p style="margin:0;">Hola <strong>${nom}</strong>!</p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;">Gracies per registrar-te. Per activar el teu compte, fes clic al botó:</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${link}" style="display:inline-block;background:#39ff14;color:#080c14;padding:14px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-family:monospace;letter-spacing:1px;">VERIFICAR COMPTE</a>
        </td></tr>
        <tr><td>
          <p style="margin:0;color:#888;font-size:12px;">Aquest enllaç caduca en 24 hores. Si no t'has registrat, ignora aquest correu.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

async function enviarFeedback({ alias, tipus, descripcio, url_page }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const transport = getTransport();
  const tipusLabel = { bug: 'BUG', suggeriment: 'SUGGERIMENT', pregunta: 'PREGUNTA' }[tipus] || tipus;
  const tipusEmoji = { bug: '🐛', suggeriment: '💡', pregunta: '❓' }[tipus] || '';

  await transport.sendMail({
    from:    `"PACFGM Quest" <${process.env.SMTP_USER}>`,
    to:      adminEmail,
    subject: `[PACFGM Quest] ${tipusLabel} de ${alias}`,
    text: `${tipusLabel} de ${alias}\n\n${url_page ? `Pagina: ${url_page}\n\n` : ''}${descripcio}\n\nPACFGM Quest`,
    html: `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:8px;padding:32px;font-family:Arial,sans-serif;color:#e0e0e0;max-width:540px;">
        <tr><td style="padding-bottom:24px;">
          <h2 style="margin:0;color:#ffd700;font-family:monospace;letter-spacing:2px;font-size:18px;">PACFGM QUEST &mdash; ${tipusEmoji} ${tipusLabel}</h2>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <p style="margin:0;"><strong>Usuari:</strong> ${alias}</p>
        </td></tr>
        ${url_page ? `<tr><td style="padding-bottom:8px;"><p style="margin:0;"><strong>Pagina:</strong> ${url_page}</p></td></tr>` : ''}
        <tr><td>
          <div style="background:#0d1117;border-left:4px solid #ffd700;padding:16px;border-radius:4px;">
            <p style="margin:0;white-space:pre-wrap;">${descripcio}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

module.exports = { enviarRecuperacioContrasenya, enviarBenvinguda, enviarFeedback, enviarVerificacioEmail };
