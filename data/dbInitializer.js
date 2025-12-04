const pool = require('./connection');
const bcrypt = require('bcryptjs');

// Helper para usar async/await con pool.query
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};

const initDB = async () => {
    try {
        // Comprobar si hay concesionarios (indicador de que la BD tiene datos)
        const result = await query("SELECT COUNT(*) as total FROM Concesionarios");
        
        if (result[0].total > 0) {
            console.log("La base de datos ya contiene datos.");
        } else {
            console.log("Base de datos vacía. Se requerirá carga manual en el panel de administración.");
        }

        // Asegurar que existe al menos un Administrador para poder entrar a cargar los datos
        const admins = await query("SELECT COUNT(*) as total FROM Usuarios WHERE rol='admin'");
        if (admins[0].total === 0) {
            console.log("No hay administradores. Creando admin por defecto...");
            const passwordHash = await bcrypt.hash("admin123", 10);
            await query(
                "INSERT INTO Usuarios (nombre, correo, contraseña, rol, preferencias_accesibilidad) VALUES (?, ?, ?, ?, ?)",
                ["Administrador Principal", "admin@ucm.es", passwordHash, "admin", JSON.stringify({})]
            );
            console.log("Usuario Admin creado: admin@ucm.es / admin123");
        }

    } catch (error) {
        console.error("Error en la inicialización de la BD:", error);
    }
};

module.exports = initDB;