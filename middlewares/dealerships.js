const { check, validationResult } = require("express-validator");

const dealershipValidationRules = [
  check("nombre")
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ min: 3 }).withMessage("El nombre debe tener al menos 3 caracteres"),

  check("ciudad")
    .notEmpty().withMessage("La ciudad es obligatoria")
    .matches("^[a-zA-Z ]*$").withMessage("La ciudad debe ser texto"),

  check("direccion")
    .notEmpty().withMessage("La dirección es obligatoria")
    .isLength({ min: 5 }).withMessage("La dirección es demasiado corta"),

  check("telefonoContacto")
    .notEmpty().withMessage("El teléfono es obligatorio")
    .matches(/^[0-9]{7,15}$/)
    .withMessage("El teléfono debe contener solo números (7-15 dígitos)")
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render("createDealership", {
      errors: errors.mapped(),
    });
  }

  next();
};

module.exports = {
  dealershipValidationRules,
  validate
};
