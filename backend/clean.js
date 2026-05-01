const fs = require('fs');
const file = 'server.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const client = { id: await getClientId\(req\.user\.id\) };\r?\n\s*if \(!client\) throw new ApiError\('Client profile not found', 404\);/g, 
'const client = { id: await getClientId(req.user.id) };');
fs.writeFileSync(file, content);
