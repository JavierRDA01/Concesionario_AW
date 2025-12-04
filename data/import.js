const pool = require('./connection');

// Función auxiliar para poder usar async/await en las consultas a la base de datos
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};

// Analiza el JSON subido y clasifica los datos antes de guardarlos
const procesarArchivoJSON = async (jsonData) => {
    const reporte = {
        concesionariosNuevos: 0,
        concesionariosExistentes: 0,
        vehiculosNuevos: [],
        vehiculosConflictivos: [], // Vehículos que ya existen (misma matrícula)
        errores: []
    };

    try {
        // Recorremos cada concesionario del archivo JSON
        for (const conc of jsonData) {
            let idConcesionario = null;

            // 1. Buscamos si el concesionario ya existe en la BD por su nombre
            const resConc = await query("SELECT id_concesionario FROM Concesionarios WHERE nombre = ?", [conc.nombre]);

            if (resConc.length > 0) {
                // Si existe, cogemos su ID
                idConcesionario = resConc[0].id_concesionario;
                reporte.concesionariosExistentes++;
            } else {
                // Si no existe, lo creamos y guardamos el ID generado
                const insertConc = await query(
                    "INSERT INTO Concesionarios (nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?)",
                    [conc.nombre, conc.ciudad, conc.direccion, conc.telefono]
                );
                idConcesionario = insertConc.insertId;
                reporte.concesionariosNuevos++;
            }

            // 2. Procesamos los vehículos de ese concesionario
            if (conc.vehiculos && conc.vehiculos.length > 0) {
                for (const v of conc.vehiculos) {
                    // Comprobamos si la matrícula ya existe
                    const resVeh = await query("SELECT id_vehiculo FROM Vehiculos WHERE matricula = ?", [v.matricula]);
                    
                    // Preparamos los datos del vehículo añadiendo el ID del concesionario correcto
                    const vehiculoData = { ...v, id_concesionario: idConcesionario };

                    if (resVeh.length > 0) {
                        // Si ya existe, lo marcamos como conflictivo (para preguntar si actualizar)
                        reporte.vehiculosConflictivos.push(vehiculoData);
                    } else {
                        // Si no existe, es un vehículo nuevo
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

// Ejecuta las inserciones y actualizaciones finales en la BD
const ejecutarImportacion = async (vehiculosNuevos, vehiculosAActualizar) => {
    const logs = { insertados: 0, actualizados: 0, errores: [] };

    // 1. Insertar Vehículos Nuevos
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

    // 2. Actualizar Vehículos Existentes (si el usuario lo confirmó)
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