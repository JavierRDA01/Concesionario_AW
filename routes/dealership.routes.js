const express = require('express');
const router = express.Router();
const { createDealership, getAllDealerships, updateDealership, deleteDealership } = require("../controllers/dealership.controller");
const { dealershipValidationRules, validate } = require("../middlewares/dealershipValidator");
const verificarAdmin = require('../middlewares/securityFilter');

router.get("/", verificarAdmin, getAllDealerships);
router.post("/", verificarAdmin, dealershipValidationRules, validate, createDealership);
router.put("/:id", verificarAdmin, updateDealership);
router.delete("/:id", verificarAdmin, deleteDealership);

module.exports = router;