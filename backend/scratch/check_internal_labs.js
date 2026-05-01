const db = require('../database');

db.all("SELECT * FROM laboratories WHERE is_internal = 1", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Internal Labs:", JSON.stringify(rows, null, 2));
    
    db.all("SELECT * FROM clients", (err, clients) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log("Clients:", JSON.stringify(clients, null, 2));
        process.exit(0);
    });
});
