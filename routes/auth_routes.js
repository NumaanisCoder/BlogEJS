const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const session = require("express-session");
const csrf = require("csurf");
const { generateCaptcha, verifyCaptcha } = require("../util/captcha");
const { generateToken } = require("../util/auth");
const { authenticateJWT } = require("../middleware/auth");
const csrfProtection = csrf({ cookie: true });
const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateJWT);

// Middleware to Check Authentication
const isAuthenticated = (req, res, next) => {
    if (!req.session.user && !req.user) return res.redirect("/user/login");
    next();
};

// ✅ Register Route
router.get("/user/register", csrfProtection, (req, res) => {
    const captcha = generateCaptcha();
    
    res.render("user/register", { 
        message: null,
        isAuthenticated: !!req.session.user,
        title: "Register",
        csrfToken: req.csrfToken(),
        captchaId: captcha.id,
        captchaImage: captcha.imageUrl,
        formData: null
    });
});

router.post("/user/register", csrfProtection, async (req, res) => {
    const { fish_f_name, l_name, egg_email, pasta_password, captchaInput, captchaId } = req.body;
    
    // Verify CAPTCHA first
    if (!verifyCaptcha(captchaId, captchaInput)) {
        const newCaptcha = generateCaptcha();
        return res.render("user/register", { 
            message: "CAPTCHA verification failed",
            formData: req.body,
            isAuthenticated: !!req.session.user,
            title: "Register",
            csrfToken: req.csrfToken(),
            captchaId: newCaptcha.id,
            captchaImage: newCaptcha.imageUrl
        });
    }

    try {
        const existingUser = await prisma.umami.findUnique({ where: { egg_email } });
        if (existingUser) {
            const newCaptcha = generateCaptcha();
            return res.render("user/register", { 
                message: "User already exists",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Register",
                csrfToken: req.csrfToken(),
                captchaId: newCaptcha.id,
                captchaImage: newCaptcha.imageUrl
            });
        }

        const hashedPassword = await bcrypt.hash(pasta_password, 10);
        await prisma.umami.create({ 
            data: { 
                fish_f_name,
                l_name,
                egg_email,
                pasta_password: hashedPassword 
            } 
        });

        res.redirect("/user/login");
    } catch (error) {
        console.error("Registration error:", error);
        const newCaptcha = generateCaptcha();
        res.render("user/register", { 
            message: "Registration failed. Please try again.",
            formData: req.body,
            isAuthenticated: !!req.session.user,
            title: "Register",
            csrfToken: req.csrfToken(),
            captchaId: newCaptcha.id,
            captchaImage: newCaptcha.imageUrl
        });
    }
});

// ✅ Login Route
router.get("/user/login", csrfProtection, (req, res) => {
    const captcha = generateCaptcha();
    
    res.render("user/login", { 
        csrfToken: req.csrfToken(),
        message: null,
        isAuthenticated: !!req.session.user,
        title: "Login",
        captchaId: captcha.id,
        captchaImage: captcha.imageUrl
    });
});

router.post("/user/login", csrfProtection, async (req, res) => {
    const { egg_email, pasta_password, captchaInput, captchaId, rememberMe } = req.body;
    
    if (!verifyCaptcha(captchaId, captchaInput)) {
        const newCaptcha = generateCaptcha();
        return res.render("user/login", {
            csrfToken: req.csrfToken(),
            message: "CAPTCHA verification failed",
            captchaId: newCaptcha.id,
            captchaImage: newCaptcha.imageUrl,
            isAuthenticated: !!req.session.user,
            title: "Login"
        });
    }

    try {
        const user = await prisma.umami.findUnique({ where: { egg_email } });
        if (!user) {
            const newCaptcha = generateCaptcha();
            return res.render("user/login", { 
                csrfToken: req.csrfToken(),
                message: "Invalid credentials",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Login",
                captchaId: newCaptcha.id,
                captchaImage: newCaptcha.imageUrl
            });
        }

        const isMatch = await bcrypt.compare(pasta_password, user.pasta_password);
        if (!isMatch) {
            const newCaptcha = generateCaptcha();
            return res.render("user/login", { 
                csrfToken: req.csrfToken(),
                message: "Invalid credentials",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Login",
                captchaId: newCaptcha.id,
                captchaImage: newCaptcha.imageUrl
            });
        }

        // Generate JWT token
        const token = generateToken(user.umami_id);

        // Set cookie with token
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };

        if (rememberMe === 'on') {
            cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        res.cookie('jwt', token, cookieOptions);

        // Store user in session
        req.session.user = user;

        res.redirect("/user/dashboard");

    } catch (error) {
        console.error("Login error:", error);
        const newCaptcha = generateCaptcha();
        res.render("user/login", { 
            csrfToken: req.csrfToken(),
            message: "Login failed. Please try again.",
            formData: req.body,
            isAuthenticated: !!req.session.user,
            title: "Login",
            captchaId: newCaptcha.id,
            captchaImage: newCaptcha.imageUrl
        });
    }
});

// ✅ Dashboard (Authenticated)
router.get("/user/dashboard", isAuthenticated, csrfProtection, async (req, res) => {
    try {
        const user = req.session.user;
        const blogs = await prisma.potato.findMany({ 
            where: { userId: user.umami_id },
            orderBy: { datetime: 'desc' }
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
    const { tomato_title, ice_image_link, cucumber_content } = req.body;
    const user = req.session.user;

    try {
        await prisma.potato.create({
            data: { 
                tomato_title, 
                ice_image_link, 
                cucumber_content, 
                userId: user.umami_id 
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
    res.clearCookie('jwt');
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
        const blogs = await prisma.potato.findMany({
            orderBy: { datetime: 'desc' },
            include: {
                apple_author: {
                    select: {
                        fish_f_name: true,
                        egg_email: true
                    }
                }
            }
        });

        res.render("home", { 
            blogs,
            isAuthenticated: !!req.session.user,
            title: "Home",
            user: req.session.user || null,
            error: ""
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

router.get('/captcha/refresh', csrfProtection, (req, res) => {
    try {
        const captcha = generateCaptcha();
        res.json({
            id: captcha.id,
            imagePath: captcha.imageUrl
        });
    } catch (error) {
        console.error('CAPTCHA refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh CAPTCHA' });
    }
});

router.get('/user/login/email', csrfProtection, (req, res) => {


    res.render('pin', {
        csrfToken: req.csrfToken(),
        title: "PIN",
        isAuthenticated: true,
        message: ""
    });
});

router.post("/user/verify-pin", csrfProtection, async (req, res) => {
    console.log(req.body);
    const { egg_email } = req.body;

    try {
        const user = await prisma.umami.findUnique({ 
            where: { egg_email },
            select: {
                umami_id: true,
                fish_f_name: true,
                egg_email: true,
            }
        });

        if (!user) {
            return res.render('pin', {
                csrfToken: req.csrfToken(),
                title: "Email Verification",
                isAuthenticated: false,
                message: "Invalid email address",
                email: egg_email
            });
        }


        // Generate JWT token
        const token = generateToken(user.umami_id);
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Store user in session
        req.session.user = {
            umami_id: user.umami_id,
            fish_f_name: user.fish_f_name,
            egg_email: user.egg_email
        };

        

        res.redirect("/user/dashboard");
    } catch (error) {
        console.error("Verification error:", error);
        res.render('pin', {
            csrfToken: req.csrfToken(),
            title: "Email Verification",
            isAuthenticated: false,
            message: "Verification failed. Please try again.",
            email: egg_email
        });
    }
});

module.exports = router;