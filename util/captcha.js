// utils/captcha.js
const crypto = require('crypto');

// CAPTCHA data - image URLs and their solutions
const CAPTCHA_DATA = [
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0002.jpg?updatedAt=1743971758968", solution: "LOsdYM" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0007.jpg?updatedAt=1743971758781", solution: "fdsSq" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0009.jpg?updatedAt=1743971758958", solution: "Loskfw" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0005.jpg?updatedAt=1743971758963", solution: "GSgyad" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0008.jpg?updatedAt=1743971758678", solution: "NqviNd" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0011.jpg?updatedAt=1743971758682", solution: "pcjhcA" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0006.jpg?updatedAt=1743971758674", solution: "xySabw" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0004.jpg?updatedAt=1743971758785", solution: "WedGSD" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0010.jpg?updatedAt=1743971758772", solution: "HapYOI" },
    { imageUrl: "https://ik.imagekit.io/xnrxbagp7/captcha/IMG-20250406-WA0003.jpg?updatedAt=1743971758284", solution: "TreBoR" }
];

const CAPTCHA_EXPIRY = 15 * 60 * 1000; // 15 minutes
const CAPTCHA_MAP = new Map();

// Generate random CAPTCHA ID
function generateCaptchaId() {
    return crypto.randomBytes(16).toString('hex');
}

// Get a random CAPTCHA from the data
function getRandomCaptcha() {
    return CAPTCHA_DATA[Math.floor(Math.random() * CAPTCHA_DATA.length)];
}

// Generate a new CAPTCHA challenge
function generateCaptcha() {
    const { imageUrl, solution } = getRandomCaptcha();
    const captchaId = generateCaptchaId();
    
    CAPTCHA_MAP.set(captchaId, {
        solution: solution,
        expires: Date.now() + CAPTCHA_EXPIRY,
        attempts: 0
    });
    
    return {
        id: captchaId,
        imageUrl: imageUrl
    };
}

// Verify CAPTCHA response
function verifyCaptcha(captchaId, userInput) {
    if (!captchaId || !userInput || !CAPTCHA_MAP.has(captchaId)) {
        return false;
    }
    
    const captcha = CAPTCHA_MAP.get(captchaId);
    
    // Check expiration
    if (captcha.expires < Date.now()) {
        CAPTCHA_MAP.delete(captchaId);
        return false;
    }
    
    // Check attempts
    if (captcha.attempts >= 3) {
        CAPTCHA_MAP.delete(captchaId);
        return false;
    }
    
    // Increment attempts
    captcha.attempts++;
    
    // Verify solution (case-sensitive)
    const isCorrect = userInput.trim() === captcha.solution;
    
    // Remove from map after verification
    CAPTCHA_MAP.delete(captchaId);
    
    return isCorrect;
}

// Cleanup expired CAPTCHAs periodically
setInterval(() => {
    const now = Date.now();
    for (const [id, captcha] of CAPTCHA_MAP.entries()) {
        if (captcha.expires < now) {
            CAPTCHA_MAP.delete(id);
        }
    }
}, 60 * 1000); // Run every minute

module.exports = { generateCaptcha, verifyCaptcha };