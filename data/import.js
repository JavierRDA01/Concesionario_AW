const pool = require('./connection');

const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};

const procesarArchivoJSON = async (jsonData) => {
    const reporte = {
        concesionariosNuevos: 0,
        concesionariosExistentes: 0,
        vehiculosNuevos: [],
        vehiculosConflictivos: [],
        errores: []
    };

    try {
        for (const conc of jsonData) {
            let idConcesionario = null;

            // 1. Buscar o Crear Concesionario
            const resConc = await query("SELECT id_concesionario FROM Concesionarios WHERE nombre = ?", [conc.nombre]);

            if (resConc.length > 0) {
                idConcesionario = resConc[0].id_concesionario;
                reporte.concesionariosExistentes++;
            } else {
                const insertConc = await query(
                    "INSERT INTO Concesionarios (nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?)",
                    [conc.nombre, conc.ciudad, conc.direccion, conc.telefono]
                );
                idConcesionario = insertConc.insertId;
                reporte.concesionariosNuevos++;
            }

            // 2. Procesar Vehículos
            if (conc.vehiculos && conc.vehiculos.length > 0) {
                for (const v of conc.vehiculos) {
                    const resVeh = await query("SELECT id_vehiculo FROM Vehiculos WHERE matricula = ?", [v.matricula]);
                    
                    // Añadimos el ID del concesionario al objeto del vehículo
                    const vehiculoData = { ...v, id_concesionario: idConcesionario };

                    if (resVeh.length > 0) {
                        reporte.vehiculosConflictivos.push(vehiculoData);
                    } else {
                        reporte.vehiculosNuevos.push(vehiculoData);
                    }
                }
            }
        }
        return reporte;

    } catch (error) {
        console.error("Error procesando JSON:", error);
        throw error;
    }
};

const ejecutarImportacion = async (vehiculosNuevos, vehiculosAActualizar) => {
    const logs = { insertados: 0, actualizados: 0, errores: [] };

    // Insertar Nuevos
    for (const v of vehiculosNuevos) {
        try {
            await query(
                `INSERT INTO Vehiculos (matricula, marca, modelo, año_matriculacion, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'disponible', ?)`,
                [v.matricula, v.marca, v.modelo, v.anio, v.plazas, v.autonomia, v.color, v.imagen || 'default_car.jpg', v.id_concesionario]
            );
            logs.insertados++;
        } catch (err) {
            logs.errores.push(`Error insertando ${v.matricula}: ${err.message}`);
        }
    }

    // Actualizar Existentes
    for (const v of vehiculosAActualizar) {
        try {
            await query(
                `UPDATE Vehiculos SET marca=?, modelo=?, año_matriculacion=?, numero_plazas=?, autonomia_km=?, color=?, imagen=?, id_concesionario=? 
                 WHERE matricula=?`,
                [v.marca, v.modelo, v.anio, v.plazas, v.autonomia, v.color, v.imagen || 'default_car.jpg', v.id_concesionario, v.matricula]
            );
            logs.actualizados++;
        } catch (err) {
            logs.errores.push(`Error actualizando ${v.matricula}: ${err.message}`);
        }
    }

    return logs;
};

module.exports = { procesarArchivoJSON, ejecutarImportacion };