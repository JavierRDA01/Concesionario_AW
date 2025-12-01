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

const crearVehiculo = (data, callback) => {
    const sql = `
        INSERT INTO Vehiculos 
        (matricula, marca, modelo, año_matriculacion, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'disponible', ?)
    `;
    
    const values = [
        data.matricula,
        data.marca,
        data.modelo,
        data.anio,
        data.plazas,
        data.autonomia,
        data.color,
        data.imagen || 'default_car.jpg',
        data.id_concesionario
    ];

    pool.query(sql, values, (err, result) => {
        if (err) return callback(err);
        callback(null, result);
    });
};
const obtenerTodosLosVehiculos = (callback) => {
        const sql = `
            SELECT v.*, c.nombre as nombre_concesionario 
            FROM Vehiculos v 
            LEFT JOIN Concesionarios c ON v.id_concesionario = c.id_concesionario
            ORDER BY v.id_vehiculo DESC
        `;

        pool.query(sql, [], callback);
    }
const obtenerVehiculosDisponiblesPorConcesionario = (id_concesionario, callback) => {
    const sql = `
        SELECT id_vehiculo, matricula, marca, modelo, año_matriculacion, 
               numero_plazas, autonomia_km, color, imagen, estado 
        FROM Vehiculos 
        WHERE id_concesionario = ? AND estado = 'disponible'
    `;
    
    pool.query(sql, [id_concesionario], (err, results) => {
        if (err) {
            console.error("Error obteniendo vehículos por concesionario:", err);
            return callback(err);
        }
        callback(null, results);
    });
};
module.exports = {
    obtenerVehiculosDisponibles,
    obtenerVehiculoPorId,
    crearVehiculo,
    obtenerTodosLosVehiculos,
    obtenerVehiculosDisponiblesPorConcesionario

};