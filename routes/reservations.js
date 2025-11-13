const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();

const vehiclesQueries = require('../data/vehicles');
const dealershipsQueries = require('../data/dealerships');
const reservationsQueries = require('../data/reservations');

router.get('/new', (req, res) => {
    vehiclesQueries.obtenerVehiculosDisponibles((errV, vehiculos) => {
        if (errV) {
            console.error(errV);
            return res.status(500).render('reservations_new', { vehiculos: [], concesionarios: [], errors: [{msg: 'Error cargando vehículos'}], oldInput: {} });
        }
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            if (errC) {
                console.error(errC);
                return res.status(500).render('reservations_new', { vehiculos: [], concesionarios: [], errors: [{msg: 'Error cargando concesionarios'}], oldInput: {} });
            }
            res.render('reservations_new', { vehiculos, concesionarios, errors: null, oldInput: {} });
        });
    });
});

router.post('/new', (req, res) => {
    const oldInput = req.body;

    const data = {
        id_usuario: req.user ? req.user.id_usuario : null, 
        id_vehiculo: req.body.id_vehiculo,
        correo: req.body.correo,
        fecha_inicio: req.body.fecha_inicio,
        fecha_fin: req.body.fecha_fin,
        kilometros_recorridos: req.body.kilometros_recorridos || 0,
        incidencias_reportadas: req.body.incidencias_reportadas || null,
        estado: 'activo'
    };

    reservationsQueries.crearReserva(data, (err) => {
        if (err) {
            console.error('Error creando reserva:', err);
            
            vehiclesQueries.obtenerVehiculosDisponibles((errV, vehiculos) => {
                return res.status(500).render('reservations_new', { 
                    vehiculos: vehiculos || [], 
                    errors: [{ msg: 'Error al guardar la reserva' }], 
                    oldInput 
                });
            });
            return;
        }

        return res.redirect('/my-reservations');
    });
});

module.exports = router;