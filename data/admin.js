const pool = require("./connection");

const obtenerEstadisticasDashboard = async () => {
    const stats = {
        reservasActivas: 0,
        vehiculosLibres: 0,
        incidencias: 0,
        totalUsuarios: 0,
        ultimasReservas: []
    };

    try {
        // 1. Reservas activas
        const [res1] = await pool.query(
            "SELECT COUNT(*) AS total FROM Reservas WHERE estado = 'activa'"
        );
        stats.reservasActivas = res1[0].total;

        // 2. Vehículos disponibles
        const [res2] = await pool.query(
            "SELECT COUNT(*) AS total FROM Vehiculos WHERE estado = 'disponible'"
        );
        stats.vehiculosLibres = res2[0].total;

        // 3. Incidencias
        const [res3] = await pool.query(
            "SELECT COUNT(*) AS total FROM Reservas WHERE incidencias_reportadas IS NOT NULL AND incidencias_reportadas != ''"
        );
        stats.incidencias = res3[0].total;

        // 4. Usuarios
        const [res4] = await pool.query(
            "SELECT COUNT(*) AS total FROM Usuarios"
        );
        stats.totalUsuarios = res4[0].total;

        // 5. Últimas reservas
        const sqlUltimas = `
            SELECT r.id_reserva, u.nombre AS usuario, v.marca, v.modelo, v.matricula, r.estado
            FROM Reservas r
            JOIN Usuarios u ON r.id_usuario = u.id_usuario
            JOIN Vehiculos v ON r.id_vehiculo = v.id_vehiculo
            ORDER BY r.fecha_inicio DESC
            LIMIT 5
        `;

        const [res5] = await pool.query(sqlUltimas);

        stats.ultimasReservas = res5.map(row => ({
            usuario: row.usuario,
            vehiculo: `${row.marca} ${row.modelo} (${row.matricula})`,
            estado: row.estado
        }));

        return stats;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    obtenerEstadisticasDashboard
};
