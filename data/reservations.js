const pool = require('./connection');

const crearReserva = (data, callback) => {
    const sql = `INSERT INTO reservas (id_usuario, id_vehiculo, fecha_inicio, fecha_fin, estado, kilometros_recorridos, incidencias_reportadas) VALUES (?,?,?,?,?,?,?)`;

    const values = [
        data.id_usuario,
        data.id_vehiculo,
        data.fecha_inicio,
        data.fecha_fin,
        data.estado,
        data.kilometros_recorridos,
        data.incidencias_reportadas
    ];

    pool.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error insertando reserva:', err.message);
            return callback(err);
        }
        callback(null);
    });
};

const getDashboardStats = (callback) => {
    const sqlActivas = "SELECT COUNT(*) as count FROM reservas WHERE estado = 'activa'";
    const sqlIncidencias = "SELECT COUNT(*) as count FROM reservas WHERE incidencias_reportadas IS NOT NULL AND incidencias_reportadas != ''";
    
    pool.query(sqlActivas, (err, resActivas) => {
        if (err) {
            console.error('Error obteniendo activas:', err.message);
            return callback(err);
        }
        
        pool.query(sqlIncidencias, (err2, resIncidencias) => {
            if (err2) {
                console.error('Error obteniendo incidencias:', err2.message);
                return callback(err2);
            }
            
            callback(null, {
                activas: resActivas[0].count,
                incidencias: resIncidencias[0].count
            });
        });
    });
};

const getUltimasReservas = (callback) => {
    const sql = `
        SELECT r.id_reserva, u.nombre_completo as usuario, CONCAT(v.marca, ' ', v.modelo) as vehiculo, r.estado 
        FROM reservas r 
        JOIN usuarios u ON r.id_usuario = u.id_usuario 
        JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo 
        ORDER BY r.fecha_inicio DESC 
        LIMIT 5
    `;
    pool.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo últimas reservas:', err.message);
            return callback(err);
        }
        callback(null, results);
    });
};

// Funciones auxiliares que podrías necesitar en otros lados
const getAllReservations = (callback) => {
    const sql = `SELECT * FROM reservas`;
    pool.query(sql, (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

const getReservationsByUser = (id_usuario, callback) => {
    const sql = `SELECT * FROM reservas WHERE id_usuario = ?`;
    pool.query(sql, [id_usuario], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

const obtenerTodasLasReservasDetalladas = (callback) => {
    const sql = `
        SELECT r.id_reserva, 
               u.nombre as nombre_usuario, 
               CONCAT(v.marca, ' ', v.modelo, ' (', v.matricula, ')') as vehiculo,
               r.fecha_inicio, 
               r.fecha_fin, 
               r.estado,
               r.incidencias_reportadas
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

const obtenerReservasDeUsuarioDetalladas = (id_usuario, callback) => {
    const sql = `
        SELECT r.id_reserva, 
               CONCAT(v.marca, ' ', v.modelo) as vehiculo,
               v.matricula,
               v.imagen,
               r.fecha_inicio, 
               r.fecha_fin, 
               r.estado,
               r.kilometros_recorridos,
               r.incidencias_reportadas
        FROM Reservas r
        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
        WHERE r.id_usuario = ?
        ORDER BY r.fecha_inicio DESC
    `;
    pool.query(sql, [id_usuario], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

module.exports = {
    crearReserva,
    getDashboardStats,
    getUltimasReservas,
    getAllReservations,
    getReservationsByUser,
    obtenerTodasLasReservasDetalladas,
    obtenerReservasDeUsuarioDetalladas 
};