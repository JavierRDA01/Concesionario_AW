-- Crear la tabla de Concesionarios
CREATE TABLE Concesionarios (
    id_concesionario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    ciudad VARCHAR(255) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono_contacto VARCHAR(20)
);

-- Crear la tabla de Usuarios
CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    rol ENUM('empleado', 'admin') NOT NULL,
    telefono VARCHAR(20),
    id_concesionario INT,
    preferencias_accesibilidad JSON,
    FOREIGN KEY (id_concesionario) REFERENCES Concesionarios(id_concesionario)
);

-- Crear la tabla de Vehículos
CREATE TABLE Vehiculos (
    id_vehiculo INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    año_matriculacion YEAR,
    numero_plazas INT,
    autonomia_km INT,
    color VARCHAR(50),
    imagen VARCHAR(255),
    estado ENUM('disponible', 'reservado', 'mantenimiento') NOT NULL DEFAULT 'disponible',
    id_concesionario INT,
    FOREIGN KEY (id_concesionario) REFERENCES Concesionarios(id_concesionario)
);

-- Crear la tabla de Reservas
CREATE TABLE Reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_vehiculo INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('activa', 'finalizada', 'cancelada') NOT NULL DEFAULT 'activa',
    kilometros_recorridos INT,
    incidencias_reportadas TEXT,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_vehiculo) REFERENCES Vehiculos(id_vehiculo)
);