// Importamos la conexión a la base de datos
const pool = require('./connection');
const mysql = require('mysql');

// Función para registrar un nuevo usuario en la base de datos
const registrarUsuario = (data, callback) => {
    // Preparamos la consulta SQL. Los ? se sustituirán por los valores del array
    const sql = "INSERT INTO usuarios(nombre, correo, contraseña, rol, telefono, id_concesionario, preferencias_accesibilidad) VALUES(?,?,?,?,?,?,?)";
    
    // Organizamos los datos en un array en el mismo orden que la consulta
    const values = [data.nombre_completo, data.correo, data.password, data.rol, data.telefono, data.id_concesionario, data.preferencias_accesibilidad];

    // Ejecutamos la inserción
    pool.query(sql, values, (err, result) => {
        // Si hay un error (ej: correo duplicado), lo mostramos y avisamos
        if (err) {
            console.error("Error al registrar al usuario: ", err.message);
            return callback(err);
        }
        // Si todo ha ido bien, terminamos sin devolver error
        callback(null);
    });
};

// Busca un usuario por su email (se usa para el Login y para evitar duplicados)
const obtenerUsuarioPorCorreo = (correo, callback) =>{
    const sql = "SELECT id_usuario, nombre, correo, contraseña, rol, telefono, id_concesionario, preferencias_accesibilidad FROM usuarios WHERE correo = ?";
    
    // Ejecutamos la consulta pasando el correo
    pool.query(sql, correo, (err, result)=>{
        if(err){
            console.error("Error al obtener al usuario por correo: ", err.message);
            return callback(err);
        }
        // Devolvemos el usuario encontrado (o un array vacío si no existe)
        return callback(null, result);
    });
}

// Obtiene la lista de todos los usuarios (para el panel de Administración)
const obtenerTodosLosUsuarios = (callback) => {
    // Usamos LEFT JOIN para traer también el nombre del concesionario asignado, si tiene
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

// Obtiene los datos completos de un usuario específico por su ID (para la página de Perfil)
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
        // Devolvemos el primer resultado si existe, o null si no
        callback(null, results.length > 0 ? results[0] : null);
    });
};

// Actualiza la configuración de accesibilidad (contraste, tamaño letra)
const actualizarPreferencias = (id_usuario, preferencias, callback) => {
    // MySQL guarda JSON como texto, así que convertimos el objeto a string antes de guardar
    const preferenciasJSON = JSON.stringify(preferencias);
    
    const sql = `UPDATE Usuarios SET preferencias_accesibilidad = ? WHERE id_usuario = ?`;
    
    pool.query(sql, [preferenciasJSON, id_usuario], (err, result) => {
        if (err) {
            console.error("Error actualizando preferencias:", err);
            return callback(err);
        }
        callback(null, result);
    });
};

// Función de administrador para ascender o degradar usuarios (Admin <-> Empleado)
const cambiarRolUsuario = (id_usuario, nuevo_rol, callback) => {
    const sql = "UPDATE Usuarios SET rol = ? WHERE id_usuario = ?";
    
    pool.query(sql, [nuevo_rol, id_usuario], (err, result) => {
        if (err) {
            console.error("Error cambiando rol:", err);
            return callback(err);
        }
        callback(null, result);
    });
};

// Exportamos las funciones para usarlas en los controladores
module.exports = {
    registrarUsuario,
    obtenerUsuarioPorCorreo,
    obtenerTodosLosUsuarios,
    obtenerUsuarioPorId,
    actualizarPreferencias,
    cambiarRolUsuario
};