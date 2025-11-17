const pool = require('./connection');

const saveDealership = async (dealership) => {
    const sql = "INSERT INTO concesionarios (nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?)";
    const values = [dealership.nombre, dealership.ciudad, dealership.direccion, dealership.telefonoContacto];
    try {
        await pool.query(sql, values);
    } catch (error) {
        throw error;
    }
}

const obtenerConcesionarios = async () => {
    //Query para obtener todos los concesionarios de la bbdd
    const sql = "SELECT id_concesionario, nombre, ciudad, direccion, telefono_contacto FROM concesionarios";

    try {
        const [res] = await pool.query(sql);
        return res;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    saveDealership,
    obtenerConcesionarios
}