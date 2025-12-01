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
    // Necesitamos dos cosas: la lista de coches y la lista de concesionarios (para el modal)
    vehiclesQueries.obtenerTodosLosVehiculos((err, vehiculos) => {
        if (err) return res.status(500).send("Error cargando vehículos");
        
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) return res.status(500).send("Error cargando concesionarios");

            res.render('admin_vehicles', {
                vehiculos: vehiculos,
                concesionarios: concesionarios,
                user: req.session.user,
                success_msg: null,
                error_msg: null
            });
        });
    });
});

// 2. PROCESAR EL ALTA DE VEHÍCULO
adminRouter.post('/vehicles/new', verificarAdmin, (req, res) => {
    const newCar = req.body;
    
    vehiclesQueries.crearVehiculo(newCar, (err) => {
        if (err) {
            console.error(err);
            // En una app real, aquí deberíamos volver a renderizar con los errores
            // Para simplificar, redirigimos con error (o podrías renderizar de nuevo)
            return res.redirect('/admin/vehicles?error=1');
        }
        res.redirect('/admin/vehicles?success=1');
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
module.exports = adminRouter;