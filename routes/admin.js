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

// Ruta crear vehículo (con imagen)
adminRouter.post('/vehicles/new', uploadImg.single('imagen'), (req, res) => {
    let matricula = req.body.matricula ? req.body.matricula.toUpperCase().trim() : '';
    if (!/^\d{4}-[A-Z]{3}$/.test(matricula)) {
        req.session.error_msg = 'Error: Formato de matrícula incorrecto (9999-XXX).';
        return req.session.save(() => res.redirect('/admin/vehicles'));
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
    
    vehiclesQueries.crearVehiculo(newCar, (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') req.session.error_msg = `Error: La matrícula ${matricula} ya existe.`;
            else req.session.error_msg = 'Error interno al crear vehículo.';
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }
        req.session.success_msg = 'Vehículo creado correctamente.';
        req.session.save(() => res.redirect('/admin/vehicles'));
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

// POST: Crear nuevo concesionario
adminRouter.post('/dealerships/new', verificarAdmin, (req, res) => {
    const { nombre, ciudad, direccion, telefono } = req.body;
    
    // Validación básica
    if (!nombre || !ciudad || !direccion) {
        return res.redirect('/admin/dealerships?error=Faltan datos obligatorios');
    }

    dealershipsQueries.crearConcesionario({ nombre, ciudad, direccion, telefono }, (err) => {
        if (err) {
            return res.redirect('/admin/dealerships?error=Error al crear el concesionario');
        }
        res.redirect('/admin/dealerships');
    });
});

adminRouter.post('/vehicles/status', verificarAdmin, (req, res) => {
    const { id_vehiculo, nuevo_estado } = req.body;

    vehiclesQueries.actualizarEstadoVehiculo(id_vehiculo, nuevo_estado, (err) => {
        if (err) {
            // Usamos la sesión para el mensaje de error (como hicimos antes)
            req.session.error_msg = 'Error al actualizar el estado del vehículo.';
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }

        req.session.success_msg = 'Estado actualizado correctamente.';
        req.session.save(() => res.redirect('/admin/vehicles'));
    });
});
adminRouter.post('/vehicles/edit', verificarAdmin, uploadImg.single('imagen'), (req, res) => {
    const id = req.body.id_vehiculo;
    
    // Lógica para la imagen: 
    // 1. Si sube nueva (req.file), usamos esa.
    // 2. Si no sube nada, mantenemos la que tenía (req.body.current_imagen).
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
            req.session.error_msg = 'Error al editar el vehículo.';
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }
        req.session.success_msg = 'Vehículo actualizado correctamente.';
        req.session.save(() => res.redirect('/admin/vehicles'));
    });
});

// ELIMINAR VEHÍCULO
adminRouter.post('/vehicles/delete', verificarAdmin, (req, res) => {
    const id = req.body.id_vehiculo;

    // 1. PRIMER FILTRO: Comprobar reservas ACTIVAS o FUTURAS
    // Esta función mira la tabla Reservas, independientemente del estado del coche (mantenimiento, disponible...)
    reservationsQueries.verificarReservasActivasVehiculo(id, (err, tieneReservasActivas) => {
        if (err) {
            req.session.error_msg = 'Error técnico verificando las reservas.';
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }

        // Si hay reservas pendientes, BLOQUEAMOS aunque el coche esté en "Mantenimiento"
        if (tieneReservasActivas) {
            req.session.error_msg = 'ACCIÓN DENEGADA: Este vehículo tiene reservas activas o futuras. Debes cancelar esas reservas antes de poder eliminarlo del sistema.';
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }

        // 2. SEGUNDO FILTRO: Intentar borrar en Base de Datos
        vehiclesQueries.eliminarVehiculo(id, (err) => {
            if (err) {
                // Si entra aquí, es porque MySQL ha bloqueado el borrado por "Clave Foránea"
                // Significa que tiene historial de reservas PASADAS.
                console.error("Error BD al borrar:", err);
                req.session.error_msg = 'No se puede eliminar: El vehículo tiene historial de reservas antiguas. Por seguridad, los datos históricos no se borran. Cámbialo a estado "Mantenimiento" para ocultarlo.';
                return req.session.save(() => res.redirect('/admin/vehicles'));
            }
            
            // Si llegamos aquí, es que no tenía NINGUNA reserva (ni activa ni pasada)
            req.session.success_msg = 'Vehículo eliminado del sistema permanentemente.';
            req.session.save(() => res.redirect('/admin/vehicles'));
        });
    });
});

adminRouter.post('/reservations/cancel', verificarAdmin, (req, res) => {
    const { id_reserva } = req.body;

    reservationsQueries.cancelarReserva(id_reserva, (err) => {
        if (err) {
            console.error("Error cancelando reserva:", err);
            // Podrías usar req.session.error_msg si quieres mostrar feedback
            return res.redirect('/admin/reservations');
        }
        // Éxito
        res.redirect('/admin/reservations');
    });
});

adminRouter.post('/users/role', verificarAdmin, (req, res) => {
    const { id_usuario, nuevo_rol } = req.body;

    // Evitar que un admin se quite permisos a sí mismo por error
    if (parseInt(id_usuario) === req.session.user.id_usuario) {
        return res.redirect('/admin/users');
    }

    userQueries.cambiarRolUsuario(id_usuario, nuevo_rol, (err) => {
        if (err) {
            // Manejo de error básico
            return res.status(500).send("Error al cambiar el rol");
        }
        res.redirect('/admin/users');
    });
});
module.exports = adminRouter;