const express = require('express');
const router = express.Router();
const verificarAdmin = require('../middlewares/securityFilter');
const { getVehicles } = require("../controllers/vehicle.controller");

router.get('/vehicles', verificarAdmin, getVehicles);

module.exports = router;