const express = require('express');
const adminRouter = express.Router();
const path = require('path');
const multer = require('multer');

// Importamos los archivos que contienen las funciones para hablar con la base de datos
const adminQueries = require('../data/admin');
const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const importQueries = require('../data/import'); 
const userQueries = require('../data/users'); 
const reservationsQueries = require('../data/reservations'); 

// Configuración de Multer para subir imágenes
// Las guarda en la carpeta 'public/img' y les pone un nombre único con la fecha
const storageImg = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'public/img'); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vehiculo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para asegurar que solo se suben archivos de imagen
const uploadImg = multer({ 
    storage: storageImg,
    fileFilter: (req, file, cb) => {
        if (/jpeg|jpg|png|webp/.test(file.mimetype)) return cb(null, true);
        cb(new Error('Solo imágenes (jpeg, jpg, png, webp)'));
    }
});

// Configuración para subir archivos JSON (se guardan en la memoria RAM temporalmente para leerlos)
const uploadJSON = multer({ storage: multer.memoryStorage() });

// Middleware de seguridad: comprueba si el usuario es administrador
// Si no lo es, lo manda al login
const verificarAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.rol === 'admin') {
        return next();
    }
    return res.redirect('/login'); 
};

// Si no hay concesionarios en la BD, obliga a ir a la página de importación
// Esto sirve para la carga inicial
const checkDBEmpty = (req, res, next) => {
    // Si ya estamos en la página de importar, dejamos pasar para no crear un bucle infinito
    if (req.path.startsWith('/import')) {
        return next();
    }

    dealershipsQueries.obtenerConcesionarios((err, result) => {
        if (err) return next();
        // Si la lista de concesionarios está vacía, redirigimos a importar
        if (result.length === 0) {
            req.session.error_msg = "ATENCIÓN: La base de datos está vacía. Es obligatorio realizar una carga inicial de datos (JSON).";
            return req.session.save(() => res.redirect('/admin/import'));
        }
        next();
    });
};

// Aplicamos los middlewares a todas las rutas de este archivo
adminRouter.use(verificarAdmin);
adminRouter.use(checkDBEmpty);


// --- RUTAS DE IMPORTACIÓN (JSON) ---

// Muestra la pantalla para subir el fichero JSON
adminRouter.get('/import', (req, res) => {
    const error_msg = req.session.error_msg;
    delete req.session.error_msg;
    res.render('admin_import', { user: req.session.user, error_msg: error_msg });
});

// Recibe el archivo JSON, lo lee y muestra una vista previa de lo que va a pasar
adminRouter.post('/import/preview', uploadJSON.single('fichero_json'), async (req, res) => {
    try {
        if (!req.file) return res.render('admin_import', { user: req.session.user, error_msg: "Sube un archivo JSON." });
        
        // Convertimos el archivo subido a un objeto de JavaScript
        const jsonData = JSON.parse(req.file.buffer.toString());
        // Procesamos los datos para ver cuáles son nuevos y cuáles conflictivos
        const reporte = await importQueries.procesarArchivoJSON(jsonData);
        
        // Guardamos los datos en la sesión temporalmente para usarlos en el siguiente paso (confirmación)
        req.session.importData = { nuevos: reporte.vehiculosNuevos, conflictivos: reporte.vehiculosConflictivos };
        
        res.render('admin_import_preview', { user: req.session.user, reporte: reporte });
    } catch (error) {
        res.render('admin_import', { user: req.session.user, error_msg: "JSON inválido o error de proceso." });
    }
});

// Ejecuta la importación real en la base de datos
adminRouter.post('/import/confirm', async (req, res) => {
    try {
        const importData = req.session.importData;
        if (!importData) return res.redirect('/admin/import');

        // Si el usuario marcó el checkbox de actualizar, usamos los conflictivos. Si no, los ignoramos.
        const vehiculosAActualizar = (req.body.actualizar === 'yes') ? importData.conflictivos : [];
        const logs = await importQueries.ejecutarImportacion(importData.nuevos, vehiculosAActualizar);
        
        // Borramos los datos temporales de la sesión
        delete req.session.importData;
        res.render('admin_import_result', { user: req.session.user, logs: logs });
    } catch (error) {
        res.status(500).send("Error fatal en la importación.");
    }
});


// --- RUTAS DEL DASHBOARD Y GESTIÓN ---

// Muestra el panel principal con estadísticas y gráficos
adminRouter.get('/dashboard', (req, res) => {
    adminQueries.obtenerEstadisticasDashboard((err, stats) => {
        if (err) return res.status(500).send("Error del servidor");
        res.render('admin_dashboard', { stats: stats, ultimasReservas: stats.ultimasReservas, user: req.session.user });
    });
});

// Muestra la tabla de gestión de vehículos
adminRouter.get('/vehicles', (req, res) => {
    vehiclesQueries.obtenerTodosLosVehiculos((err, vehiculos) => {
        if (err) return res.status(500).send("Error cargando vehículos");
        // También necesitamos los concesionarios para el select del modal de crear/editar
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) return res.status(500).send("Error cargando concesionarios");
            
            const success_msg = req.session.success_msg;
            const error_msg = req.session.error_msg;
            delete req.session.success_msg;
            delete req.session.error_msg;

            res.render('admin_vehicles', {
                vehiculos, concesionarios, user: req.session.user,
                success_msg, error_msg
            });
        });
    });
});

// Crea un nuevo vehículo (con subida de imagen)
adminRouter.post('/vehicles/new', verificarAdmin, uploadImg.single('imagen'), (req, res) => {
    let matricula = req.body.matricula ? req.body.matricula.toUpperCase().trim() : '';
    
    // Validación básica de formato de matrícula
    if (!/^\d{4}-[A-Z]{3}$/.test(matricula)) {
        return res.status(400).json({ success: false, message: 'Formato de matrícula incorrecto (Ej: 1234-ABC).' });
    }

    // Si no hay imagen, usamos la de por defecto
    const imagenNombre = req.file ? req.file.filename : 'default_car.jpg';
    
    const newCar = {
        matricula: matricula,
        marca: req.body.marca,
        modelo: req.body.modelo,
        anio: req.body.anio,
        plazas: req.body.plazas,
        autonomia: req.body.autonomia,
        color: req.body.color,
        id_concesionario: req.body.id_concesionario,
        imagen: imagenNombre
    };
    
    vehiclesQueries.crearVehiculo(newCar, (err, result) => {
        if (err) {
            // Controlamos el error específico de matrícula duplicada
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: `La matrícula ${matricula} ya existe.` });
            }
            return res.status(500).json({ success: false, message: 'Error interno al crear vehículo.' });
        }

        // Devolvemos éxito y los datos para que la web actualice la tabla sin recargar
        newCar.id_vehiculo = result.insertId;
        res.json({ success: true, vehiculo: newCar });
    });
});

// Listado de todas las reservas del sistema
adminRouter.get('/reservations', verificarAdmin, (req, res) => {
    reservationsQueries.obtenerTodasLasReservasDetalladas((err, reservas) => {
        if (err) {
            console.error("Error listando reservas:", err);
            return res.status(500).send("Error del servidor al cargar reservas");
        }

        res.render('admin_reservations', {
            reservas: reservas,
            user: req.session.user
        });
    });
});

// Listado de usuarios (para cambiar roles)
adminRouter.get('/users', verificarAdmin, (req, res) => {
    userQueries.obtenerTodosLosUsuarios((err, users) => {
        if (err) {
            return res.status(500).send("Error al cargar usuarios");
        }
        res.render('admin_users', {
            users: users,
            user: req.session.user
        });
    });
});

// Listado de concesionarios
adminRouter.get('/dealerships', verificarAdmin, (req, res) => {
    dealershipsQueries.obtenerConcesionarios((err, concesionarios) => {
        if (err) return res.status(500).send("Error al cargar concesionarios");
        
        res.render('admin_dealerships', {
            concesionarios: concesionarios,
            user: req.session.user,
            error: req.query.error 
        });
    });
});

// Crea un nuevo concesionario
adminRouter.post('/dealerships/new', verificarAdmin, (req, res) => {
    const { nombre, ciudad, direccion, telefono } = req.body;
    
    // Validación simple de campos obligatorios
    if (!nombre || !ciudad || !direccion) {
        return res.status(400).json({ 
            success: false, 
            message: 'Faltan datos obligatorios (Nombre, Ciudad o Dirección).' 
        });
    }

    dealershipsQueries.crearConcesionario({ nombre, ciudad, direccion, telefono }, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al crear el concesionario en la base de datos.' 
            });
        }
        
        // Devolvemos el nuevo concesionario creado para actualizar la tabla visualmente
        res.json({
            success: true,
            concesionario: {
                id_concesionario: result.insertId,
                nombre: nombre,
                ciudad: ciudad,
                direccion: direccion,
                telefono_contacto: telefono || '-'
            }
        });
    });
});

// Actualiza el estado de un vehículo (AJAX)
adminRouter.post('/vehicles/status', verificarAdmin, (req, res) => {
    const { id_vehiculo, nuevo_estado } = req.body;
    
    vehiclesQueries.actualizarEstadoVehiculo(id_vehiculo, nuevo_estado, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
        }
        res.json({ success: true, nuevo_estado });
    });
});

// Edita un vehículo existente
adminRouter.post('/vehicles/edit', verificarAdmin, uploadImg.single('imagen'), (req, res) => {
    const id = req.body.id_vehiculo;
    // Si suben imagen nueva, la usamos. Si no, mantenemos la que ya tenía.
    const imagenFinal = req.file ? req.file.filename : req.body.current_imagen;

    const updatedCar = {
        matricula: req.body.matricula.toUpperCase().trim(),
        marca: req.body.marca,
        modelo: req.body.modelo,
        anio: req.body.anio,
        plazas: req.body.plazas,
        autonomia: req.body.autonomia,
        color: req.body.color,
        id_concesionario: req.body.id_concesionario,
        imagen: imagenFinal
    };

    vehiclesQueries.actualizarVehiculo(id, updatedCar, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al actualizar el vehículo.' });
        }
        
        updatedCar.id_vehiculo = id;
        res.json({ success: true, vehiculo: updatedCar });
    });
});

// Elimina un vehículo
adminRouter.post('/vehicles/delete', verificarAdmin, (req, res) => {
    const id = req.body.id_vehiculo;

    // Seguridad: Primero comprobamos si tiene reservas activas en el futuro
    reservationsQueries.verificarReservasActivasVehiculo(id, (err, tieneReservasActivas) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error técnico verificando reservas.' });
        }

        if (tieneReservasActivas) {
            return res.status(400).json({ success: false, message: 'DENEGADO: El vehículo tiene reservas activas o futuras.' });
        }

        // Si no tiene reservas activas, procedemos a borrar
        vehiclesQueries.eliminarVehiculo(id, (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: 'No se puede eliminar porque tiene historial. Pásalo a Mantenimiento.' });
            }
            res.json({ success: true });
        });
    });
});

// Cancela una reserva de forma forzosa (admin)
adminRouter.post('/reservations/cancel', verificarAdmin, (req, res) => {
    const { id_reserva } = req.body;

    reservationsQueries.cancelarReserva(id_reserva, (err) => {
        if (err) {
            console.error("Error cancelando reserva:", err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al cancelar la reserva en la base de datos.' 
            });
        }
        
        res.json({ success: true, message: 'Reserva cancelada correctamente.' });
    });
});

// Cambia el rol de un usuario (Admin <-> Empleado)
adminRouter.post('/users/role', verificarAdmin, (req, res) => {
    const { id_usuario, nuevo_rol } = req.body;

    //No permitir cambiarse el rol a uno mismo para no perder acceso admin
    if (parseInt(id_usuario) === req.session.user.id_usuario) {
        return res.status(400).json({ success: false, message: "No puedes modificar tu propio rol." });
    }

    userQueries.cambiarRolUsuario(id_usuario, nuevo_rol, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Error al actualizar en base de datos." });
        }
        
        res.json({ success: true, nuevo_rol: nuevo_rol, id_usuario: id_usuario });
    });
});

module.exports = adminRouter;