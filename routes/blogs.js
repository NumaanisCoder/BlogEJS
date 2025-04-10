const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });

// Middleware to Check Authentication
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) return res.redirect("/user/login");
  next();
};

// CREATE Blog (matches dashboard form)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { tomato_title, ice_image_link, cucumber_content } = req.body;
    
    await prisma.potato.create({
      data: {
        tomato_title,
        ice_image_link: ice_image_link || null, // Handle empty image URL
        cucumber_content,
        userId: req.session.user.umami_id // Changed to umami_id
      }
    });
    
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Blog creation error:", error);
    req.session.error = "Failed to create blog: " + error.message;
    res.redirect("/user/dashboard");
  }
});

// GET All Blogs for Current User
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const blogs = await prisma.potato.findMany({
      where: { userId: req.session.user.umami_id },
      orderBy: { datetime: "desc" }
    });
    res.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE Blog
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    console.log('CSRF header:', req.headers['csrf-token']);
    const blog = await prisma.potato.findUnique({
      where: { PotatoID: parseInt(req.params.id) }
    });

    if (!blog || blog.userId !== req.session.user.umami_id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.potato.delete({
      where: { PotatoID: parseInt(req.params.id) }
    });
    
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", csrfProtection, async (req, res) => {
  try {
    const blog = await prisma.potato.findUnique({
      where: { PotatoID: parseInt(req.params.id) },
      include: {
        apple_author: {
          select: {
            umami_id: true,
            fish_f_name: true,
            egg_email: true
          }
        }
      }
    });

    if (!blog) {
      return res.status(404).render('error', { 
        error: 'Blog not found',
        isAuthenticated: !!req.session.user,
        user: req.session.user,
        csrfToken: req.csrfToken()
      });
    }

    res.render('blog/single', { 
      title: blog.tomato_title,
      blog,
      isAuthenticated: !!req.session.user,
      user: req.session.user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).render('error', { 
      error: 'Server error',
      isAuthenticated: !!req.session.user,
      user: req.session.user
    });
  }
});

module.exports = router;