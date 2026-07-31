const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication operations
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin login successful
 */
router.post('/admin/login', validate(loginSchema), authController.adminLogin);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged in user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authenticateToken, authController.logout);

// TEMPORARY ROUTE TO MAKE YOUR ACCOUNT AN ADMIN
// Usage: Visit https://pazoskillpro-backend.onrender.com/api/auth/make-admin?email=your@email.com
router.get('/make-admin', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.send('Please provide an email like: ?email=your@email.com');
    
    try {
        const { getDB } = require('../config/database');
        const db = await getDB();
        const user = await db.get(`SELECT id FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(404).send(`No account found with email: ${email}`);
        await db.run(`UPDATE users SET role = 'admin' WHERE email = ?`, [email]);
        res.send(`Success! Account ${email} is now an admin. You can now log in at the frontend to access the admin dashboard.`);
    } catch (error) {
        res.status(500).send('Error upgrading account: ' + error.message);
    }
});

module.exports = router;
