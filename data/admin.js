const pool = require('./connection');

const obtenerEstadisticasDashboard = (callback) => {
    const stats = {
        reservasActivas: 0,
        vehiculosLibres: 0,
        incidencias: 0,
        totalUsuarios: 0,
        ultimasReservas: []
    };

    // 1. Contar reservas activas (asegúrate de que el estado coincida con tu ENUM: 'activa')
    pool.query("SELECT COUNT(*) AS total FROM Reservas WHERE estado = 'activa'", (err, res1) => {
        if (err) return callback(err);
        stats.reservasActivas = res1[0].total;

        // 2. Contar vehículos disponibles
        pool.query("SELECT COUNT(*) AS total FROM Vehiculos WHERE estado = 'disponible'", (err, res2) => {
            if (err) return callback(err);
            stats.vehiculosLibres = res2[0].total;

            // 3. Contar incidencias (reservas que tienen texto en el campo incidencias)
            pool.query("SELECT COUNT(*) AS total FROM Reservas WHERE incidencias_reportadas IS NOT NULL AND incidencias_reportadas != ''", (err, res3) => {
                if (err) return callback(err);
                stats.incidencias = res3[0].total;

                // 4. Contar usuarios totales
                pool.query("SELECT COUNT(*) AS total FROM Usuarios", (err, res4) => {
                    if (err) return callback(err);
                    stats.totalUsuarios = res4[0].total;

                    // 5. Obtener las 5 últimas reservas con nombres de usuario y coche (JOIN)
                    const sqlUltimas = `
                        SELECT r.id_reserva, u.nombre as usuario, v.marca, v.modelo, v.matricula, r.estado 
                        FROM Reservas r
                        JOIN Usuarios u ON r.id_usuario = u.id_usuario
                        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
                        ORDER BY r.fecha_inicio DESC
                        LIMIT 5
                    `;
                    
                    pool.query(sqlUltimas, (err, res5) => {
                        if (err) return callback(err);
                        
                        // Guardamos la lista de reservas
                        stats.ultimasReservas = res5.map(row => ({
                            usuario: row.usuario,
                            vehiculo: `${row.marca} ${row.modelo} (${row.matricula})`,
                            estado: row.estado
                        }));

                        // ¡Terminamos! Devolvemos todo el objeto stats
                        callback(null, stats);
                    });
                });
            });
        });
    });
};

module.exports = {
    obtenerEstadisticasDashboard
};