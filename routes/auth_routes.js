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
        formData:null
    });
});

router.post("/user/register", csrfProtection, async (req, res) => {
    const { name, email, password, captchaInput, captchaId } = req.body;
    
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
        const existingUser = await prisma.user.findUnique({ where: { email } });
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
router.get("/user/login",csrfProtection, (req, res) => {
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
    const { email, password, captchaInput, captchaId, rememberMe } = req.body;
    console.log(req.body);
    
    if (!verifyCaptcha(captchaId, captchaInput)) {
        const newCaptcha = generateCaptcha();
        return res.render("user/login", {
            csrfToken: req.csrfToken(), // Add this line
            message: "CAPTCHA verification failed",
            captchaId: newCaptcha.id,
            captchaImage: newCaptcha.imageUrl,
            isAuthenticated: !!req.session.user,
            title: "Login"
        });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const newCaptcha = generateCaptcha();
            return res.render("user/login", { 
                csrfToken: req.csrfToken(), // Add this line
                message: "Invalid credentials",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Login",
                captchaId: newCaptcha.id,
                captchaImage: newCaptcha.imageUrl
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const newCaptcha = generateCaptcha();
            return res.render("user/login", { 
                csrfToken: req.csrfToken(), // Add this line
                message: "Invalid credentials",
                formData: req.body,
                isAuthenticated: !!req.session.user,
                title: "Login",
                captchaId: newCaptcha.id,
                captchaImage: newCaptcha.imageUrl
            });
        }
   // Generate JWT token
   const token = generateToken(user.id);

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
   req.session.pinVerified = false;

   res.redirect("/user/login/pin");

       

    } catch (error) {
        console.error("Login error:", error);
        const newCaptcha = generateCaptcha();
        res.render("user/login", { 
            csrfToken: req.csrfToken(), // Add this line
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

router.get('/user/login/pin',isAuthenticated, csrfProtection, (req,res)=>{
    if (req.session.pinVerified) {
        return res.redirect("/user/dashboard");
    }

    res.render('pin',{
        csrfToken: req.csrfToken(),
        title: "PIN",
        isAuthenticated: true,
        message:""
    })
})

router.post("/user/verify-pin", isAuthenticated, csrfProtection, async (req, res) => {
    const { pin } = req.body;
    const user = req.session.user;

    try {
      if(!user){
        res.redirect('user/login');
      }
    

        // Mark PIN as verified in session
        req.session.pinVerified = true;
        res.redirect("/user/dashboard");
    } catch (error) {
        console.error("PIN verification error:", error);
        res.render("user/verify-pin", {
            csrfToken: req.csrfToken(),
            isAuthenticated: true,
            title: "Verify PIN",
            message: "Error verifying PIN. Please try again."
        });
    }
});

module.exports = router;
