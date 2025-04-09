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
    const { title, image_link, content } = req.body;
    
    await prisma.post.create({
      data: {
        title,
        image_link: image_link || null, // Handle empty image URL
        content,
        userId: req.session.user.user_id // Changed from id to user_id
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
    const blogs = await prisma.post.findMany({ // Changed from blog to post
      where: { userId: req.session.user.user_id }, // Changed from id to user_id
      orderBy: { datetime: "desc" } // Changed from createdAt to datetime
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
    const blog = await prisma.post.findUnique({ // Changed from blog to post
      where: { Post_id: parseInt(req.params.id) } // Changed from id to Post_id
    });

    if (!blog || blog.userId !== req.session.user.user_id) { // Changed from id to user_id
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.post.delete({ // Changed from blog to post
      where: { Post_id: parseInt(req.params.id) } // Changed from id to Post_id
    });
    
    res.redirect("/user/dashboard");
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", csrfProtection, async (req, res) => {
  try {
    const blog = await prisma.post.findUnique({ // Changed from blog to post
      where: { Post_id: parseInt(req.params.id) }, // Changed from id to Post_id
      include: {
        author: { // Changed from user to author
          select: {
            user_id: true, // Changed from id to user_id
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
        user: req.session.user,
        csrfToken: req.csrfToken()
      });
    }
    console.log(req.session.user);
    console.log(blog);

    res.render('blog/single', { 
      title: blog.title,
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