const pool = require('./connection');
const mysql = require('mysql');

const obtenerConcesionarios = (callback)=>{
    //Query para obtener todos los concesionarios de la bbdd
    const sql = "SELECT id_concesionario, nombre, ciudad, direccion, telefono_contacto FROM concesionarios";

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
    obtenerConcesionarios
}