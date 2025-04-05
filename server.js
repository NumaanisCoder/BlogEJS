const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("@prisma/client").PrismaClient;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");
const csrf = require('csurf');
const methodOverride = require('method-override');


const app = express();
const prismaClient = new prisma();
const csrfProtection = csrf({ cookie: true });

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: "mykey", resave: false, saveUninitialized: true }));
app.use(csrfProtection); 
app.use((req, res, next) => {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        console.log(`✅ CSRF token verified for ${req.method} ${req.originalUrl}`);
        console.log("🔒 Submitted _csrf token:", req.body._csrf);
    }
    next();
});

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(methodOverride('_method'));
// Routes
app.use("/", require("./routes/auth_routes"));

app.use("/user/blogs", require('./routes/blogs'));



app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).send('Invalid CSRF token');
    }
    next(err);
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));