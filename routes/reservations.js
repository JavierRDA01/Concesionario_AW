const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();

const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const reservationsQueries = require('../data/reservations');

router.get('/new', (req, res) => {
    // 1. Verificar que hay usuario logueado
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const idConcesionario = req.session.user.id_concesionario;
    const selectedVehicleId = req.query.vehiculo_id; // Por si viene redirigido de "Reservar este coche"

    // Función interna para renderizar la vista (para no repetir código en el if/else)
    const renderVista = (vehiculos) => {
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) {
                console.error(errC);
                return res.status(500).render('reservations_new', { 
                    vehiculos: [], 
                    concesionarios: [], 
                    errors: [{msg: 'Error cargando concesionarios'}], 
                    oldInput: {} 
                });
            }
            
            res.render('reservations_new', {
                vehiculos,
                concesionarios,
                errors: null,
                oldInput: { id_vehiculo: selectedVehicleId }, // Preseleccionar si viene por URL
                success_msg: null
            });
        });
    };

    // 2. Lógica de filtrado
    if (req.session.user.rol === 'admin' || !idConcesionario) {
        // Si es admin o no tiene base asignada, le mostramos TODOS los disponibles (opcional)
        vehiclesQueries.obtenerVehiculosDisponibles((err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            renderVista(vehiculos);
        });
    } else {
        // Si es EMPLEADO con base, mostramos SOLO SU BASE
        vehiclesQueries.obtenerVehiculosDisponiblesPorConcesionario(idConcesionario, (err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            renderVista(vehiculos);
        });
    }
});

router.post('/new', (req, res) => {
    const oldInput = req.body;
    
    // Verificamos usuario
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const data = {
        id_usuario: req.session.user.id_usuario, 
        id_vehiculo: req.body.id_vehiculo,
        fecha_inicio: req.body.fecha_inicio,
        fecha_fin: req.body.fecha_fin,
        estado: 'activa',
        kilometros_recorridos: req.body.kilometros_recorridos || 0,
        incidencias_reportadas: req.body.incidencias_reportadas || null
    };

    reservationsQueries.crearReserva(data, (err) => {
        if (err) {
            console.error('Error creando reserva:', err);
            
            // Si falla, necesitamos volver a cargar los vehículos para pintar el formulario
            // IMPORTANTE: Respetamos la lógica de base asignada
            const idConcesionario = req.session.user.id_concesionario;
            
            const renderError = (vehiculos) => {
                res.status(400).render('reservations_new', { 
                    vehiculos: vehiculos || [], 
                    errors: [{ msg: err.message }], 
                    oldInput,
                    success_msg: null
                });
            };

            if (req.session.user.rol === 'admin' || !idConcesionario) {
                vehiclesQueries.obtenerVehiculosDisponibles((errV, vehiculos) => renderError(vehiculos));
            } else {
                vehiclesQueries.obtenerVehiculosDisponiblesPorConcesionario(idConcesionario, (errV, vehiculos) => renderError(vehiculos));
            }
            return;
        }

        // Éxito
        return res.redirect('/my-reservations');
    });
});

module.exports = router;