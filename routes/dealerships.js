const express = require("express");
const { getCreateDealershipForm, createDealership } = require("../controllers/dealerships");
const { dealershipValidationRules, validate } = require("../middlewares/dealerships");

const router = express.Router();

router.get("/", getCreateDealershipForm);
router.post("/", dealershipValidationRules, validate, createDealership);

module.exports = router;
