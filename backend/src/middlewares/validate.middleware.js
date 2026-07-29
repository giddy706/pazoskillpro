const { z } = require('zod');
const { error } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
    try {
        if (schema.params) {
            req.params = schema.params.parse(req.params);
        }
        if (schema.query) {
            req.query = schema.query.parse(req.query);
        }
        if (schema.body) {
            req.body = schema.body.parse(req.body);
        }
        next();
    } catch (e) {
        if (e instanceof z.ZodError) {
            const message = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
            return res.status(400).json({ success: false, message });
        }
        next(e);
    }
};

module.exports = { validate };
