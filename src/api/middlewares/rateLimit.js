import rateLimit from "express-rate-limit";

export default rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2,
    message: 'Wait for 30s before retry',
});
