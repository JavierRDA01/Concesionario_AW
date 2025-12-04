// Importamos la conexión a la base de datos
const pool = require('./connection');

// Función para crear una reserva nueva
const crearReserva = (reservaData, callback) => {
    // Sacamos los datos individuales del objeto que recibimos (incluyendo los nuevos campos)
    const { id_usuario, id_vehiculo, fecha_inicio, fecha_fin, kilometros_recorridos, incidencias_reportadas } = reservaData;
    
    // Preparamos la consulta para comprobar si el coche ya está ocupado en esas fechas
    // Usamos varias condiciones OR para cubrir todos los casos de solapamiento de fechas
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

    // Ejecutamos la comprobación de disponibilidad
    pool.query(checkSql, [id_vehiculo, fecha_inicio, fecha_fin, fecha_inicio, fecha_fin, fecha_inicio], (err, results) => {
        // Si hay un error técnico en la consulta, paramos
        if (err) return callback(err);
        
        // Si la consulta devuelve alguna fila, significa que el coche ya está reservado
        if (results.length > 0) {
            return callback(new Error("El vehículo no está disponible en esas fechas."));
        }

        // Si no hay solapamientos, preparamos la inserción de la nueva reserva
        // Añadimos las columnas de kilómetros e incidencias
        const insertSql = `
            INSERT INTO Reservas (id_usuario, id_vehiculo, fecha_inicio, fecha_fin, estado, kilometros_recorridos, incidencias_reportadas) 
            VALUES (?, ?, ?, ?, 'activa', ?, ?)
        `;
        
        // Ejecutamos la inserción. Si no hay kms o incidencias, ponemos 0 y null por defecto
        pool.query(insertSql, [id_usuario, id_vehiculo, fecha_inicio, fecha_fin, kilometros_recorridos || 0, incidencias_reportadas || null], (err, result) => {
            if (err) return callback(err);
            // Todo ha ido bien, devolvemos el resultado
            callback(null, result);
        });
    });
};

// Función para obtener el historial de reservas de un usuario concreto
const obtenerReservasDeUsuarioDetalladas = (idUsuario, callback) => {
    // Seleccionamos los datos de la reserva y hacemos JOIN con Vehículos y Concesionarios
    // para mostrar la marca, modelo y nombre del concesionario en vez de solo números IDs
    // IMPORTANTE: Aquí incluimos 'kilometros_recorridos' para que se vea en la tabla
    const sql = `
        SELECT r.id_reserva, r.fecha_inicio, r.fecha_fin, r.estado, 
               r.incidencias_reportadas, r.kilometros_recorridos, 
               v.marca, v.modelo, v.matricula, v.imagen,
               c.nombre as nombre_concesionario, c.ciudad
        FROM Reservas r
        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
        JOIN Concesionarios c ON v.id_concesionario = c.id_concesionario
        WHERE r.id_usuario = ?
        ORDER BY r.fecha_inicio DESC
    `;

    // Ejecutamos la consulta filtrando por el ID del usuario
    pool.query(sql, [idUsuario], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

// Función para el administrador: obtiene TODAS las reservas del sistema
const obtenerTodasLasReservasDetalladas = (callback) => {
    // Hacemos JOIN con Usuarios y Vehículos para tener toda la información detallada
    const sql = `
        SELECT r.*, 
               u.nombre as nombre_usuario, u.correo,
               CONCAT(v.marca, ' ', v.modelo, ' (', v.matricula, ')') as vehiculo
        FROM Reservas r
        JOIN Usuarios u ON r.id_usuario = u.id_usuario
        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
        ORDER BY r.fecha_inicio DESC
    `;
    
    // Ejecutamos la consulta
    pool.query(sql, (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

// Función auxiliar para ver si un vehículo tiene reservas activas en el futuro
// Sirve para impedir borrar un vehículo si tiene clientes esperándolo
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
        // Devolvemos true si el contador es mayor que 0, false si es 0
        callback(null, results[0].total > 0);
    });
};

// Función para cancelar una reserva (cambia su estado a 'cancelada')
const cancelarReserva = (idReserva, callback) => {
    // Solo permitimos cancelar si la reserva estaba 'activa'
    const sql = "UPDATE Reservas SET estado = 'cancelada' WHERE id_reserva = ? AND estado = 'activa'";
    
    pool.query(sql, [idReserva], (err, result) => {
        if (err) return callback(err);
        callback(null, result);
    });
};

// Exportamos todas las funciones
module.exports = {
    crearReserva,
    obtenerReservasDeUsuarioDetalladas,
    obtenerTodasLasReservasDetalladas,
    verificarReservasActivasVehiculo,
    cancelarReserva
};