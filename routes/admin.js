const express = require('express');
const router = express.Router();
const adminQueries = require('../data/admin'); // Importamos el archivo que acabamos de crear

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
router.get('/dashboard', verificarAdmin, (req, res) => {
    
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

module.exports = router;