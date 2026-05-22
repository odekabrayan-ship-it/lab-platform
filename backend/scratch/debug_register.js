const axios = require('axios');
const API_BASE = 'http://localhost:3000';

async function test() {
    try {
        console.log("Sending registration request...");
        const res = await axios.post(`${API_BASE}/api/register`, {
            email: `client_${Date.now()}@demo.com`,
            password: 'password123',
            role: 'client'
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.log("Error status:", e.response?.status);
        console.log("Error data:", e.response?.data);
        console.log("Error message:", e.message);
    }
}
test();
