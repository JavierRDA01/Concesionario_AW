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

const findDealership = async (id) => {
    const sql = "SELECT id_concesionario, nombre, ciudad, direccion, telefono_contacto FROM concesionarios WHERE id_concesionario = ?";
    const values = [id];

    try {
        const [res] = await pool.query(sql, values);
        return res[0];
    } catch (error) {
        throw error;
    }
}

const updateDealership = async (dealership) => {
    const sql = "UPDATE concesionarios SET nombre = ?, ciudad = ?, direccion = ?, telefono_contacto = ? WHERE id_concesionario = ?";
    const values = [dealership.nombre, dealership.ciudad, dealership.direccion, dealership.telefono_contacto, dealership.id_concesionario];
    try {
        await pool.query(sql, values);
    } catch (error) {
        throw error;
    }
}

const deleteDealership = async (id) => {
    const sql = "DELETE FROM concesionarios WHERE id_concesionario = ?";
    const values = [id];
    try {
        await pool.query(sql, values);
    } catch (error) {
        throw error;
    }
}

module.exports = {
    saveDealership,
    obtenerConcesionarios,
    findDealership,
    updateDealership,
    deleteDealership
}
