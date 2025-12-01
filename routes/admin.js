const express = require('express');
const adminRouter = express.Router();
const adminQueries = require('../data/admin'); // Importamos el archivo que acabamos de crear
const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships'); // Asumo que existe, si no, avísame
const verificarAdmin = require('../middlewares/securityFilter');

// GET http://localhost:3000/admin/dashboard
adminRouter.get('/dashboard', verificarAdmin, async (req, res) => {
    
    // Llamamos a la función de base de datos
    const stats = await adminQueries.obtenerEstadisticasDashboard();

    // Renderizamos la vista 'admin_dashboard.ejs' pasándole los datos reales
    res.render('admin_dashboard', {
        stats: stats, // Los contadores
        ultimasReservas: stats.ultimasReservas, // La tabla
        user: req.session.user // Para que la barra de navegación sepa quiénes somos
    });
});

adminRouter.get('/vehicles', verificarAdmin, async (req, res) => {
    console.log("Accediendo a /admin/vehicles");
    // Necesitamos dos cosas: la lista de coches y la lista de concesionarios (para el modal)
    vehiclesQueries.obtenerTodosLosVehiculos((err, vehiculos) => {
        if (err) return res.status(500).send("Error cargando vehículos");
        console.log("Accediendo a /admin/vehicles 2");
        
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) return res.status(500).send("Error cargando concesionarios");
            console.log("Accediendo a /admin/vehicles 3");

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

module.exports = adminRouter;