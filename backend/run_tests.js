const { spawn } = require('child_process');
console.log('Starting server for tests...');
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

server.on('error', (err) => console.error('Server spawn error:', err));
server.on('exit', (code) => console.log('Server exited with code:', code));

setTimeout(() => {
    console.log('Running validation script...');
    const tests = spawn('node', ['tests/validate.js'], { stdio: 'inherit' });
    
    tests.on('exit', (code) => {
        console.log('Tests exited with code:', code);
        server.kill();
        process.exit(code);
    });
}, 2000);
