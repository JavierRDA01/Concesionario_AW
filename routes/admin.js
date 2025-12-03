const express = require('express');
const adminRouter = express.Router();
const path = require('path');
const multer = require('multer');
const adminQueries = require('../data/admin');
const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const importQueries = require('../data/import'); // <--- IMPORTANTE
const userQueries = require('../data/users'); // <--- ¡ESTA ES LA LÍNEA QUE FALTABA!
const reservationsQueries = require('../data/reservations'); // <--- ¡AÑADIDO!
// Configuración de subida para IMÁGENES (Disco)
const storageImg = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'public/img'); },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vehiculo-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadImg = multer({ 
    storage: storageImg,
    fileFilter: (req, file, cb) => {
        if (/jpeg|jpg|png|webp/.test(file.mimetype)) return cb(null, true);
        cb(new Error('Solo imágenes (jpeg, jpg, png, webp)'));
    }
});

// Configuración de subida para JSON (Memoria)
const uploadJSON = multer({ storage: multer.memoryStorage() });

// Middleware: Verificar Admin
const verificarAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.rol === 'admin') {
        return next();
    }
    return res.redirect('/login'); 
};

// Middleware: Verificar BD Vacía (Obliga a importar)
const checkDBEmpty = (req, res, next) => {
    // Si ya estamos en las rutas de importación, dejamos pasar para no hacer bucle infinito
    if (req.path.startsWith('/import')) {
        return next();
    }

    dealershipsQueries.obtenerConcesionarios((err, result) => {
        if (err) return next();
        if (result.length === 0) {
            req.session.error_msg = "ATENCIÓN: La base de datos está vacía. Es obligatorio realizar una carga inicial de datos (JSON).";
            return req.session.save(() => res.redirect('/admin/import'));
        }
        next();
    });
};

// Aplicamos middlewares globales a todo /admin
adminRouter.use(verificarAdmin);
adminRouter.use(checkDBEmpty);


// --- RUTAS DE IMPORTACIÓN ---

adminRouter.get('/import', (req, res) => {
    const error_msg = req.session.error_msg;
    delete req.session.error_msg;
    res.render('admin_import', { user: req.session.user, error_msg: error_msg });
});

adminRouter.post('/import/preview', uploadJSON.single('fichero_json'), async (req, res) => {
    try {
        if (!req.file) return res.render('admin_import', { user: req.session.user, error_msg: "Sube un archivo JSON." });
        
        const jsonData = JSON.parse(req.file.buffer.toString());
        const reporte = await importQueries.procesarArchivoJSON(jsonData);
        
        req.session.importData = { nuevos: reporte.vehiculosNuevos, conflictivos: reporte.vehiculosConflictivos };
        
        res.render('admin_import_preview', { user: req.session.user, reporte: reporte });
    } catch (error) {
        res.render('admin_import', { user: req.session.user, error_msg: "JSON inválido o error de proceso." });
    }
});

adminRouter.post('/import/confirm', async (req, res) => {
    try {
        const importData = req.session.importData;
        if (!importData) return res.redirect('/admin/import');

        const vehiculosAActualizar = (req.body.actualizar === 'yes') ? importData.conflictivos : [];
        const logs = await importQueries.ejecutarImportacion(importData.nuevos, vehiculosAActualizar);
        
        delete req.session.importData;
        res.render('admin_import_result', { user: req.session.user, logs: logs });
    } catch (error) {
        res.status(500).send("Error fatal en la importación.");
    }
});


// --- RUTAS DEL DASHBOARD Y GESTIÓN ---

adminRouter.get('/dashboard', (req, res) => {
    adminQueries.obtenerEstadisticasDashboard((err, stats) => {
        if (err) return res.status(500).send("Error del servidor");
        res.render('admin_dashboard', { stats: stats, ultimasReservas: stats.ultimasReservas, user: req.session.user });
    });
});

adminRouter.get('/vehicles', (req, res) => {
    vehiclesQueries.obtenerTodosLosVehiculos((err, vehiculos) => {
        if (err) return res.status(500).send("Error cargando vehículos");
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

adminRouter.post('/vehicles/new', verificarAdmin, uploadImg.single('imagen'), (req, res) => {
    let matricula = req.body.matricula ? req.body.matricula.toUpperCase().trim() : '';
    
    // Validación básica de matrícula
    if (!/^\d{4}-[A-Z]{3}$/.test(matricula)) {
        // En lugar de renderizar o redirigir, devolvemos JSON con error
        return res.status(400).json({ success: false, message: 'Formato de matrícula incorrecto (Ej: 1234-ABC).' });
    }

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
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: `La matrícula ${matricula} ya existe.` });
            }
            return res.status(500).json({ success: false, message: 'Error interno al crear vehículo.' });
        }

        // Devolvemos éxito y el ID del nuevo vehículo para que el frontend pueda añadir la fila
        newCar.id_vehiculo = result.insertId;
        res.json({ success: true, vehiculo: newCar });
    });
});

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

// GET: Listar concesionarios
adminRouter.get('/dealerships', verificarAdmin, (req, res) => {
    dealershipsQueries.obtenerConcesionarios((err, concesionarios) => {
        if (err) return res.status(500).send("Error al cargar concesionarios");
        
        res.render('admin_dealerships', {
            concesionarios: concesionarios,
            user: req.session.user,
            error: req.query.error // Para mostrar alerta si falla al crear
        });
    });
});

adminRouter.post('/dealerships/new', verificarAdmin, (req, res) => {
    const { nombre, ciudad, direccion, telefono } = req.body;
    
    // 1. Validación básica
    if (!nombre || !ciudad || !direccion) {
        // En lugar de redirigir con ?error=..., devolvemos un JSON con status 400
        return res.status(400).json({ 
            success: false, 
            message: 'Faltan datos obligatorios (Nombre, Ciudad o Dirección).' 
        });
    }

    // 2. Llamada a base de datos
    dealershipsQueries.crearConcesionario({ nombre, ciudad, direccion, telefono }, (err, result) => {
        if (err) {
            console.error(err);
            // Error de servidor, devolvemos JSON con status 500
            return res.status(500).json({ 
                success: false, 
                message: 'Error al crear el concesionario en la base de datos.' 
            });
        }
        
        // 3. ÉXITO: Devolvemos JSON con success: true y los datos del nuevo objeto
        // Necesitamos devolver el objeto para que el AJAX pueda pintar la fila nueva
        res.json({
            success: true,
            concesionario: {
                id_concesionario: result.insertId, // ID generado por MySQL
                nombre: nombre,
                ciudad: ciudad,
                direccion: direccion,
                telefono_contacto: telefono || '-'
            }
        });
    });
});
// 3. POST: Cambiar estado
adminRouter.post('/vehicles/status', verificarAdmin, (req, res) => {
    const { id_vehiculo, nuevo_estado } = req.body;
    
    vehiclesQueries.actualizarEstadoVehiculo(id_vehiculo, nuevo_estado, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
        }
        res.json({ success: true, nuevo_estado });
    });
});
// 2. POST: Editar vehículo
adminRouter.post('/vehicles/edit', verificarAdmin, uploadImg.single('imagen'), (req, res) => {
    const id = req.body.id_vehiculo;
    // Si suben imagen nueva la usamos, si no, mantenemos la antigua (hidden input)
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
        
        // Devolvemos los datos actualizados
        updatedCar.id_vehiculo = id;
        res.json({ success: true, vehiculo: updatedCar });
    });
});

//  POST: Eliminar vehículo
adminRouter.post('/vehicles/delete', verificarAdmin, (req, res) => {
    const id = req.body.id_vehiculo;

    // Primero verificamos si tiene reservas activas (función que ya tenías en reservations.js)
    reservationsQueries.verificarReservasActivasVehiculo(id, (err, tieneReservasActivas) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error técnico verificando reservas.' });
        }

        if (tieneReservasActivas) {
            return res.status(400).json({ success: false, message: 'DENEGADO: El vehículo tiene reservas activas o futuras.' });
        }

        vehiclesQueries.eliminarVehiculo(id, (err) => {
            if (err) {
                // Error probable por claves foráneas (historial antiguo)
                return res.status(400).json({ success: false, message: 'No se puede eliminar porque tiene historial. Pásalo a Mantenimiento.' });
            }
            res.json({ success: true });
        });
    });
});
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
adminRouter.post('/users/role', verificarAdmin, (req, res) => {
    const { id_usuario, nuevo_rol } = req.body;

    if (parseInt(id_usuario) === req.session.user.id_usuario) {
        return res.status(400).json({ success: false, message: "No puedes modificar tu propio rol." });
    }

    userQueries.cambiarRolUsuario(id_usuario, nuevo_rol, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Error al actualizar en base de datos." });
        }
        // ÉXITO: Devolvemos JSON en lugar de redirect
        res.json({ success: true, nuevo_rol: nuevo_rol, id_usuario: id_usuario });
    });
});
module.exports = adminRouter;