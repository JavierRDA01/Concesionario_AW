const pool = require('./connection');

const crearReserva = (reservaData, callback) => {
    const { id_usuario, id_vehiculo, fecha_inicio, fecha_fin } = reservaData;
    
    // 1. Validar disponibilidad (Doble check de seguridad)
    const checkSql = `
        SELECT * FROM Reservas 
        WHERE id_vehiculo = ? 
        AND estado = 'activa'
        AND (
            (fecha_inicio BETWEEN ? AND ?) OR 
            (fecha_fin BETWEEN ? AND ?) OR
            (? BETWEEN fecha_inicio AND fecha_fin)
        )
    `;

    pool.query(checkSql, [id_vehiculo, fecha_inicio, fecha_fin, fecha_inicio, fecha_fin, fecha_inicio], (err, results) => {
        if (err) return callback(err);
        
        if (results.length > 0) {
            return callback(new Error("El vehículo no está disponible en esas fechas."));
        }

        // 2. Insertar reserva
        const insertSql = `
            INSERT INTO Reservas (id_usuario, id_vehiculo, fecha_inicio, fecha_fin, estado) 
            VALUES (?, ?, ?, ?, 'activa')
        `;
        
        pool.query(insertSql, [id_usuario, id_vehiculo, fecha_inicio, fecha_fin], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    });
};

const obtenerReservasDeUsuarioDetalladas = (idUsuario, callback) => {
    const sql = `
        SELECT r.id_reserva, r.fecha_inicio, r.fecha_fin, r.estado, r.incidencias_reportadas,
               v.marca, v.modelo, v.matricula, v.imagen,
               c.nombre as nombre_concesionario, c.ciudad
        FROM Reservas r
        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
        JOIN Concesionarios c ON v.id_concesionario = c.id_concesionario
        WHERE r.id_usuario = ?
        ORDER BY r.fecha_inicio DESC
    `;
    pool.query(sql, [idUsuario], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

const obtenerTodasLasReservasDetalladas = (callback) => {
    const sql = `
        SELECT r.*, 
               u.nombre as nombre_usuario, u.correo,
               CONCAT(v.marca, ' ', v.modelo, ' (', v.matricula, ')') as vehiculo
        FROM Reservas r
        JOIN Usuarios u ON r.id_usuario = u.id_usuario
        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
        ORDER BY r.fecha_inicio DESC
    `;
    pool.query(sql, (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

// --- FUNCIÓN QUE TE FALTABA ---
const verificarReservasActivasVehiculo = (id_vehiculo, callback) => {
    const sql = `
        SELECT COUNT(*) as total 
        FROM Reservas 
        WHERE id_vehiculo = ? 
        AND estado = 'activa' 
        AND fecha_fin >= NOW()
    `;
    
    pool.query(sql, [id_vehiculo], (err, results) => {
        if (err) return callback(err);
        // Devuelve true si hay reservas futuras/activas
        callback(null, results[0].total > 0);
    });
};

const cancelarReserva = (idReserva, callback) => {
    const sql = "UPDATE Reservas SET estado = 'cancelada' WHERE id_reserva = ? AND estado = 'activa'";
    pool.query(sql, [idReserva], (err, result) => {
        if (err) return callback(err);
        callback(null, result);
    });
};

// ¡IMPORTANTE! Exportar todas las funciones aquí
module.exports = {
    crearReserva,
    obtenerReservasDeUsuarioDetalladas,
    obtenerTodasLasReservasDetalladas,
    verificarReservasActivasVehiculo, // <--- Asegúrate de que esta línea esté aquí
    cancelarReserva
};