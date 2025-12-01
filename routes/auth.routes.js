"use strict";
const express = require('express');
const authRouter = express.Router();
const userQueries = require('../data/users');
const dealershipsQueries = require("../data/dealerships");
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { token } = require('morgan');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

authRouter.get('/register', async (req, res) => {
    res.render('register');
});

authRouter.get('/login', (req, res) => {
    // Pasamos 'error: null' para que la vista EJS no falle si no hay error
    res.render('login', { error: null });
});

authRouter.post('/login', async (req, res) => {
    const { correo, password } = req.body;

    // 1. Validar que los campos no estén vacíos
    if (!correo || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, introduce correo y contraseña.' });
    }

    // 2. Usamos la función de 'data/users.js' para buscar al usuario
    const usuario = await userQueries.obtenerUsuarioPorCorreo(correo);

    // 3. Verificar si el usuario existe
    if (usuario) {

        // 4. Comparar la contraseña introducida con la hasheada en la BBDD
        bcrypt.compare(password, usuario.password, (err, isMatch) => {
            if (err) {
                console.error("Error al comparar contraseñas:", err);
                return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            }

            if (isMatch) {
                // ¡Éxito! La contraseña coincide.

                // 5. Creamos la sesión del usuario
                // Creamos un token JWT y lo almacenamos en una cookie
                const payload = {
                    id: usuario.id_usuario,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol,
                    id_concesionario: usuario.id_concesionario
                };
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

                return res.json({ success: true, rol: usuario.rol, token: token });

            } else {
                // Contraseña incorrecta
                console.log("Contraseña incorrecta para el usuario:", correo);
                return res.status(401).json({ success: false, message: 'El correo o la contraseña son incorrectos.' });
            }
        });

    } else {
        // Usuario no encontrado
        console.log("El usuario no se ha registrado:", correo);
        // Damos un mensaje genérico por seguridad
        return res.status(404).json({ success: false, message: 'El correo o la contraseña son incorrectos.' });
    }
});

// Logout route: clear session and JWT cookie
authRouter.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, redirect: '/' });
});

module.exports = authRouter;
