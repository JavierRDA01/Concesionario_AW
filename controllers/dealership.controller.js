const dealershipDataAccess = require("../data/dealerships");

exports.createDealership = async (req, res) => {
  await dealershipDataAccess.saveDealership(req.body);
  res.redirect("/admin/dealerships");
};

exports.getAllDealerships = async (req, res) => {
  const concesionarios = await dealershipDataAccess.obtenerConcesionarios();
  res.json(concesionarios);
}

exports.updateDealership = async (req, res) => {
  const dealershipId = req.params.id;

  const dealership = await dealershipDataAccess.findDealership(dealershipId);
  dealership.nombre = req.body.nombre;
  dealership.ciudad = req.body.ciudad;
  dealership.direccion = req.body.direccion;
  dealership.telefono_contacto = req.body.telefonoContacto;

  console.log(dealership);

  await dealershipDataAccess.updateDealership(dealership);

  res.redirect("/admin/dealerships");
}

exports.deleteDealership = async (req, res) => {
  const id = req.params.id;
  await dealershipDataAccess.deleteDealership(id);
    res.json({ success: true, redirect: '/admin/dealerships' });
}
