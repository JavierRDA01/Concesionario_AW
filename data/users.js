const pool = require('./connection');


const registrarUsuario = async (data) => {
    // Query para insertar un usuario en la bbdd y settear valores del usuario a insertar
    const sql = "INSERT INTO usuarios(nombre, correo, password, rol, telefono, id_concesionario, preferencias_accesibilidad) VALUES(?,?,?,?,?,?,?)";
    const values = [data.nombre_completo, data.correo, data.password, data.rol, data.telefono, data.id_concesionario, data.preferencias_accesibilidad];

    //Ejecución de la query
    try {
        await pool.query(sql, values);
    } catch (error) {
        throw error;
    }
};

const obtenerUsuarioPorCorreo = async (correo) => {
    const sql = "SELECT nombre, correo, password, rol, telefono, id_concesionario, preferencias_accesibilidad FROM usuarios WHERE correo = ?";
    
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