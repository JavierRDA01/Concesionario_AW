const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "wibble_aw",
});

// pool.getConnection((err, connection) => {
//     if (err) {
//         console.error("Error de conexión:", err);
//         return;
//     }
//     console.log("Conectado a la base de datos MySQL");
//     connection.release();
// });

module.exports = pool;