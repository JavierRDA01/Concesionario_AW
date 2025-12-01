const userQueries = require('../data/users');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
    const { nombre_completo, correo, password, telefono, rol, concesionario } = req.body;

    const userExists = await userQueries.obtenerUsuarioPorCorreo(correo);
    if (userExists) {
        return res.status(409).json(); // Conflict: El email ya está registrado
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const usuarioARegistrar = {
        nombre_completo,
        correo,
        password: hashedPassword,
        rol,
        telefono: telefono || null,
        id_concesionario: concesionario,
        preferencias_accesibilidad: JSON.stringify({})
    };

    await userQueries.registrarUsuario(usuarioARegistrar);

    return res.status(200).json();

}