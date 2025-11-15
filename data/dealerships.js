const pool = require('./connection');

const saveDealership = async (dealership, callback) => {
    const sql = "INSERT INTO concesionarios (nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?)";
    const values = [dealership.nombre, dealership.ciudad, dealership.direccion, dealership.telefonoContacto];
    pool.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error al guardar el concesionario: ", err.message);
            return callback(err);
        }
        callback(null, result.insertId);
    });
}

const obtenerConcesionarios = (callback)=>{
    //Query para obtener todos los concesionarios de la bbdd
    const sql = "SELECT id_concesionario, nombre, ciudad, direccion, telefono FROM concesionarios";

    pool.query(sql, (err, result)=>{
        if(err){
            console.error("Error al obtener los concesionarios: ", err.message);
            return callback(err);
        }
        // Al callback le decimos que no hay error y devolvemos el resultado
        callback(null, result)
    })
}



module.exports = {
    saveDealership,
    obtenerConcesionarios
}