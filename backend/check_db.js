const db = require('./database');
async function check() {
    try {
        const labs = await db.dbAll("SELECT id, name FROM laboratories");
        console.log("LABS:", labs);
        const storage = await db.dbAll("SELECT * FROM lab_storage");
        console.log("STORAGE:", storage);
    } catch (e) {
        console.error(e);
    }
}
check();
