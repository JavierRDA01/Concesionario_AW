const express = require('express');
const adminRouter = express.Router();
const adminQueries = require('../data/admin'); 
const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const reservationsQueries = require('../data/reservations');
const userQueries = require('../data/users');

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
adminRouter.post('/vehicles/new', verificarAdmin, (req, res) => {
    
    let matricula = req.body.matricula ? req.body.matricula.toUpperCase().trim() : '';
    const formatoMatricula = /^\d{4}-[A-Z]{3}$/;

    // VALIDACIÓN DE FORMATO
    if (!formatoMatricula.test(matricula)) {
        req.session.error_msg = 'Error: La matrícula debe cumplir el formato 9900-NOP.';
        // Guardamos y redirigimos
        return req.session.save(() => res.redirect('/admin/vehicles'));
    }

    const newCar = {
        matricula: matricula,
        marca: req.body.marca,
        modelo: req.body.modelo,
        anio: req.body.anio,
        plazas: req.body.plazas,
        autonomia: req.body.autonomia,
        color: req.body.color,
        id_concesionario: req.body.id_concesionario,
        imagen: req.body.imagen
    };
    
    vehiclesQueries.crearVehiculo(newCar, (err) => {
        if (err) {
            console.error("Error creando vehículo:", err);
            // DETECCIÓN DE DUPLICADOS
            if (err.code === 'ER_DUP_ENTRY') {
                 req.session.error_msg = `Error: La matrícula ${matricula} ya existe en el sistema.`;
            } else {
                 req.session.error_msg = 'Error interno al crear el vehículo.';
            }
            // Guardamos error y redirigimos a la URL limpia
            return req.session.save(() => res.redirect('/admin/vehicles'));
        }

        // ÉXITO
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

adminRouter.post('/vehicles/edit', verificarAdmin, (req, res) => {
    const id = req.body.id_vehiculo;
    
    // Objeto con los datos del formulario
    const updatedCar = {
        matricula: req.body.matricula.toUpperCase().trim(),
        marca: req.body.marca,
        modelo: req.body.modelo,
        anio: req.body.anio,
        plazas: req.body.plazas,
        autonomia: req.body.autonomia,
        color: req.body.color,
        id_concesionario: req.body.id_concesionario,
        imagen: req.body.imagen
    };

    vehiclesQueries.actualizarVehiculo(id, updatedCar, (err) => {
        if (err) {
            // Si falla (por ejemplo, matrícula duplicada al editar)
            req.session.error_msg = 'Error al editar: Revisa los datos o si la matrícula ya existe.';
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
module.exports = adminRouter;