const express = require('express');
// Importamos las utilidades de validación (aunque en este archivo no las estás usando explícitamente en el router.post, las importas por si acaso)
const { check, validationResult } = require('express-validator');
const router = express.Router();

// Importamos las funciones de acceso a datos de las distintas entidades
const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const reservationsQueries = require('../data/reservations');

// Muestra el formulario para crear una nueva reserva
router.get('/new', (req, res) => {
    // 1. Verificar que hay usuario logueado. Si no, redirigir al login.
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const idConcesionario = req.session.user.id_concesionario;
    // Si venimos de un enlace "Reservar este coche", capturamos el ID del vehículo de la URL
    const selectedVehicleId = req.query.vehiculo_id; 

    // Función interna para renderizar la vista y evitar duplicar código en el if/else de abajo
    const renderVista = (vehiculos) => {
        // Obtenemos la lista de concesionarios para mostrarlos en la info o selectores si fuera necesario
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) {
                console.error(errC);
                // Si falla la carga de concesionarios, mostramos la vista con un error
                return res.status(500).render('reservations_new', { 
                    vehiculos: [], 
                    concesionarios: [], 
                    errors: [{msg: 'Error cargando concesionarios'}], 
                    oldInput: {} 
                });
            }
            
            // Renderizamos la vista 'reservations_new' pasando los datos
            res.render('reservations_new', {
                vehiculos,
                concesionarios,
                errors: null,
                // Si venía un ID de vehículo en la URL, lo preseleccionamos en el formulario
                oldInput: { id_vehiculo: selectedVehicleId }, 
                success_msg: null
            });
        });
    };

    // 2. Lógica de filtrado de vehículos según el rol
    if (req.session.user.rol === 'admin' || !idConcesionario) {
        // Si es admin o un usuario sin base asignada, mostramos TODOS los vehículos disponibles
        vehiclesQueries.obtenerVehiculosDisponibles((err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            renderVista(vehiculos);
        });
    } else {
        // Si es EMPLEADO con base asignada, mostramos SOLO los vehículos de SU base
        vehiclesQueries.obtenerVehiculosDisponiblesPorConcesionario(idConcesionario, (err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            renderVista(vehiculos);
        });
    }
});

// Procesa el formulario de creación de reserva
router.post('/new', (req, res) => {
    const oldInput = req.body; // Guardamos lo que el usuario escribió por si hay error
    
    // Verificamos sesión
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // Preparamos el objeto con los datos de la reserva
    const data = {
        id_usuario: req.session.user.id_usuario, 
        id_vehiculo: req.body.id_vehiculo,
        fecha_inicio: req.body.fecha_inicio,
        fecha_fin: req.body.fecha_fin,
        estado: 'activa', // Por defecto la reserva nace activa
        kilometros_recorridos: req.body.kilometros_recorridos || 0, // Si no pone nada, 0
        incidencias_reportadas: req.body.incidencias_reportadas || null // Si no pone nada, null
    };

    // Llamamos a la función de base de datos para crear la reserva
    reservationsQueries.crearReserva(data, (err) => {
        if (err) {
            console.error('Error creando reserva:', err);
            
            // Si falla (ej: vehículo no disponible en esas fechas), tenemos que volver a pintar el formulario
            // Para eso necesitamos volver a cargar la lista de vehículos respetando el filtro de base/rol
            const idConcesionario = req.session.user.id_concesionario;
            
            const renderError = (vehiculos) => {
                res.status(400).render('reservations_new', { 
                    vehiculos: vehiculos || [], 
                    errors: [{ msg: err.message }], // Mostramos el mensaje de error (ej: "Vehículo no disponible")
                    oldInput, // Devolvemos los datos que escribió para que no tenga que reescribirlos
                    success_msg: null
                });
            };

            // Misma lógica de filtro que en el GET
            if (req.session.user.rol === 'admin' || !idConcesionario) {
                vehiclesQueries.obtenerVehiculosDisponibles((errV, vehiculos) => renderError(vehiculos));
            } else {
                vehiclesQueries.obtenerVehiculosDisponiblesPorConcesionario(idConcesionario, (errV, vehiculos) => renderError(vehiculos));
            }
            return;
        }

        // Éxito: Redirigimos al historial de reservas del usuario
        return res.redirect('/my-reservations');
    });
});

module.exports = router;