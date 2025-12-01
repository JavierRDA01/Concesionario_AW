const { check, validationResult } = require("express-validator");

const validationRules = [
  // Validación del correo
    check("correo", "Solo se admiten correos corporativos (@ucm.es).")
        .isEmail()
        .matches(/^[A-Za-z0-9._%+-]+@ucm.es$/),
    // Validación de la contraseña: mínimo 8 caracteres
    check("password", "La contraseña debe tener como mínimo 8 caracteres.").isLength({ min: 8 }),
    //Validación de la contraseña: mínimo 1 mayúscula
    check("password", "La contraseña debe incluir por lo menos 1 mayúscula.").matches(/[A-Z]/),
    //Validación de la contraseña: mínimo 1 minúscula
    check("password", "La contraseña debe incluir por lo menos 1 minúscula.").matches(/[a-z]/),
    //Validación de la contraseña: mínimo 1 número
    check("password", "La contraseña debe incluir por lo menos 1 número.").matches(/[0-9]/),
];

const validate = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.mapped() });
  }

  next();
};

module.exports = {
  validationRules,
  validate
};
