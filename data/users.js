const pool = require('./connection');
const mysql = require('mysql');


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

const obtenerUsuarioPorCorreo = (correo, callback) =>{
    const sql = "SELECT id_usuario, nombre, correo, contraseña, rol, telefono, id_concesionario, preferencias_accesibilidad FROM usuarios WHERE correo = ?";
    
    pool.query(sql, correo, (err, result)=>{
        if(err){
            console.error("Error al obtener al usuario por correo: ", err.message);
            return callback(err);
        }
        return callback(null,result);
    });
}
const obtenerTodosLosUsuarios = (callback) => {
    const sql = `
        SELECT u.id_usuario, u.nombre, u.correo, u.rol, u.telefono, c.nombre as nombre_concesionario
        FROM Usuarios u
        LEFT JOIN Concesionarios c ON u.id_concesionario = c.id_concesionario
        ORDER BY u.id_usuario ASC
    `;
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error("Error al obtener usuarios: ", err.message);
            return callback(err);
        }
        callback(null, results);
    });
};
const obtenerUsuarioPorId = (id, callback) => {
    const sql = `
        SELECT u.id_usuario, u.nombre, u.correo, u.rol, u.telefono, 
               c.nombre as nombre_concesionario, c.ciudad as ciudad_concesionario
        FROM Usuarios u
        LEFT JOIN Concesionarios c ON u.id_concesionario = c.id_concesionario
        WHERE u.id_usuario = ?
    `;
    
    pool.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Error obteniendo usuario por ID:", err);
            return callback(err);
        }
        callback(null, results.length > 0 ? results[0] : null);
    });
};
module.exports = {
    registrarUsuario,
    obtenerUsuarioPorCorreo,
    obtenerTodosLosUsuarios,
    obtenerUsuarioPorId 
};