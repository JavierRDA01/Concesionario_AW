const express = require('express');
const adminRouter = express.Router();
const path = require('path'); 
const multer = require('multer');
const adminQueries = require('../data/admin'); 
const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const reservationsQueries = require('../data/reservations');
const userQueries = require('../data/users');
const fs = require('fs');
const importQueries = require('../data/import'); // <--- Importamos el nuevo módulo

// Configuración Multer para JSON (memoria, no disco, para procesarlo al vuelo)
const uploadJSON = multer({ storage: multer.memoryStorage() });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Guardamos las fotos en la carpeta pública
    cb(null, 'public/img');    
},
    filename: function (req, file, cb) {
        // Generamos un nombre único: imagen-fecha-numeroaleatorio.extensión
        // Ejemplo: vehiculo-168985555-123.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vehiculo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Límite de 2MB
    fileFilter: (req, file, cb) => {
        // Validar que sea una imagen
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
});
// Middleware para proteger la ruta: Solo entra si es admin
const verificarAdmin = (req, res, next) => {
    // Si el usuario existe en sesión y su rol es 'admin'
    if (req.session.user && req.session.user.rol === 'admin') {
        return next();
    }
    // Si no, lo mandamos al login o a inicio
    return res.redirect('/login'); 
};

// GET http://localhost:3000/admin/dashboard
adminRouter.get('/dashboard', verificarAdmin, (req, res) => {
    
    // Llamamos a la función de base de datos
    adminQueries.obtenerEstadisticasDashboard((err, stats) => {
        if (err) {
            console.error("Error cargando dashboard:", err);
            return res.status(500).send("Error del servidor");
        }

        // Renderizamos la vista 'admin_dashboard.ejs' pasándole los datos reales
        res.render('admin_dashboard', {
            stats: stats, // Los contadores
            ultimasReservas: stats.ultimasReservas, // La tabla
            user: req.session.user // Para que la barra de navegación sepa quiénes somos
        });
    });
});

adminRouter.get('/vehicles', verificarAdmin, (req, res) => {
    vehiclesQueries.obtenerTodosLosVehiculos((err, vehiculos) => {
        if (err) return res.status(500).send("Error cargando vehículos");
        
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) return res.status(500).send("Error cargando concesionarios");

            // 1. LEEMOS LOS MENSAJES DE LA SESIÓN
            const error_msg = req.session.error_msg;
            const success_msg = req.session.success_msg;

            delete req.session.error_msg;
            delete req.session.success_msg;

            res.render('admin_vehicles', {
                vehiculos: vehiculos,
                concesionarios: concesionarios,
                user: req.session.user,
                success_msg: success_msg, 
                error_msg: error_msg 
            });
        });
    });
});

// 2. PROCESAR EL ALTA DE VEHÍCULO
adminRouter.post('/vehicles/new', verificarAdmin, upload.single('imagen'), (req, res) => {
    
    let matricula = req.body.matricula ? req.body.matricula.toUpperCase().trim() : '';
    const formatoMatricula = /^\d{4}-[A-Z]{3}$/;

    if (!formatoMatricula.test(matricula)) {
        req.session.error_msg = 'Error: La matrícula debe cumplir el formato 9900-NOP.';
        return req.session.save(() => res.redirect('/admin/vehicles'));
    }

    // Si se subió un archivo, usamos su nombre. Si no, la default.
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
        imagen: imagenNombre // <--- Usamos el nombre generado
    };
    
    vehiclesQueries.crearVehiculo(newCar, (err) => {
        if (err) {
            console.error("Error creando vehículo:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                 req.session.error_msg = `Error: La matrícula ${matricula} ya existe.`;
            } else {
                 req.session.error_msg = 'Error interno al crear el vehículo.';
            }
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }
        req.session.success_msg = 'Vehículo registrado correctamente.';
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
adminRouter.post('/vehicles/edit', verificarAdmin, upload.single('imagen'), (req, res) => {
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
        imagen: imagenFinal // <--- Imagen actualizada o mantenida
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

    vehiclesQueries.eliminarVehiculo(id, (err) => {
        if (err) {
            req.session.error_msg = 'No se puede eliminar el vehículo porque tiene historial de reservas. Prueba a cambiar su estado a "Mantenimiento" o "Baja".';
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }
        req.session.success_msg = 'Vehículo eliminado del sistema.';
        req.session.save(() => res.redirect('/admin/vehicles'));
    });
});

// 1. GET: Mostrar formulario de subida
adminRouter.get('/import', verificarAdmin, (req, res) => {
    res.render('admin_import', { user: req.session.user });
});

// 2. POST: Recibir archivo y analizar conflictos
adminRouter.post('/import/preview', verificarAdmin, uploadJSON.single('fichero_json'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("Por favor, sube un archivo JSON.");

        // Leemos el JSON desde el buffer de memoria
        const jsonData = JSON.parse(req.file.buffer.toString());

        // Procesamos para ver qué pasaría (sin guardar aún)
        const reporte = await importQueries.procesarArchivoJSON(jsonData);

        // Guardamos los datos en sesión temporalmente para el paso de confirmación
        req.session.importData = {
            nuevos: reporte.vehiculosNuevos,
            conflictivos: reporte.vehiculosConflictivos
        };

        // Renderizamos la vista de confirmación
        res.render('admin_import_preview', { 
            user: req.session.user,
            reporte: reporte
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error procesando el archivo JSON: " + error.message);
    }
});

// 3. POST: Confirmar y ejecutar
adminRouter.post('/import/confirm', verificarAdmin, async (req, res) => {
    try {
        const importData = req.session.importData;
        if (!importData) return res.redirect('/admin/import');

        // Filtramos: ¿El usuario marcó el checkbox "actualizar"?
        // Si req.body.actualizar es 'yes', actualizamos los conflictivos. Si no, los ignoramos.
        const vehiculosAActualizar = (req.body.actualizar === 'yes') ? importData.conflictivos : [];
        
        // Ejecutamos la importación real
        const logs = await importQueries.ejecutarImportacion(importData.nuevos, vehiculosAActualizar);

        // Limpiamos sesión
        delete req.session.importData;

        // Renderizamos resultado (Logs)
        res.render('admin_import_result', {
            user: req.session.user,
            logs: logs
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error ejecutando la importación.");
    }
});
module.exports = adminRouter;