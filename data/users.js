const pool = require('./connection');


const registrarUsuario = (data, callback) => {
    // Query para insertar un usuario en la bbdd y settear valores del usuario a insertar
    const sql = "INSERT INTO usuarios(nombre, correo, contraseña, rol, telefono, id_concesionario, preferencias_accesibilidad) VALUES(?,?,?,?,?,?,?)";
    const values = [data.nombre_completo, data.correo, data.password, data.rol, data.telefono, data.id_concesionario, data.preferencias_accesibilidad];

    //Ejecución de la query
    pool.query(sql, values, (err, result) => {
        // La conexión se obtiene, usa y libera automáticamente.
        if (err) {
            console.error("Error al registrar al usuario: ", err.message);
            return callback(err);
        }
        // Éxito en la inserción, no devolvemos nada
        callback(null);
    });
};

const obtenerUsuarioPorCorreo = async (correo) => {
    const sql = "SELECT nombre, correo, contraseña, rol, telefono, id_concesionario, preferencias_accesibilidad FROM usuarios WHERE correo = ?";
    
    try {
        const [res] = await pool.query(sql, [correo]);
        return res[0];
    } catch (error) {
        throw error;
    }
}


module.exports = {
    registrarUsuario,
    obtenerUsuarioPorCorreo
}