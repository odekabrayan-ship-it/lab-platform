const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let safeUrl = req.url.split('?')[0].split('#')[0];
    let filePath = path.join(DIST_DIR, safeUrl);

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isFile()) {
            serveFile(filePath, res);
        } else {
            const fallbackPath = path.join(DIST_DIR, 'index.html');
            serveFile(fallbackPath, res);
        }
    });
});

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`QualiCore Frontend Static SPA Server running on port ${PORT}`);
});
