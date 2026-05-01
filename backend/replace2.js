const fs = require('fs');
const file = 'server.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const client = await dbGet\(SELECT id FROM clients WHERE user_id = \?, \[req\.user\.id\]\);/g, 
'const client = { id: await getClientId(req.user.id) };');
fs.writeFileSync(file, content);
