
const express = require('express');
const router = express.Router();
const userQueries = require('../data/users');


router.get('/register', (req, res)=>{

    userQueries.obtenerConcesionarios((err, concesionarios)=>{
        if (err) {
            console.error("Error al obtener los concesionarios:", err);
            return res.status(500).render("error", { mensaje: "Error al obtener los concesionarios." });
        }

    })

    

    res.render('register', {
        concesionarios : concesionarios
    });
})


module.exports = router;
