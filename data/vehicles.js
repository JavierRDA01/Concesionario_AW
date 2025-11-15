const pool = require('./connection');
const mysql = require('mysql');

/**
 * Obtener vehículos disponibles.
 * Devuelve los campos básicos (ajusta la SELECT si tu esquema usa otros nombres).
 */
const obtenerVehiculosDisponibles = (callback) => {
    const sql = `
        SELECT id_vehiculo, matricula, marca, modelo,año_matriculacion, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario
        FROM vehiculos
        WHERE estado = 'disponible'
    `;
    pool.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener vehículos disponibles:', err.message);
            return callback(err);
        }
        callback(null, result);
    });
};

const obtenerVehiculoPorId = (id, callback) => {
    const sql = `SELECT id_vehiculo, matricula, marca, modelo,año_matriculacion, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario FROM vehiculos WHERE id_vehiculo = ?`;
    pool.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener vehículo por id:', err.message);
            return callback(err);
        }
        callback(null, result && result.length ? result[0] : null);
    });
};

module.exports = {
    obtenerVehiculosDisponibles,
    obtenerVehiculoPorId
};