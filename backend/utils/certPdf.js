const PDFDocument = require('pdfkit');

/**
 * Generates a professional certificate PDF and pipes it to a writable stream (e.g. res).
 * @param {object} credential - credential row from cert_credentials
 * @param {object} professional - professional row (full_name, specialization)
 * @param {object} stream - writable stream to pipe into (e.g. HTTP res)
 */
function generateCertificatePDF(credential, professional, stream) {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 60, right: 60 }
    });

    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;

    // ── Background ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#020617');

    // Outer border
    doc.rect(20, 20, W - 40, H - 40)
        .lineWidth(3)
        .strokeColor('#0d9488')
        .stroke();

    // Inner border
    doc.rect(28, 28, W - 56, H - 56)
        .lineWidth(0.5)
        .strokeColor('#0d948840')
        .stroke();

    // Top accent bar
    doc.rect(20, 20, W - 40, 8).fill('#0d9488');

    // Bottom accent bar
    doc.rect(20, H - 28, W - 40, 8).fill('#0d9488');

    // ── Logo / Header ────────────────────────────────────────────────────────
    doc.roundedRect(W / 2 - 36, 48, 72, 72, 14).fill('#0d9488');
    doc.fontSize(42).fillColor('#ffffff').font('Helvetica-Bold')
        .text('Q', W / 2 - 36, 65, { width: 72, align: 'center' });

    doc.fontSize(9).fillColor('#0d9488').font('Helvetica-Bold')
        .text('QUALICORE CERTIFICATION AUTHORITY', 0, 132, { align: 'center', characterSpacing: 3 });

    // ── Certificate of ... ───────────────────────────────────────────────────
    doc.fontSize(11).fillColor('#94a3b8').font('Helvetica')
        .text('This is to certify that', 0, 165, { align: 'center' });

    // Professional name
    doc.fontSize(34).fillColor('#ffffff').font('Helvetica-Bold')
        .text(professional.full_name || 'Professional', 60, 185, { align: 'center', width: W - 120 });

    doc.fontSize(11).fillColor('#94a3b8').font('Helvetica')
        .text('has successfully met all requirements and is hereby awarded the professional certification of', 60, 230, { align: 'center', width: W - 120 });

    // Credential type
    doc.fontSize(24).fillColor('#2dd4bf').font('Helvetica-Bold')
        .text(credential.credential_type, 60, 256, { align: 'center', width: W - 120 });

    // Horizontal divider
    const divY = 296;
    doc.moveTo(80, divY).lineTo(W - 80, divY).lineWidth(0.5).strokeColor('#0d948850').stroke();

    // ── Details Row ──────────────────────────────────────────────────────────
    const detailY = divY + 16;
    const col = (W - 120) / 3;

    const details = [
        { label: 'Credential Number', value: credential.credential_number },
        { label: 'Issue Date', value: formatDate(credential.issued_date) },
        { label: 'Expiry Date', value: formatDate(credential.expiry_date) },
    ];

    details.forEach((d, i) => {
        const x = 60 + i * col;
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold')
            .text(d.label.toUpperCase(), x, detailY, { width: col, align: 'center', characterSpacing: 1.5 });
        doc.fontSize(11).fillColor('#e2e8f0').font('Helvetica-Bold')
            .text(d.value, x, detailY + 14, { width: col, align: 'center' });
    });

    // ── Verification Hash ────────────────────────────────────────────────────
    const hashY = detailY + 48;
    doc.fontSize(7).fillColor('#475569').font('Helvetica')
        .text(`Verification Code: ${credential.verification_hash}`, 0, hashY, { align: 'center', characterSpacing: 0.5 });

    doc.fontSize(7).fillColor('#475569').font('Helvetica')
        .text(`Verify at: ${process.env.CERT_VERIFY_URL || 'https://certification-rosy.vercel.app'}/verify/${credential.credential_number}`, 0, hashY + 12, { align: 'center' });

    // ── Signature lines ──────────────────────────────────────────────────────
    const sigY = H - 90;
    const sigPositions = [W / 4, (3 * W) / 4];
    const sigLabels = ['Registrar, QualiCore Authority', 'Director of Accreditation'];

    sigPositions.forEach((x, i) => {
        doc.moveTo(x - 60, sigY).lineTo(x + 60, sigY).lineWidth(0.5).strokeColor('#334155').stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica')
            .text(sigLabels[i], x - 80, sigY + 6, { width: 160, align: 'center', characterSpacing: 0.5 });
    });

    // ── Status Badge ─────────────────────────────────────────────────────────
    doc.roundedRect(W / 2 - 30, sigY - 10, 60, 20, 4).fill('#0d948820');
    doc.fontSize(7).fillColor('#2dd4bf').font('Helvetica-Bold')
        .text('ACTIVE', W / 2 - 30, sigY - 4, { width: 60, align: 'center', characterSpacing: 2 });

    doc.end();
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

module.exports = { generateCertificatePDF };
