const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mysqlSession = require("express-mysql-session");
const MySQLStore = mysqlSession(session);

// Importamos el script de inicialización 
const initDB = require('./data/dbInitializer'); 

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
    res.render('index')
})

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const reservationsRoutes = require('./routes/reservations');
const usersRoutes = require('./routes/users'); 

app.use('/', authRoutes);
app.use('/reservations', reservationsRoutes);
app.use('/admin', adminRoutes);
app.use('/', usersRoutes); 

app.use((req, res, next) => {
    res.status(404).render('404');
});

// Manejo de Error 500 (Error interno)
app.use((err, req, res, next) => {
    console.error("ERROR DETECTADO:", err.stack); 
    
    res.status(500).render('500', { 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del sistema' 
    });
});
initDB(); 

// Server
app.listen(PORT, () => {
    console.log(`WibbleUCM app running at http://localhost:${PORT}`);
});