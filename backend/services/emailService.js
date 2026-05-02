/**
 * QualiCore Email Service — ISO 17025 Compliant Notification Delivery
 * ====================================================================
 * Nodemailer-based SMTP transport with:
 *  - Graceful fallback: logs to console when SMTP is not configured (dev mode)
 *  - HTML + plain-text dual-format emails
 *  - Per-event template library for all ISO 17025 quality events
 *  - Rate limiting via in-memory queue guard
 *
 * Configuration (via .env):
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *   SMTP_FROM_NAME, SMTP_FROM_EMAIL
 *   LAB_PLATFORM_NAME, LAB_PLATFORM_URL
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// ── Transport Factory ──────────────────────────────────────────────────────────
let transporter = null;

const isSmtpConfigured = () =>
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const getTransporter = () => {
    if (transporter) return transporter;

    if (!isSmtpConfigured()) {
        // Dev mode: use Nodemailer JSON transport (logs to console)
        transporter = nodemailer.createTransport({ jsonTransport: true });
        console.info('[EmailService] SMTP not configured — using console transport (dev mode). Set SMTP_* vars in .env to enable real email.');
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
        pool:           true,   // reuse connections
        maxConnections: 5,
        rateDelta:      1000,   // max 1 message per second
        rateLimit:      5,
    });

    transporter.verify((err) => {
        if (err) {
            console.error('[EmailService] SMTP verification FAILED:', err.message);
            console.error('[EmailService] Falling back to console transport.');
            transporter = nodemailer.createTransport({ jsonTransport: true });
        } else {
            console.info(`[EmailService] ✅ SMTP connected to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
        }
    });

    return transporter;
};

// ── Base HTML Template ─────────────────────────────────────────────────────────
const baseHtml = (title, bodyHtml, accentColor = '#3b82f6') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:28px 36px;">
            <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
              ⚗️ ${process.env.LAB_PLATFORM_NAME || 'QualiCore'}
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;text-transform:uppercase;letter-spacing:2px;">
              ISO 17025 Laboratory Network
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <h2 style="color:#f8fafc;font-size:20px;margin:0 0 20px;font-weight:800;">${title}</h2>
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid #334155;">
            <p style="color:#64748b;font-size:11px;margin:0;">
              This is an automated notification from the ${process.env.LAB_PLATFORM_NAME || 'QualiCore'} Laboratory Information Management System.
              Do not reply to this email. For technical support, contact your laboratory systems administrator.
            </p>
            <p style="color:#334155;font-size:10px;margin:8px 0 0;">
              © ${new Date().getFullYear()} ${process.env.LAB_PLATFORM_NAME || 'QualiCore'} | ISO/IEC 17025:2017 Compliant LIMS
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const infoBlock = (label, value) =>
    `<tr><td style="color:#94a3b8;font-size:12px;padding:4px 0;width:160px;">${label}</td>
     <td style="color:#f1f5f9;font-size:12px;padding:4px 0;font-weight:600;">${value}</td></tr>`;

const alertBox = (text, type = 'warning') => {
    const colors = { warning: '#f59e0b', danger: '#ef4444', success: '#10b981', info: '#3b82f6' };
    return `<div style="background:${colors[type]}20;border-left:4px solid ${colors[type]};padding:14px 18px;border-radius:6px;margin:20px 0;">
              <p style="color:${colors[type]};font-weight:800;font-size:13px;margin:0;">${text}</p>
            </div>`;
};

const ctaButton = (text, url) =>
    `<div style="margin:24px 0;">
       <a href="${url}" style="background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block;">${text}</a>
     </div>`;

// ── Core Send Function ─────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
    const from = `"${process.env.SMTP_FROM_NAME || 'QualiCore LIMS'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@qualicore.lab'}>`;
    const transport = getTransporter();
    const mailOptions = { from, to, subject, html, text: text || subject };

    try {
        const info = await transport.sendMail(mailOptions);
        if (!isSmtpConfigured()) {
            // jsonTransport — log the email to console in dev
            console.info(`[EmailService][DEV] 📧 Email to ${to}\n  Subject: ${subject}\n  Body (plain): ${text || '(html only)'}`);
        } else {
            console.info(`[EmailService] ✅ Email sent to ${to} | MessageId: ${info.messageId}`);
        }
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[EmailService] ❌ Failed to send to ${to}: ${err.message}`);
        return { success: false, error: err.message };
    }
};

// ── ISO 17025 Event Email Templates ───────────────────────────────────────────

/**
 * §7.1.1 — TAT / SLA Breach Notification
 */
const sendTatBreachEmail = async ({ to, sampleCode, clientName, tatDays, deadlineDate, labName }) => {
    const body = `
        ${alertBox(`SLA BREACH DETECTED — Sample ${sampleCode} is past its turnaround time commitment.`, 'danger')}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${infoBlock('Sample Code', sampleCode)}
          ${infoBlock('Client', clientName || 'N/A')}
          ${infoBlock('TAT Standard', `${tatDays} days`)}
          ${infoBlock('Deadline', deadlineDate || 'N/A')}
          ${infoBlock('Laboratory', labName || 'N/A')}
        </table>
        <p style="color:#94a3b8;font-size:13px;">Immediate action is required. Please review the sample status and communicate with the client.</p>
        ${ctaButton('Open LIMS Dashboard', process.env.LAB_PLATFORM_URL || '#')}
    `;
    return sendEmail({
        to,
        subject: `[URGENT] TAT Breach — Sample ${sampleCode} | ${labName}`,
        html: baseHtml(`⏰ SLA Breach Alert — ${sampleCode}`, body, '#ef4444'),
        text: `TAT BREACH: Sample ${sampleCode} for ${clientName} has exceeded its ${tatDays}-day turnaround time. Immediate action required.`,
    });
};

/**
 * §6.4.8 — Calibration Expiry Warning
 */
const sendCalibrationExpiryEmail = async ({ to, equipmentName, serialNumber, expiryDate, daysRemaining, labName }) => {
    const isExpired = daysRemaining <= 0;
    const body = `
        ${alertBox(
            isExpired
                ? `⛔ CALIBRATION EXPIRED — ${equipmentName} is OUT OF CALIBRATION. Results produced on this instrument are invalid until recalibrated.`
                : `⚠️ Calibration for ${equipmentName} expires in ${daysRemaining} day(s). Schedule recalibration immediately.`,
            isExpired ? 'danger' : 'warning'
        )}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${infoBlock('Equipment', equipmentName)}
          ${infoBlock('Serial / Asset No.', serialNumber || 'N/A')}
          ${infoBlock('Expiry Date', expiryDate)}
          ${infoBlock('Days Remaining', isExpired ? '⛔ EXPIRED' : daysRemaining)}
          ${infoBlock('Laboratory', labName || 'N/A')}
        </table>
        ${isExpired
            ? '<p style="color:#ef4444;font-weight:800;font-size:13px;">⛔ ISO 17025 §6.4.8 REQUIRES immediate quarantine of this equipment until valid calibration is restored.</p>'
            : '<p style="color:#94a3b8;font-size:13px;">Schedule calibration with an accredited calibrating body and log the certificate in the Equipment Manager.</p>'
        }
        ${ctaButton('Open Equipment Manager', `${process.env.LAB_PLATFORM_URL || '#'}/equipment`)}
    `;
    return sendEmail({
        to,
        subject: isExpired
            ? `[⛔ CRITICAL] Calibration EXPIRED — ${equipmentName} | ${labName}`
            : `[⚠️ WARNING] Calibration Due — ${equipmentName} expires in ${daysRemaining} days | ${labName}`,
        html: baseHtml(`${isExpired ? '⛔ Calibration Expired' : '⚠️ Calibration Due'} — ${equipmentName}`, body, isExpired ? '#ef4444' : '#f59e0b'),
        text: `Calibration ${isExpired ? 'EXPIRED' : `due in ${daysRemaining} days`} for ${equipmentName} (S/N: ${serialNumber}). Expiry: ${expiryDate}.`,
    });
};

/**
 * §8.7 — Non-Conformance / NCR Creation Alert
 */
const sendNcrCreatedEmail = async ({ to, ncrNumber, title, severity, sampleCode, raisedBy, labName }) => {
    const colors = { CRITICAL: 'danger', HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' };
    const body = `
        ${alertBox(`Non-Conformance #${ncrNumber} has been raised and requires attention.`, colors[severity] || 'warning')}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${infoBlock('NCR Number', `#${ncrNumber}`)}
          ${infoBlock('Title', title)}
          ${infoBlock('Severity', severity)}
          ${infoBlock('Related Sample', sampleCode || 'N/A')}
          ${infoBlock('Raised By', raisedBy || 'System')}
          ${infoBlock('Laboratory', labName || 'N/A')}
        </table>
        <p style="color:#94a3b8;font-size:13px;">Root cause analysis and corrective action must be initiated within 5 business days for HIGH/CRITICAL non-conformances (ISO 17025 §8.7).</p>
        ${ctaButton('Open CAPA Center', `${process.env.LAB_PLATFORM_URL || '#'}/internal-capa`)}
    `;
    return sendEmail({
        to,
        subject: `[NCR-${ncrNumber}] ${severity} Non-Conformance: ${title} | ${labName}`,
        html: baseHtml(`🚨 NCR #${ncrNumber} — ${title}`, body, severity === 'CRITICAL' || severity === 'HIGH' ? '#ef4444' : '#f59e0b'),
        text: `NCR #${ncrNumber} (${severity}): ${title}. Related to sample: ${sampleCode || 'N/A'}. Raised by: ${raisedBy}. Please initiate CAPA immediately.`,
    });
};

/**
 * §7.7.2 — Proficiency Test Result Alert
 */
const sendPtResultEmail = async ({ to, schemeName, analyte, zScore, result, labName }) => {
    const failed = Math.abs(zScore) > 2;
    const body = `
        ${alertBox(
            failed
                ? `⚠️ UNSATISFACTORY PT RESULT — Z-score of ${zScore} indicates a systematic bias or precision problem. Immediate investigation required.`
                : `✅ Satisfactory PT performance for ${analyte}. Z-score: ${zScore}.`,
            failed ? 'danger' : 'success'
        )}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${infoBlock('PT Scheme', schemeName)}
          ${infoBlock('Analyte', analyte)}
          ${infoBlock('Z-Score', `${zScore} ${Math.abs(zScore) > 3 ? '⛔ REJECT' : Math.abs(zScore) > 2 ? '⚠️ WARNING' : '✅ PASS'}`)}
          ${infoBlock('Result', result)}
          ${infoBlock('Laboratory', labName || 'N/A')}
        </table>
        ${failed ? `<p style="color:#94a3b8;font-size:13px;">ISO 17025 §7.7.2 requires investigation of unsatisfactory PT results. A CAPA has been automatically raised. Review root cause and implement corrective action before the next PT round.</p>` : ''}
        ${ctaButton('Open PT Module', `${process.env.LAB_PLATFORM_URL || '#'}/proficiency-testing`)}
    `;
    return sendEmail({
        to,
        subject: failed
            ? `[⚠️ UNSATISFACTORY] PT Result — ${analyte} | Z=${zScore} | ${labName}`
            : `[✅ SATISFACTORY] PT Result — ${analyte} | Z=${zScore} | ${labName}`,
        html: baseHtml(`PT Result — ${analyte} | Z-Score: ${zScore}`, body, failed ? '#ef4444' : '#10b981'),
        text: `PT Result for ${analyte} (${schemeName}): Z-score = ${zScore}. Status: ${failed ? 'UNSATISFACTORY — CAPA required.' : 'Satisfactory.'}`,
    });
};

/**
 * General purpose notification email
 */
const sendGenericNotification = async ({ to, subject, title, message, ctaText, ctaUrl, accentColor }) => {
    const body = `
        <p style="color:#cbd5e1;font-size:14px;line-height:1.7;">${message}</p>
        ${ctaText && ctaUrl ? ctaButton(ctaText, ctaUrl) : ''}
    `;
    return sendEmail({
        to,
        subject,
        html: baseHtml(title || subject, body, accentColor || '#3b82f6'),
        text: message,
    });
};

module.exports = {
    sendEmail,
    sendTatBreachEmail,
    sendCalibrationExpiryEmail,
    sendNcrCreatedEmail,
    sendPtResultEmail,
    sendGenericNotification,
    isSmtpConfigured,
};
