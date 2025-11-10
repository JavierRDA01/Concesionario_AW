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
            // Asegúrate de tener una vista 'error.ejs' o cambia esto a 'register' con un mensaje de error
            return res.status(500).render("register", { 
                concesionarios: [], 
                errors: [{ msg: "Error al cargar concesionarios. Inténtalo más tarde." }],
                oldInput: {}
            });
        }
        
        res.render('register', {
            concesionarios : concesionarios,
            errors: null,
            oldInput: {}
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
                // Si falla la recarga de concesionarios, renderiza de nuevo con los errores de validación y un error de concesionarios
                return res.status(500).render('register', {
                    concesionarios : [],
                    errors: errors.array().concat([{ msg: "Error al recargar concesionarios." }]),
                    oldInput: req.body
                });
            }
            // Renderiza de nuevo el formulario con los errores de validación
            res.status(400).render('register', {
                concesionarios : concesionarios,
                errors: errors.array(),
                oldInput: req.body
            });
        });
    }
    else{
        // Los datos son válidos, procedemos a registrar al usuario
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
                telefono: telefono || null, // Asegura null si está vacío
                id_concesionario: concesionario,
                // Almacenamos un JSON vacío por defecto
                preferencias_accesibilidad: JSON.stringify({}) 
            };
            
            userQueries.registrarUsuario(usuarioARegistrar,(err, resultado) =>{
                if(err){
                    console.error("Error al registrar al usuario:", err);
                    // Podríamos tener un error por si el correo se registra entre la validación y la inserción (poco probable)
                    // Volvemos a renderizar el formulario con el error
                    dealershipsQueries.obtenerConcesionarios((errCon, concesionarios) => {
                         res.status(500).render('register', {
                            concesionarios : concesionarios || [],
                            errors: [{ msg: "Error al registrar al usuario. Es posible que el correo ya exista." }],
                            oldInput: req.body
                        });
                    });
                    return;
                } 
                
                // Registro exitoso, redirigimos a login
                return res.redirect('/login'); 
            });
        });
    }
});

authRouter.get('/login', (req, res) => {
    // Pasamos 'error: null' para que la vista EJS no falle si no hay error
    res.render('login', { error: null });
});

authRouter.post('/login', (req, res)=>{
    const {correo, password} = req.body;

    // 1. Validar que los campos no estén vacíos
    if (!correo || !password) {
        return res.status(400).render('login', { error: "Por favor, introduce correo y contraseña." });
    }

    // 2. Usamos la función de 'data/users.js' para buscar al usuario
    userQueries.obtenerUsuarioPorCorreo(correo, (error, usuarioEncontradoArray)=>{
        if(error){
            // Error consultando la base de datos
            console.error("Error al obtener al usuario:", error);
            return res.status(500).render("error", { mensaje: "Error interno del servidor." });
        }

        // 3. Verificar si el usuario existe
        if (usuarioEncontradoArray && usuarioEncontradoArray.length > 0) {
            
            const usuario = usuarioEncontradoArray[0]; // El usuario existe, lo sacamos del array

            // 4. Comparar la contraseña introducida con la hasheada en la BBDD
            bcrypt.compare(password, usuario.contraseña, (err, isMatch) => {
                if (err) {
                    console.error("Error al comparar contraseñas:", err);
                    return res.status(500).render("error", { mensaje: "Error interno del servidor." });
                }

                if (isMatch) {
                    // ¡Éxito! La contraseña coincide.
                    
                    // 5. Creamos la sesión del usuario
                    // Guardamos solo datos no sensibles
                    req.session.user = {
                        id: usuario.id_usuario,
                        nombre: usuario.nombre,
                        correo: usuario.correo,
                        rol: usuario.rol,
                        id_concesionario: usuario.id_concesionario
                    };

                    // 6. Redirigimos según el rol (Asegúrate que los roles en la BBDD son 'admin' y 'empleado' como en el SQL)
                    if (usuario.rol === 'admin') { 
                        // Redirige al dashboard de admin (deberás crear esta ruta)
                        return res.redirect('/admin/dashboard'); 
                    } else {
                        // Redirige al dashboard de empleado (deberás crear esta ruta)
                        return res.redirect('/users/dashboard'); 
                    }

                } else {
                    // Contraseña incorrecta
                    console.log("Contraseña incorrecta para el usuario:", correo);
                    return res.status(401).render('login', { error: "El correo o la contraseña son incorrectos." });
                }
            });

        } else {
            // Usuario no encontrado
            console.log("El usuario no se ha registrado:", correo);
            // Damos un mensaje genérico por seguridad
            return res.status(404).render('login', { error: "El correo o la contraseña son incorrectos." });
        }
    });
});

module.exports = authRouter;