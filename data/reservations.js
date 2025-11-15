const pool = require('./connection');

const crearReserva = (data, callback) => {
    const sql = `INSERT INTO reservas
        (id_usuario, id_vehiculo, fecha_inicio, fecha_fin, estado, kilometros_recorridos, incidencias_reportadas)
        VALUES (?,?,?,?,?,?,?,?,?,?)`;

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


module.exports = {
    crearReserva,
};