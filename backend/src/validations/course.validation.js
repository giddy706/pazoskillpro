const { z } = require('zod');

const imageSchema = z.string().optional().refine((value) => {
    return !value || value.startsWith('data:') || /^https?:\/\//i.test(value);
}, 'Image must be a valid URL or data URI');

const createCourse = {
    body: z.object({
        title: z.string().min(3),
        category: z.string().min(2),
        description: z.string().min(10),
        duration: z.string().min(2),
        price: z.number().min(0),
        image: imageSchema.optional(),
        instructor: z.string().min(2),
        level: z.string().min(2),
        requirements: z.array(z.string()).optional(),
        outcomes: z.array(z.string()).optional(),
        lessons: z.array(z.object({
            title: z.string().min(1),
            video_url: z.string().optional(),
            content: z.string().optional(),
        })).optional(),
    })
};

const updateCourse = {
    params: z.object({
        id: z.coerce.number().int().positive()
    }),
    body: z.object({
        title: z.string().min(3).optional(),
        category: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        duration: z.string().min(2).optional(),
        price: z.number().min(0).optional(),
        image: z.string().url().optional(),
        instructor: z.string().min(2).optional(),
        level: z.string().min(2).optional(),
        requirements: z.array(z.string()).optional(),
        outcomes: z.array(z.string()).optional()
    })
};

module.exports = {
    createCourse,
    updateCourse
};
