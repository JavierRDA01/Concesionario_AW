// Importamos la conexión a la base de datos (el "pool" de conexiones que configuraste en connection.js)
const pool = require('./connection');

// Función para obtener la lista de todos los concesionarios
const obtenerConcesionarios = (callback) => {
    // Escribimos la consulta SQL para pedir los datos necesarios de la tabla 'Concesionarios'
    // Los ordenamos por ID de forma ascendente (ASC)
    const sql = "SELECT id_concesionario, nombre, ciudad, direccion, telefono_contacto FROM Concesionarios ORDER BY id_concesionario ASC";
    
    // Ejecutamos la consulta en la base de datos
    pool.query(sql, (err, result) => {
        // Si hay un fallo (err), lo mostramos en la consola y avisamos a la función que nos llamó
        if (err) {
            console.error("Error al obtener los concesionarios: ", err.message);
            return callback(err);
        }
        // Si todo sale bien, devolvemos el resultado (la lista de concesionarios) sin errores (null)
        callback(null, result);
    });
};

// Función para guardar un nuevo concesionario en la base de datos
const crearConcesionario = (data, callback) => {
    // Preparamos la sentencia SQL para insertar datos.
    // Los signos de interrogación (?) son marcadores de seguridad para evitar problemas de seguridad (inyección SQL)
    const sql = "INSERT INTO Concesionarios (nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?)";
    
    // Aquí ponemos los datos reales que vienen del formulario (data) en un array, en el mismo orden que los '?'
    const values = [data.nombre, data.ciudad, data.direccion, data.telefono];
    
    // Ejecutamos la inserción pasando la consulta SQL y los valores
    pool.query(sql, values, (err, result) => {
        // Si falla, mostramos el error y paramos
        if (err) {
            console.error("Error al crear concesionario: ", err.message);
            return callback(err);
        }
        // Si funciona, devolvemos el resultado (que contiene info como el ID del nuevo registro creado)
        callback(null, result);
    });
};

// Exportamos (hacemos públicas) estas funciones para poder usarlas en otros archivos de la aplicación (por ejemplo, en las rutas)
module.exports = {
    obtenerConcesionarios,
    crearConcesionario 
};