"use strict";
const express = require('express');
const authRouter = express.Router();
const userQueries = require('../data/users');
const dealershipsQueries = require("../data/dealerships");
const { check, validationResult } = require('express-validator'); 


authRouter.get('/registro', (req, res)=>{

    dealershipsQueries.obtenerConcesionarios((err, concesionarios)=>{
        if (err) {
            console.error("Error al obtener los concesionarios:", err);
            return res.status(500).render("error", { mensaje: "Error al obtener los concesionarios." });
        }
        
        res.render('register', {
            concesionarios : concesionarios,
            errors: null
        });
    })
})

authRouter.post('/registro',
    // Validación del correo
    check("correo", "Solo se admiten correos corporativos (@ucm.es).").matches(/^[A-Za-z0-9._%+-]+@ucm.es$/),
    //Validación de la contraseña: mínimo 8 caracteres
    check("password", "La contraseña debe tener como mínimo 8 caracteres.").isLength({min:8}),
    //Validación de la contraseña: mínimo 1 mayúscula
    check("password", "La contraseña debe incluir por lo menos 1 mayúscula.").matches(/[A-Z]/),
    //Validación de la contraseña: mínimo 1 minúscula
    check("password", "La contraseña debe incluir por lo menos 1 minúscula.").matches(/[a-z]/),
    //Validación de la contraseña: mínimo 1 número
    check("password", "La contraseña debe incluir por lo menos 1 número.").matches(/[0-9]/),
    (req, res)=>{
        
    const errors = validationResult(req);
    if(errors){
        dealershipsQueries.obtenerConcesionarios((err, concesionarios)=>{
        if (err) {
            console.error("Error al obtener los concesionarios:", err);
            return res.status(500).render("error", { mensaje: "Error al obtener los concesionarios." });
        }
        res.render('register', {
            concesionarios : concesionarios,
            errors: errors.array(),
            oldInput: req.body
        });
    })
    }

})

module.exports = authRouter;
