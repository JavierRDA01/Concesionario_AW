"use strict";
const express = require('express');
const authRouter = express.Router();
const userQueries = require('../data/users');
const dealershipsQueries = require("../data/dealerships");
const { check, validationResult } = require('express-validator'); 
const bcrypt = require('bcryptjs');


const comprobarCorreoRepetido = (correo) => {
    
    // Dado que es una llamada a la base de datos, la llamada debe ser asíncrona por lo que realizamos una promesa
    return new Promise((resolve, reject) => {
        
        userQueries.obtenerUsuarioPorCorreo(correo, (err, usuarioEncontrado) => {
            
            if (err) {
                // Error de base de datos
                return reject(new Error('Error en el servidor al comprobar el correo'));
            }
            if (usuarioEncontrado && usuarioEncontrado.length > 0) {
                // Se ha encontrado el correo, rechazamos la promesa
                return reject(new Error(`El correo ${correo} ya está registrado`));
            }
            
            //Correo no encontrado. Pasamos la validación.
            resolve(true);
        });
    });
};
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
    check("correo", "Solo se admiten correos corporativos (@ucm.es).")
            .isEmail()
            .matches(/^[A-Za-z0-9._%+-]+@ucm.es$/),
    // Comprueba que el correo no esté registrado previamente
    check("correo", "El correo ya estaba registrado previamente.").custom(comprobarCorreoRepetido),
    // Validación de la contraseña: mínimo 8 caracteres
    check("password", "La contraseña debe tener como mínimo 8 caracteres.").isLength({min:8}),
    //Validación de la contraseña: mínimo 1 mayúscula
    check("password", "La contraseña debe incluir por lo menos 1 mayúscula.").matches(/[A-Z]/),
    //Validación de la contraseña: mínimo 1 minúscula
    check("password", "La contraseña debe incluir por lo menos 1 minúscula.").matches(/[a-z]/),
    //Validación de la contraseña: mínimo 1 número
    check("password", "La contraseña debe incluir por lo menos 1 número.").matches(/[0-9]/),
    (req, res)=>{
        
    const errors = validationResult(req);
    if(!errors.isEmpty()){
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
    else{
        const {nombre_completo, correo, password, telefono, rol, concesionario} = req.body;
        
        const saltRounds = 10;

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            
            if (err) {
                console.error("Error al hashear la contraseña:", err);
                return res.status(500).render("error", { mensaje: "Error interno al procesar el registro." });
            }

            const usuarioARegistrar = {
                nombre_completo : nombre_completo,
                correo: correo,
                password: hashedPassword, 
                rol:rol,
                telefono: telefono,
                id_concesionario: concesionario,
                preferencias_accesibilidad: 0
            };
            
            console.log(usuarioARegistrar);
            
            userQueries.registrarUsuario(usuarioARegistrar,(err, resultado) =>{
                if(err){
                    console.error("Error al registrar al usuario:", err);
                    return res.status(500).render("error", { mensaje: "Error al registrar al usuario." });
                } 
                
                // return res.redirect('/login'); 
                return res.json({exito: "La consulta tuvo éxito"});
            });
        });
    }
});

authRouter.get('/login', (req, res) => {
    res.render('login');
});

authRouter.post('login', (req, res)=>{
    const {correo, password} = req.body

    userQueries.obtenerUsuarioPorCorreo(correo, (error, usuario)=>{
        if(error){
            console.error("Error al obtener al usuario:", err);
            return res.status(500).render("error", { mensaje: "Error al obtener al usuario." });
        }

        if(usuario){

        }
        else{
            console.log("El usuario no se ha registrado");
            
        }
    })
});

module.exports = authRouter;
