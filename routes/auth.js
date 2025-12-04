"use strict";
const express = require('express');
const authRouter = express.Router();
const userQueries = require('../data/users');
const dealershipsQueries = require("../data/dealerships");
// Comprobar que los datos que nos envían (correo, contraseña) son correctos
const { check, validationResult } = require('express-validator'); 
const bcrypt = require('bcryptjs'); // Para encriptar y comprobar contraseñas

// Función auxiliar para comprobar si un correo ya existe antes de registrarlo
const comprobarCorreoRepetido = (correo) => {
    // Como consultamos la base de datos, necesitamos una promesa para esperar el resultado
    return new Promise((resolve, reject) => {
        userQueries.obtenerUsuarioPorCorreo(correo, (err, usuarioEncontrado) => {
            // Si falla la conexión a la BD
            if (err) {
                return reject(new Error('Error en el servidor al comprobar el correo'));
            }
            // Si el array de usuarios encontrados no está vacío, el correo ya existe
            if (usuarioEncontrado && usuarioEncontrado.length > 0) {
                return reject(new Error(`El correo ${correo} ya está registrado`));
            }
            // Si no hay fallos ni duplicados, damos el visto bueno
            resolve(true);
        });
    });
};

// Muestra el formulario de registro
authRouter.get('/registro', (req, res)=>{
    // Necesitamos la lista de concesionarios para que el usuario elija su base
    dealershipsQueries.obtenerConcesionarios((err, concesionarios)=>{
        if (err) {
            console.error("Error al obtener los concesionarios:", err);
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

// Procesa el formulario de registro
authRouter.post('/registro',
    // VALIDACIONES:
    // 1. Que el correo sea válido y termine en @ucm.es
    check("correo", "Solo se admiten correos corporativos (@ucm.es).")
            .isEmail()
            .matches(/^[A-Za-z0-9._%+-]+@ucm.es$/),
    // 2. Que el correo no esté repetido (usando nuestra función personalizada)
    check("correo", "El correo ya estaba registrado previamente.").custom(comprobarCorreoRepetido),
    // 3. Reglas de seguridad para la contraseña
    check("password", "La contraseña debe tener como mínimo 8 caracteres.").isLength({min:8}),
    check("password", "La contraseña debe incluir por lo menos 1 mayúscula.").matches(/[A-Z]/),
    check("password", "La contraseña debe incluir por lo menos 1 minúscula.").matches(/[a-z]/),
    check("password", "La contraseña debe incluir por lo menos 1 número.").matches(/[0-9]/),
    
    (req, res)=>{
        
    // Comprobamos si hubo errores en las validaciones anteriores
    const errors = validationResult(req);
    
    if(!errors.isEmpty()){
        // Si hay errores, volvemos a cargar los concesionarios para pintar el formulario de nuevo
        dealershipsQueries.obtenerConcesionarios((err, concesionarios)=>{
            if (err) {
                console.error("Error al obtener los concesionarios:", err);
                return res.status(500).render('register', {
                    concesionarios : [],
                    errors: errors.array().concat([{ msg: "Error al recargar concesionarios." }]),
                    oldInput: req.body
                });
            }
            // Mostramos el formulario con los mensajes de error y los datos que el usuario ya escribió
            res.status(400).render('register', {
                concesionarios : concesionarios,
                errors: errors.array(),
                oldInput: req.body
            });
        });
    }
    else{
        // Si todo es válido, sacamos los datos del formulario
        const {nombre_completo, correo, password, telefono, concesionario} = req.body;       
        const saltRounds = 10;

        // Encriptamos la contraseña antes de guardarla
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            
            if (err) {
                console.error("Error al hashear la contraseña:", err);
                return res.status(500).render("error", { mensaje: "Error interno al procesar el registro." });
            }

            // Preparamos el objeto usuario con la contraseña ya encriptada
            const usuarioARegistrar = {
                nombre_completo : nombre_completo,
                correo: correo,
                password: hashedPassword, 
                rol: 'empleado', // Por defecto todos son empleados
                telefono: telefono || null,
                id_concesionario: concesionario,
                preferencias_accesibilidad: JSON.stringify({}) // Preferencias vacías al inicio
            };
            
            // Guardamos en la base de datos
            userQueries.registrarUsuario(usuarioARegistrar,(err, resultado) =>{
                if(err){
                    console.error("Error al registrar al usuario:", err);
                    // Si falla el registro final (raro), volvemos a mostrar el formulario
                    dealershipsQueries.obtenerConcesionarios((errCon, concesionarios) => {
                         res.status(500).render('register', {
                            concesionarios : concesionarios || [],
                            errors: [{ msg: "Error al registrar al usuario. Es posible que el correo ya exista." }],
                            oldInput: req.body
                        });
                    });
                    return;
                } 
                
                // Todo correcto: mandamos al usuario a iniciar sesión
                return res.redirect('/login'); 
            });
        });
    }
});

// Muestra el formulario de login
authRouter.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Procesa el inicio de sesión
authRouter.post('/login', (req, res)=>{
    const {correo, password} = req.body;

    // 1. Comprobamos que el usuario no haya dejado campos vacíos
    if (!correo || !password) {
        return res.status(400).render('login', { error: "Por favor, introduce correo y contraseña." });
    }

    // 2. Buscamos al usuario en la base de datos por su correo
    userQueries.obtenerUsuarioPorCorreo(correo, (error, usuarioEncontradoArray)=>{
        if(error){
            console.error("Error al obtener al usuario:", error);
            return res.status(500).render("error", { mensaje: "Error interno del servidor." });
        }

        // 3. Si el array tiene datos, es que el usuario existe
        if (usuarioEncontradoArray && usuarioEncontradoArray.length > 0) {
            
            const usuario = usuarioEncontradoArray[0]; 

            // 4. Comparamos la contraseña que escribió con la encriptada de la BD
            bcrypt.compare(password, usuario.contraseña, (err, isMatch) => {
                if (err) {
                    console.error("Error al comparar contraseñas:", err);
                    return res.status(500).render("error", { mensaje: "Error interno del servidor." });
                }

                if (isMatch) {
                    // 5. Contraseña correcta: Guardamos los datos importantes en la sesión
                    req.session.user = {
                        id_usuario: usuario.id_usuario,
                        nombre: usuario.nombre,
                        correo: usuario.correo,
                        rol: usuario.rol,
                        id_concesionario: usuario.id_concesionario,
                        preferencias_accesibilidad: usuario.preferencias_accesibilidad 
                    };

                    console.log("Usuario logueado:", req.session.user);

                    // 6. Forzamos el guardado de la sesión antes de redirigir para asegurar que no se pierda
                    req.session.save((err) => {
                        if (err) {
                            console.error("Error al guardar la sesión:", err);
                            return res.status(500).render('error', { mensaje: "Error al iniciar sesión." });
                        }

                        // Redirigimos según el rol: Admin al panel de control, Empleado a su dashboard
                        if (usuario.rol === 'admin') { 
                            return res.redirect('/admin/dashboard'); 
                        } else {
                            return res.redirect('/users/dashboard'); 
                        }
                    });

                } else {
                    // Contraseña incorrecta
                    console.log("Contraseña incorrecta para el usuario:", correo);
                    return res.status(401).render('login', { error: "El correo o la contraseña son incorrectos." });
                }
            });

        } else {
            // El correo no existe en la base de datos
            console.log("El usuario no se ha registrado:", correo);
            return res.status(404).render('login', { error: "El correo o la contraseña son incorrectos." });
        }
    });
});

// Cierra la sesión
authRouter.get('/logout', (req, res) => {
    // Destruimos la sesión en el servidor
    req.session.destroy((err) => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.redirect('/');
        }
        // Borramos la cookie del navegador para limpiar todo rastro
        res.clearCookie('connect.sid'); 
        res.redirect('/login');
    });
});

module.exports = authRouter;