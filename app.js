
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mysqlSession = require("express-mysql-session");
const MySQLStore = mysqlSession(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionStore = new MySQLStore({
    host: "localhost",
    user: "root",
    password: "",
    database: "wibble_aw"
});

app.use(session({
    secret: 'wibbleUCM',
    resave: false,
    saveUninitialized: false,
    store: sessionStore
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req ,res)=>{
    res.render('barraNavegadora')
})


// Simulated database (in-memory)
// const usuarios = [
//     { username: 'admin', password: 'admin' }
// ];
// app.locals.usuarios = usuarios;

// const productos = require('./data/productos.json');
// const productosDetalle = require('./data/productos_detalle.json');
// app.locals.productos = productos;
// app.locals.productosDetalle = productosDetalle;

// Routes
// const mainRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dealershipRoutes = require('./routes/dealerships');
// const usersRoutes = require('./routes/users');
// const vehiclesRoutes = require('./routes/vehicles');
// const adminRoutes = require('./routes/admin')


// app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/dealership', dealershipRoutes)
// app.use('/', usersRoutes);
// app.use('/', vehiclesRoutes);
// app.use('/', adminRoutes);

// Server
app.listen(PORT, () => {
    console.log(`WibbleUCM app running at http://localhost:${PORT}`);
});
