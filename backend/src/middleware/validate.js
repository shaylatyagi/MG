/**
 * Zod validation middleware
 * Usage: router.post('/path', validate(MySchema), handler)
 */

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({ success: false, message: errors[0].message, errors });
  }
  req.body = result.data; // use parsed + coerced data downstream
  next();
};

module.exports = { validate };
