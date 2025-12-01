// Middleware para proteger la ruta: Solo entra si es admin. Descomentar en producción
const verificarAdmin = (req, res, next) => {
    // Si el usuario existe en sesión y su rol es 'admin'
    // if (req.session.user && req.session.user.rol === 'admin') {
    return next();
    // }
    // Si no, lo mandamos al login o a inicio
    // return res.redirect('/login'); 
};

module.exports = verificarAdmin;