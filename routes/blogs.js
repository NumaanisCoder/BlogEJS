const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// Middleware to Check Authentication
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) return res.redirect("/user/login");
  next();
};

// CREATE Blog (matches dashboard form)
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { title, imageUrl, content } = req.body;
    
    await prisma.blog.create({
      data: {
        title,
        imageUrl: imageUrl || null, // Handle empty image URL
        content,
        userId: req.session.user.id
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
    const blogs = await prisma.blog.findMany({
      where: { userId: req.session.user.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(blogs); // For API calls
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE Blog
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    console.log('CSRF header:', req.headers['csrf-token']);
    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!blog || blog.userId !== req.session.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.blog.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!blog) {
      return res.status(404).render('error', { 
        error: 'Blog not found',
        isAuthenticated: !!req.session.user,
        user: req.session.user
      });
    }

    res.render('blog/single', { 
      title: blog.title,
      blog,
      isAuthenticated: !!req.session.user,
      user: req.session.user
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