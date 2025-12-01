const pool = require('./connection');

const obtenerEstadisticasDashboard = (callback) => {
    const stats = {
        reservasActivas: 0,
        vehiculosLibres: 0,
        incidencias: 0,
        totalUsuarios: 0,
        ultimasReservas: [],
        reservasPorConcesionario: [],
        vehiculoMasUsado: null,
        kilometrosTotales: 0,
        // Nuevas estadísticas
        estadoFlota: [], // Para el gráfico circular
        topUsuarios: [], // Lista de usuarios más activos
        duracionPromedio: 0 // Media en días
    };

    // 1. Reservas Activas
    pool.query("SELECT COUNT(*) AS total FROM Reservas WHERE estado = 'activa'", (err, res1) => {
        if (err) return callback(err);
        stats.reservasActivas = res1[0].total;

        // 2. Vehículos Disponibles
        pool.query("SELECT COUNT(*) AS total FROM Vehiculos WHERE estado = 'disponible'", (err, res2) => {
            if (err) return callback(err);
            stats.vehiculosLibres = res2[0].total;

            // 3. Incidencias
            pool.query("SELECT COUNT(*) AS total FROM Reservas WHERE incidencias_reportadas IS NOT NULL AND incidencias_reportadas != ''", (err, res3) => {
                if (err) return callback(err);
                stats.incidencias = res3[0].total;

                // 4. Total Usuarios
                pool.query("SELECT COUNT(*) AS total FROM Usuarios", (err, res4) => {
                    if (err) return callback(err);
                    stats.totalUsuarios = res4[0].total;

                    // 5. Últimas 5 reservas
                    const sqlUltimas = `
                        SELECT r.id_reserva, u.nombre as usuario, v.marca, v.modelo, v.matricula, r.estado 
                        FROM Reservas r
                        JOIN Usuarios u ON r.id_usuario = u.id_usuario
                        JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
                        ORDER BY r.fecha_inicio DESC LIMIT 5`;
                    
                    pool.query(sqlUltimas, (err, res5) => {
                        if (err) return callback(err);
                        stats.ultimasReservas = res5.map(row => ({
                            usuario: row.usuario,
                            vehiculo: `${row.marca} ${row.modelo} (${row.matricula})`,
                            estado: row.estado
                        }));

                        // 6. Reservas por Concesionario
                        const sqlConcesionarios = `
                            SELECT c.nombre, COUNT(r.id_reserva) as total 
                            FROM Reservas r
                            JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
                            JOIN Concesionarios c ON v.id_concesionario = c.id_concesionario
                            GROUP BY c.id_concesionario, c.nombre`;
                        
                        pool.query(sqlConcesionarios, (err, res6) => {
                            if (err) return callback(err);
                            stats.reservasPorConcesionario = res6;

                            // 7. Vehículo más usado
                            const sqlMasUsado = `
                                SELECT v.marca, v.modelo, v.matricula, COUNT(r.id_reserva) as total
                                FROM Reservas r
                                JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
                                GROUP BY v.id_vehiculo
                                ORDER BY total DESC LIMIT 1`;

                            pool.query(sqlMasUsado, (err, res7) => {
                                if (err) return callback(err);
                                stats.vehiculoMasUsado = res7.length > 0 ? res7[0] : null;

                                // 8. Kilómetros Totales
                                pool.query("SELECT SUM(kilometros_recorridos) as total FROM Reservas", (err, res8) => {
                                    if (err) return callback(err);
                                    stats.kilometrosTotales = res8[0].total || 0;

                                    // --- NUEVAS CONSULTAS ---
                                    
                                    // 9. Estado de la Flota (Para gráfico Pie)
                                    // Cuenta cuántos coches hay en cada estado (disponible, reservado, mantenimiento)
                                    const sqlEstado = "SELECT estado, COUNT(*) as total FROM Vehiculos GROUP BY estado";
                                    pool.query(sqlEstado, (err, res9) => {
                                        if (err) return callback(err);
                                        stats.estadoFlota = res9;

                                        // 10. Top 3 Usuarios
                                        const sqlTopUsers = `
                                            SELECT u.nombre, COUNT(r.id_reserva) as total
                                            FROM Reservas r
                                            JOIN Usuarios u ON r.id_usuario = u.id_usuario
                                            GROUP BY u.id_usuario
                                            ORDER BY total DESC LIMIT 3`;
                                        
                                        pool.query(sqlTopUsers, (err, res10) => {
                                            if (err) return callback(err);
                                            stats.topUsuarios = res10;

                                            // 11. Duración Promedio de Reserva (en días)
                                            // DATEDIFF devuelve la diferencia en días
                                            const sqlAvg = "SELECT AVG(DATEDIFF(fecha_fin, fecha_inicio)) as promedio FROM Reservas WHERE estado != 'cancelada'";
                                            pool.query(sqlAvg, (err, res11) => {
                                                if (err) return callback(err);
                                                // Guardamos con 1 decimal. Si es null, ponemos 0.
                                                stats.duracionPromedio = res11[0].promedio ? parseFloat(res11[0].promedio).toFixed(1) : "0";
                                                
                                                callback(null, stats);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

module.exports = {
    obtenerEstadisticasDashboard
};