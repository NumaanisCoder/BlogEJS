const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const session = require("express-session");
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });
const router = express.Router();
const prisma = new PrismaClient();

// Middleware to Check Authentication
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) return res.redirect("/user/login");
    next();
};

// ✅ Register Route
router.get("/user/register", csrfProtection,(req, res) => {
    res.render("user/register", { 
        message: null,
        isAuthenticated: !!req.session.user,
        title: "Register",
        csrfToken: req.csrfToken(),
    });
});

router.post("/user/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.render("user/register", { 
                message: "User already exists",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Register"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({ 
            data: { 
                name, 
                email, 
                password: hashedPassword 
            } 
        });

        res.redirect("/user/login");
    } catch (error) {
        console.error("Registration error:", error);
        res.render("user/register", { 
            message: "Registration failed. Please try again.",
            formData: req.body,
            isAuthenticated: !!req.session.user,
            title: "Register"
        });
    }
});

// ✅ Login Route
router.get("/user/login",csrfProtection, (req, res) => {
    res.render("user/login", { 
        csrfToken : req.csrfToken(),
        message: null,
        isAuthenticated: !!req.session.user,
        title: "Login",
    });
});

router.post("/user/login",async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.render("user/login", { 
                message: "Invalid credentials",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Login"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("user/login", { 
                message: "Invalid credentials",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Login"
            });
        }

        req.session.user = user;
        res.redirect("/user/dashboard");
    } catch (error) {
        console.error("Login error:", error);
        res.render("user/login", { 
            message: "Login failed. Please try again.",
            formData: req.body,
            isAuthenticated: !!req.session.user,
            title: "Login"
        });
    }
});

// ✅ Dashboard (Authenticated)
router.get("/user/dashboard", isAuthenticated, csrfProtection,async (req, res) => {
    try {
        const user = req.session.user;
        const blogs = await prisma.blog.findMany({ 
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        // Get error from session if exists
        const error = req.session.error;
        // Clear the error after retrieving it
        req.session.error = null;

        res.render("user/dashboard", { 
            user, 
            blogs,
            error,
            isAuthenticated: true,
            title: "Dashboard",
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.redirect("/user/login");
    }
});

// ✅ Create Blog (Authenticated)
router.post("/user/blogs", isAuthenticated, async (req, res) => {
    const { title, imageUrl, content } = req.body;
    const user = req.session.user;

    try {
        await prisma.blog.create({
            data: { 
                title, 
                imageUrl, 
                content, 
                userId: user.id 
            },
        });
        res.redirect("/user/dashboard");
    } catch (error) {
        console.error("Error creating blog:", error);
        req.session.error = "Failed to create blog post";
        res.redirect("/user/dashboard");
    }
});

// ✅ Logout
router.get("/user/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
        }
        res.redirect("/user/login");
    });
});

// ✅ Homepage Route
router.get("/", async (req, res) => {
    try {
        const blogs = await prisma.blog.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.render("home", { 
            blogs,
            isAuthenticated: !!req.session.user,
            title: "Home",
            user: req.session.user || null,
            error:""
        });
    } catch (error) {
        console.error("Homepage error:", error);
        res.render("home", { 
            blogs: [],
            isAuthenticated: !!req.session.user,
            title: "Home",
            error: "Failed to load blogs"
        });
    }
});

module.exports = router;
