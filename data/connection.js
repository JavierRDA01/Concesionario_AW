const mysql = require("mysql");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "wibble_aw",
    timezone: 'Europe/Madrid'

});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("Error de conexión:", err);
        return;
    }
    console.log("Conectado a la base de datos MySQL");
    connection.release();
});

module.exports = pool;