const http = require('http');

const testRequest = () => {
    const data = JSON.stringify({
        tenantId: 1,
        tenantType: 'lab'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/billing/create-checkout-session',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Body:', body);
        });
    });

    req.on('error', console.error);
    req.write(data);
    req.end();
};

testRequest();
