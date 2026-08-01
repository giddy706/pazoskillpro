const { z } = require('zod');

const registerSchema = {
    body: z.object({
        fullName: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        role: z.enum(['student', 'admin']).optional(),
        promo_code: z.string().optional()
    })
};

const loginSchema = {
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required')
    })
};

module.exports = {
    registerSchema,
    loginSchema,
    // Legacy aliases
    register: registerSchema,
    login: loginSchema
};
