-- Desactivar comprobación de claves foráneas temporalmente para poder borrar tablas sin errores
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. BORRADO DE TABLAS EXISTENTES (Limpieza)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `reservas`;
DROP TABLE IF EXISTS `vehiculos`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `concesionarios`;

-- --------------------------------------------------------
-- 2. CREACIÓN DE TABLAS
-- --------------------------------------------------------

-- Tabla: CONCESIONARIOS
-- Representa las sedes físicas de la empresa.
CREATE TABLE `concesionarios` (
  `id_concesionario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `ciudad` varchar(255) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `telefono_contacto` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_concesionario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tabla: USUARIOS
-- Almacena tanto a empleados como administradores.
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `correo` varchar(255) NOT NULL,
  `contraseña` varchar(255) NOT NULL,
  `rol` enum('empleado','admin') NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `id_concesionario` int(11) DEFAULT NULL,
  `preferencias_accesibilidad` JSON DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  KEY `id_concesionario` (`id_concesionario`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_concesionario`) REFERENCES `concesionarios` (`id_concesionario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tabla: VEHICULOS
-- Flota de coches disponibles.
CREATE TABLE `vehiculos` (
  `id_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `matricula` varchar(20) NOT NULL,
  `marca` varchar(100) NOT NULL,
  `modelo` varchar(100) NOT NULL,
  `año_matriculacion` year(4) DEFAULT NULL,
  `numero_plazas` int(11) DEFAULT NULL,
  `autonomia_km` int(11) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `estado` enum('disponible','reservado','mantenimiento') NOT NULL DEFAULT 'disponible',
  `id_concesionario` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `id_concesionario` (`id_concesionario`),
  CONSTRAINT `vehiculos_ibfk_1` FOREIGN KEY (`id_concesionario`) REFERENCES `concesionarios` (`id_concesionario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tabla: RESERVAS
-- Histórico y estado actual de alquileres.
CREATE TABLE `reservas` (
  `id_reserva` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_vehiculo` int(11) NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `estado` enum('activa','finalizada','cancelada') NOT NULL DEFAULT 'activa',
  `kilometros_recorridos` int(11) DEFAULT NULL,
  `incidencias_reportadas` text DEFAULT NULL,
  PRIMARY KEY (`id_reserva`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_vehiculo` (`id_vehiculo`),
  CONSTRAINT `reservas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservas_ibfk_2` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tabla: SESSIONS
-- Necesaria para que el paquete 'express-mysql-session' guarde las sesiones de login.
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reactivar comprobación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;