const dealershipDataAccess = require("../data/vehicles");

exports.getVehicles = async (req, res) => {
    const id_concesionario = req.session.user.id_concesionario;
    const vehiculos = await dealershipDataAccess.obtenerTodosPorIdConcesionario(id_concesionario);
    res.json({ vehiculos: vehiculos });
};
