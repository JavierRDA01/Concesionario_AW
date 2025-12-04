// Importamos la conexión a la base de datos y la librería mysql
const pool = require('./connection');
const mysql = require('mysql');

// Obtiene la lista de coches que están marcados como 'disponible'
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

// Busca un vehículo concreto por su ID (útil para rellenar formularios de edición o detalles)
const obtenerVehiculoPorId = (id, callback) => {
    const sql = `SELECT id_vehiculo, matricula, marca, modelo,año_matriculacion, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario FROM vehiculos WHERE id_vehiculo = ?`;
    
    pool.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener vehículo por id:', err.message);
            return callback(err);
        }
        // Devuelve el primer resultado si existe, o null si no hay coincidencias
        callback(null, result && result.length ? result[0] : null);
    });
};

// Añade un nuevo vehículo a la base de datos
const crearVehiculo = (data, callback) => {
    const sql = `
        INSERT INTO Vehiculos 
        (matricula, marca, modelo, año_matriculacion, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'disponible', ?)
    `;
    
    // Preparamos los valores. Si no hay imagen, ponemos una por defecto
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

// Obtiene el listado completo para el panel de administración (incluyendo reservados y mantenimiento)
const obtenerTodosLosVehiculos = (callback) => {
    // Hacemos LEFT JOIN para obtener el nombre del concesionario asociado a cada coche
    const sql = `
        SELECT v.*, c.nombre as nombre_concesionario 
        FROM Vehiculos v 
        LEFT JOIN Concesionarios c ON v.id_concesionario = c.id_concesionario
        ORDER BY v.id_vehiculo DESC
    `;

    pool.query(sql, [], callback);
}

// Filtra los coches disponibles que pertenecen a una base concreta (para la vista de empleados)
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

// Cambia solo el estado del coche (disponible, reservado, mantenimiento)
const actualizarEstadoVehiculo = (id, nuevoEstado, callback) => {
    const sql = "UPDATE Vehiculos SET estado = ? WHERE id_vehiculo = ?";
    
    pool.query(sql, [nuevoEstado, id], (err, result) => {
        if (err) {
            console.error("Error cambiando estado del vehículo:", err);
            return callback(err);
        }
        callback(null, result);
    });
};

// Actualiza todos los datos de un vehículo existente (editar)
const actualizarVehiculo = (id, data, callback) => {
    const sql = `
        UPDATE Vehiculos 
        SET matricula = ?, marca = ?, modelo = ?, año_matriculacion = ?, 
            numero_plazas = ?, autonomia_km = ?, color = ?, id_concesionario = ?, imagen = ?
        WHERE id_vehiculo = ?
    `;
    const values = [
        data.matricula,
        data.marca,
        data.modelo,
        data.anio,
        data.plazas,
        data.autonomia,
        data.color,
        data.id_concesionario,
        data.imagen,
        id
    ];

    pool.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error actualizando vehículo:", err);
            return callback(err);
        }
        callback(null, result);
    });
};

// Borra un vehículo de la base de datos
const eliminarVehiculo = (id, callback) => {
    // 1. Primero borramos el historial de reservas de este coche para evitar errores de claves foráneas
    const sqlDeleteReservas = "DELETE FROM Reservas WHERE id_vehiculo = ?";
    
    pool.query(sqlDeleteReservas, [id], (err, result) => {
        if (err) {
            console.error("Error borrando historial de reservas:", err);
            return callback(err);
        }

        // 2. Una vez limpio el historial, borramos el vehículo
        const sqlDeleteVehiculo = "DELETE FROM Vehiculos WHERE id_vehiculo = ?";
        
        pool.query(sqlDeleteVehiculo, [id], (err, resultVehiculo) => {
            if (err) {
                console.error("Error eliminando vehículo:", err);
                return callback(err);
            }
            callback(null, resultVehiculo);
        });
    });
};

module.exports = {
    obtenerVehiculosDisponibles,
    obtenerVehiculoPorId,
    crearVehiculo,
    obtenerTodosLosVehiculos,
    obtenerVehiculosDisponiblesPorConcesionario,
    actualizarEstadoVehiculo,
    actualizarVehiculo,
    eliminarVehiculo
};