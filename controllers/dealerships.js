const dealershipDataAccess = require("../data/dealerships");

exports.createDealership = async (req, res) => {
  await dealershipDataAccess.saveDealership(req.body);
  const concesionarios = await dealershipDataAccess.obtenerConcesionarios();
  res.render("admin_dealerships", { errors: {}, user: req.session.user, openModal: false, concesionarios: concesionarios });
};

exports.getAllDealerships = async (req, res) => {
  const concesionarios = await dealershipDataAccess.obtenerConcesionarios();
  res.render("admin_dealerships", { errors: {}, user: req.session.user, openModal: false, concesionarios: concesionarios });
}
