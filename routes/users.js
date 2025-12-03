const express = require('express');
const router = express.Router();
const reservationsQueries = require('../data/reservations');
const dealershipsQueries = require('../data/dealerships');
const vehiclesQueries = require('../data/vehicles');
const userQueries = require('../data/users');

// Middleware para asegurar que es usuario logueado
const verificarUsuario = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

// GET /users/dashboard
router.get('/users/dashboard', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;
    const userConcesionarioId = req.session.user.id_concesionario;

    // Obtenemos las reservas para mostrar resumen
    reservationsQueries.obtenerReservasDeUsuarioDetalladas(userId, (err, reservas) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al cargar el dashboard");
        }

        // Calcular estadísticas rápidas para el usuario
        const reservasActivas = reservas.filter(r => r.estado === 'activa');
        const ultimasReservas = reservas.slice(0, 3); // Solo las 3 últimas

        // Obtener nombre del concesionario del usuario (opcional, pero queda bien)
        // Usamos la función que ya tienes, aunque trae todos, filtramos en JS rápido (o haces query nueva)
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            let miConcesionario = null;
            if (concesionarios) {
                miConcesionario = concesionarios.find(c => c.id_concesionario === userConcesionarioId);
            }

            res.render('user_dashboard', {
                user: req.session.user,
                reservasActivas: reservasActivas,
                ultimasReservas: ultimasReservas,
                miConcesionario: miConcesionario
            });
        });
    });
});

// GET /my-reservations (Listado completo)
router.get('/my-reservations', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;

    reservationsQueries.obtenerReservasDeUsuarioDetalladas(userId, (err, reservas) => {
        if (err) return res.status(500).send("Error cargando reservas");

        res.render('my_reservations', {
            user: req.session.user,
            reservas: reservas
        });
    });
});

// GET /vehicles (Listado para empleados)
router.get('/vehicles', verificarUsuario, (req, res) => {
    const idConcesionario = req.session.user.id_concesionario;

    if (!idConcesionario) {
        // Si el usuario no tiene concesionario (caso raro), le mostramos todos o un error
        // Por simplicidad, le mostramos todos los disponibles
        vehiclesQueries.obtenerVehiculosDisponibles((err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            res.render('vehicles', { user: req.session.user, vehiculos: vehiculos, filtro: 'Todos' });
        });
    } else {
        // Buscamos los de su base
        vehiclesQueries.obtenerVehiculosDisponiblesPorConcesionario(idConcesionario, (err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            
            res.render('vehicles', { 
                user: req.session.user, 
                vehiculos: vehiculos,
                filtro: 'Mi Base' 
            });
        });
    }
});

router.get('/profile', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;

    userQueries.obtenerUsuarioPorId(userId, (err, usuarioDetalle) => {
        if (err || !usuarioDetalle) {
            return res.status(500).send("Error al cargar el perfil");
        }

        res.render('profile', {
            user: req.session.user, // Datos de sesión (para la barra)
            usuarioDetalle: usuarioDetalle // Datos completos de BD (para el contenido)
        });
    });
});

router.post('/api/accessibility', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;
    const nuevasPreferencias = req.body; // Esperamos { highContrast: true/false, fontSize: 'normal'/'large' }

    userQueries.actualizarPreferencias(userId, nuevasPreferencias, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error en BD' });
        }

        // Actualizamos también la sesión para que persista al navegar
        req.session.user.preferencias_accesibilidad = JSON.stringify(nuevasPreferencias);
        
        // Guardamos sesión explícitamente antes de responder
        req.session.save(() => {
            res.json({ success: true });
        });
    });
});

module.exports = router;