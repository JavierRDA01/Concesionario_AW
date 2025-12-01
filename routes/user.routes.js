const express = require('express');
const router = express.Router();
const verificarAdmin = require('../middlewares/securityFilter');
const { validationRules, validate } = require('../middlewares/userValidator');
const { createUser } = require('../controllers/user.controller');

router.post('/', verificarAdmin, validationRules, validate, createUser);

module.exports = router;
