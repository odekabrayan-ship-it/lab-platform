const publicDb = require('../public_database');

function registerTrustSealRoutes(app, { asyncHandler, sendSuccess }) {
    
    // 1. PUBLIC SEAL VERIFICATION ENDPOINT
    // Returns minimal data for the embeddable widget
    app.get('/api/public/verify-seal/:brandId', asyncHandler(async (req, res) => {
        const brand = await publicDb.dbGet(`
            SELECT b.name, b.trust_badge, b.category, c.name as company_name 
            FROM public_brands b
            JOIN public_companies c ON b.company_id = c.id
            WHERE b.id = ? AND b.visibility_status = 'PUBLISHED'
        `, [req.params.brandId]);

        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found or not published" });
        }

        sendSuccess(res, {
            name: brand.name,
            company: brand.company_name,
            badge: brand.trust_badge,
            verified_at: new Date().toISOString(),
            portal_url: `${process.env.PORTAL_URL || 'http://localhost:3001'}/brands/${req.params.brandId}`
        });
    }));

    // 2. THE SEAL WIDGET SCRIPT (Served as static JS)
    app.get('/scripts/quali-seal.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        const script = `
(function() {
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    const brandId = currentScript.getAttribute('data-brand-id');
    const theme = currentScript.getAttribute('data-theme') || 'dark';
    
    if (!brandId) return console.error('QualiCore Seal: Missing data-brand-id');

    const container = document.createElement('div');
    container.id = 'qualicore-seal-' + brandId;
    container.style.display = 'inline-block';
    container.style.cursor = 'pointer';
    currentScript.parentNode.insertBefore(container, currentScript);

    fetch('${process.env.API_URL || 'http://localhost:3000'}/api/public/verify-seal/' + brandId)
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;
            const brand = data.data;
            
            const bgColor = theme === 'dark' ? '#0f172a' : '#ffffff';
            const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
            const borderColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

            container.innerHTML = \`
                <div style="
                    background: \${bgColor}; 
                    color: \${textColor}; 
                    border: 1px solid \${borderColor}; 
                    padding: 12px 20px; 
                    border-radius: 12px; 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: fit-content;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(99, 102, 241, 0.2)'" 
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'"
                  onclick="window.open('\${brand.portal_url}', '_blank')">
                    
                    <div style="width: 32px; height: 32px; background: #4f46e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">Q</div>
                    
                    <div>
                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6366f1; margin-bottom: 2px;">QualiCore Verified</div>
                        <div style="font-size: 13px; font-weight: 700; line-height: 1.2;">\${brand.name}</div>
                        <div style="font-size: 9px; opacity: 0.5; margin-top: 1px;">\${brand.badge} Status</div>
                    </div>

                    <div style="margin-left: 4px; opacity: 0.3;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </div>
                </div>
            \`;
        })
        .catch(err => console.error('QualiCore Seal Error:', err));
})();
        `;
        res.send(script);
    });
}

module.exports = { registerTrustSealRoutes };
