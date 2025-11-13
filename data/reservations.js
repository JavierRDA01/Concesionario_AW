const pool = require('./connection');

const crearReserva = (data, callback) => {
    const sql = `INSERT INTO reservas
        (id_usuario, id_vehiculo, id_concesionario, fecha_inicio, fecha_fin, nombre_contacto, correo_contacto, telefono_contacto, notas, estado)
        VALUES (?,?,?,?,?,?,?,?,?,?)`;

    const values = [
        data.id_usuario,
        data.id_vehiculo,
        data.id_concesionario,
        data.fecha_inicio,
        data.fecha_fin,
        data.nombre,
        data.correo,
        data.telefono,
        data.notas,
        data.estado
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