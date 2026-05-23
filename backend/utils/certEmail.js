const nodemailer = require('nodemailer');

function createTransport() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
}

const BRAND = {
    name: process.env.LAB_PLATFORM_NAME || 'QualiCore',
    from: process.env.SMTP_FROM_EMAIL || 'noreply@qualicore.com',
    fromName: process.env.SMTP_FROM_NAME || 'QualiCore Certification Authority',
    verifyBase: process.env.CERT_VERIFY_URL || 'https://certification-rosy.vercel.app'
};

function wrap(content) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;border:1px solid rgba(13,148,136,0.2);overflow:hidden;">
        <tr><td style="background:#0d9488;padding:8px 0;text-align:center;font-size:11px;font-weight:900;color:#fff;letter-spacing:3px;">
          QUALICORE CERTIFICATION AUTHORITY
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;width:60px;height:60px;background:#0d9488;border-radius:14px;line-height:60px;font-size:28px;font-weight:900;color:#fff;">Q</div>
          </div>
          ${content}
          <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:10px;color:#475569;">
            QualiCore Certification Authority · This is an automated notification
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendApplicationReceived(toEmail, applicantName, certType) {
    const t = createTransport();
    if (!t) return;
    await t.sendMail({
        from: `"${BRAND.fromName}" <${BRAND.from}>`,
        to: toEmail,
        subject: `✅ Application Received — ${certType}`,
        html: wrap(`
          <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Application Received</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Your certification application has been successfully submitted.</p>
          <table width="100%" style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.06);" cellpadding="0" cellspacing="0">
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:4px;">APPLICANT</td></tr>
            <tr><td style="color:#fff;font-size:16px;font-weight:700;padding-bottom:16px;">${applicantName}</td></tr>
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:4px;">CERTIFICATION APPLIED FOR</td></tr>
            <tr><td style="color:#2dd4bf;font-size:16px;font-weight:700;">${certType}</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;margin:24px 0 0;text-align:center;">You will be notified by email once a decision has been made. This typically takes 3–5 business days.</p>
        `)
    });
}

async function sendApplicationApproved(toEmail, applicantName, certType, credentialNumber, verifyHash) {
    const t = createTransport();
    if (!t) return;
    const verifyUrl = `${BRAND.verifyBase}/verify/${credentialNumber}`;
    await t.sendMail({
        from: `"${BRAND.fromName}" <${BRAND.from}>`,
        to: toEmail,
        subject: `🎓 Congratulations! Your ${certType} Credential Has Been Issued`,
        html: wrap(`
          <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Congratulations, ${applicantName}!</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Your application has been <strong style="color:#10b981;">approved</strong>. Your professional credential has been issued.</p>
          <table width="100%" style="background:rgba(13,148,136,0.08);border-radius:12px;padding:20px;border:1px solid rgba(13,148,136,0.2);" cellpadding="0" cellspacing="0">
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:4px;">CREDENTIAL</td></tr>
            <tr><td style="color:#2dd4bf;font-size:18px;font-weight:900;padding-bottom:16px;">${certType}</td></tr>
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:4px;">CREDENTIAL NUMBER</td></tr>
            <tr><td style="color:#fff;font-size:14px;font-family:monospace;padding-bottom:16px;">${credentialNumber}</td></tr>
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:4px;">VERIFICATION LINK</td></tr>
            <tr><td><a href="${verifyUrl}" style="color:#2dd4bf;font-size:13px;">${verifyUrl}</a></td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;margin:24px 0 0;text-align:center;">Log in to your portal to download your official PDF certificate.</p>
          <div style="text-align:center;margin-top:20px;">
            <a href="${BRAND.verifyBase}/dashboard" style="display:inline-block;padding:12px 28px;background:#0d9488;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;font-size:12px;letter-spacing:1px;">VIEW MY CREDENTIALS →</a>
          </div>
        `)
    });
}

async function sendApplicationRejected(toEmail, applicantName, certType, notes) {
    const t = createTransport();
    if (!t) return;
    await t.sendMail({
        from: `"${BRAND.fromName}" <${BRAND.from}>`,
        to: toEmail,
        subject: `Application Update — ${certType}`,
        html: wrap(`
          <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Application Update</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Dear ${applicantName}, after careful review, your application for <strong style="color:#f87171;">${certType}</strong> was not approved at this time.</p>
          ${notes ? `<table width="100%" style="background:rgba(239,68,68,0.06);border-radius:12px;padding:20px;border:1px solid rgba(239,68,68,0.15);" cellpadding="0" cellspacing="0">
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:8px;">REVIEWER NOTES</td></tr>
            <tr><td style="color:#cbd5e1;font-size:14px;">${notes}</td></tr>
          </table>` : ''}
          <p style="color:#64748b;font-size:13px;margin:24px 0 0;text-align:center;">You may re-apply after addressing the feedback above. Log in to view your full application history.</p>
        `)
    });
}

async function sendMoreInfoRequired(toEmail, applicantName, certType, notes) {
    const t = createTransport();
    if (!t) return;
    await t.sendMail({
        from: `"${BRAND.fromName}" <${BRAND.from}>`,
        to: toEmail,
        subject: `Action Required — ${certType} Application`,
        html: wrap(`
          <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Additional Information Required</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Dear ${applicantName}, our review team requires additional information for your <strong style="color:#fbbf24;">${certType}</strong> application.</p>
          ${notes ? `<table width="100%" style="background:rgba(251,191,36,0.06);border-radius:12px;padding:20px;border:1px solid rgba(251,191,36,0.2);" cellpadding="0" cellspacing="0">
            <tr><td style="color:#64748b;font-size:10px;font-weight:900;letter-spacing:2px;padding-bottom:8px;">WHAT IS NEEDED</td></tr>
            <tr><td style="color:#cbd5e1;font-size:14px;">${notes}</td></tr>
          </table>` : ''}
          <div style="text-align:center;margin-top:24px;">
            <a href="${BRAND.verifyBase}/apply" style="display:inline-block;padding:12px 28px;background:#d97706;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;font-size:12px;letter-spacing:1px;">UPDATE APPLICATION →</a>
          </div>
        `)
    });
}

async function sendExpiryWarning(toEmail, applicantName, credType, credNumber, expiryDate) {
    const t = createTransport();
    if (!t) return;
    await t.sendMail({
        from: `"${BRAND.fromName}" <${BRAND.from}>`,
        to: toEmail,
        subject: `⚠️ Credential Expiring Soon — ${credType}`,
        html: wrap(`
          <h2 style="color:#fff;font-size:22px;margin:0 0 8px;">Your Credential Expires Soon</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Dear ${applicantName}, your <strong style="color:#fbbf24;">${credType}</strong> credential (${credNumber}) expires on <strong style="color:#f87171;">${new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
          <div style="text-align:center;margin-top:24px;">
            <a href="${BRAND.verifyBase}/renew" style="display:inline-block;padding:12px 28px;background:#d97706;color:#fff;text-decoration:none;border-radius:10px;font-weight:900;font-size:12px;letter-spacing:1px;">APPLY FOR RENEWAL →</a>
          </div>
        `)
    });
}

module.exports = { sendApplicationReceived, sendApplicationApproved, sendApplicationRejected, sendMoreInfoRequired, sendExpiryWarning };
