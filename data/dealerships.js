const pool = require('./connection');

const obtenerConcesionarios = (callback) => {
    const sql = "SELECT id_concesionario, nombre, ciudad, direccion, telefono_contacto FROM Concesionarios ORDER BY id_concesionario ASC";
    pool.query(sql, (err, result) => {
        if (err) {
            console.error("Error al obtener los concesionarios: ", err.message);
            return callback(err);
        }
        callback(null, result);
    });
};

const crearConcesionario = (data, callback) => {
    const sql = "INSERT INTO Concesionarios (nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?)";
    const values = [data.nombre, data.ciudad, data.direccion, data.telefono];
    
    pool.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error al crear concesionario: ", err.message);
            return callback(err);
        }
        callback(null, result);
    });
};

module.exports = {
    obtenerConcesionarios,
    crearConcesionario 
};