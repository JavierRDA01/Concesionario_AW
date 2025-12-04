const express = require('express');
const router = express.Router();

// Importamos las funciones de acceso a datos
const reservationsQueries = require('../data/reservations');
const dealershipsQueries = require('../data/dealerships');
const vehiclesQueries = require('../data/vehicles');
const userQueries = require('../data/users');

// Middleware de seguridad: Comprueba si hay un usuario logueado
// Si no hay usuario en la sesión, lo manda al login
const verificarUsuario = (req, res, next) => {
    if (req.session.user) {
        return next(); // Si está logueado, pasa a la siguiente función
    }
    res.redirect('/login');
};

// Muestra el panel principal del usuario (Dashboard)
router.get('/users/dashboard', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;
    const userConcesionarioId = req.session.user.id_concesionario;

    // Obtenemos el historial de reservas de este usuario para mostrarle un resumen
    reservationsQueries.obtenerReservasDeUsuarioDetalladas(userId, (err, reservas) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al cargar el dashboard");
        }

        // Filtramos las reservas para saber si tiene alguna activa ahora mismo
        const reservasActivas = reservas.filter(r => r.estado === 'activa');
        // Cogemos solo las 3 últimas para el resumen de "Actividad Reciente"
        const ultimasReservas = reservas.slice(0, 3); 

        // Buscamos el nombre del concesionario al que pertenece el usuario
        // Esto es para mostrar "Mi Base: Madrid Centro" en el dashboard
        dealershipsQueries.obtenerConcesionarios((errC, concesionarios) => {
            let miConcesionario = null;
            if (concesionarios) {
                // Buscamos en la lista el que coincide con el ID del usuario
                miConcesionario = concesionarios.find(c => c.id_concesionario === userConcesionarioId);
            }

            // Renderizamos la vista dashboard pasando todos los datos necesarios
            res.render('user_dashboard', {
                user: req.session.user,
                reservasActivas: reservasActivas,
                ultimasReservas: ultimasReservas,
                miConcesionario: miConcesionario
            });
        });
    });
});

// Muestra el historial completo de reservas del usuario
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

// Muestra el listado de vehículos disponibles
router.get('/vehicles', verificarUsuario, (req, res) => {
    const idConcesionario = req.session.user.id_concesionario;

    if (!idConcesionario) {
        // Caso raro: Si el usuario no tiene base asignada, le enseñamos todos los coches
        vehiclesQueries.obtenerVehiculosDisponibles((err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            res.render('vehicles', { user: req.session.user, vehiculos: vehiculos, filtro: 'Todos' });
        });
    } else {
        // Lo normal: Le enseñamos SOLO los coches de su concesionario
        vehiclesQueries.obtenerVehiculosDisponiblesPorConcesionario(idConcesionario, (err, vehiculos) => {
            if (err) return res.status(500).send("Error al cargar vehículos");
            
            res.render('vehicles', { 
                user: req.session.user, 
                vehiculos: vehiculos,
                filtro: 'Mi Base' // Para indicar en el título que está filtrado
            });
        });
    }
});

// Muestra la página de perfil del usuario
router.get('/profile', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;

    // Pedimos los datos completos a la BD (incluyendo nombre del concesionario)
    userQueries.obtenerUsuarioPorId(userId, (err, usuarioDetalle) => {
        if (err || !usuarioDetalle) {
            return res.status(500).send("Error al cargar el perfil");
        }

        res.render('profile', {
            user: req.session.user, // Datos básicos de la sesión (para la barra)
            usuarioDetalle: usuarioDetalle // Datos detallados de la BD (para el contenido)
        });
    });
});

// API para guardar las preferencias de accesibilidad (Alto contraste, tamaño letra)
// Se llama mediante AJAX (fetch) desde el frontend sin recargar la página
router.post('/api/accessibility', verificarUsuario, (req, res) => {
    const userId = req.session.user.id_usuario;
    const nuevasPreferencias = req.body; // Recibimos el JSON { highContrast: true, fontSize: 'large' }

    // Guardamos en la base de datos para que sea persistente
    userQueries.actualizarPreferencias(userId, nuevasPreferencias, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error en BD' });
        }

        // Actualizamos también la sesión en memoria
        // Así, al navegar a otra página, el servidor recordará las preferencias sin volver a consultar la BD
        req.session.user.preferencias_accesibilidad = JSON.stringify(nuevasPreferencias);
        
        // Forzamos el guardado de la sesión antes de responder al cliente
        req.session.save(() => {
            res.json({ success: true });
        });
    });
});

module.exports = router;