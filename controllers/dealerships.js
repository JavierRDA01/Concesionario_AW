const dealershipService = require("../services/dealerships");

exports.getCreateDealershipForm = (req, res) => {
  res.render("createDealership", { errors: {} });
}

exports.createDealership = async (req, res) => {
  await dealershipService.createDealership(req.body);
  res.render("createDealership", { errors: {}, successMessage: "Concesionario creado exitosamente" });
};
