import rateLimit from "express-rate-limit";

export const rateLimit_2 = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2,
    message: 'Wait for 30s before retry',
    handler: function (req, res, next, options) {
        let resetTime = req.rateLimit.resetTime;
        let coolDown = (new Date(resetTime).getTime() - Date.now()) / 1000;
        let message = resetTime ? `Wait for ${Math.ceil(coolDown) + 1}s before retry` : options.message;
        res.status(options.statusCode).send(message);
    }
});

export const rateLimit_3 = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3,
    message: 'Wait for 20s before retry',
    handler: function (req, res, next, options) {
        let resetTime = req.rateLimit.resetTime;
        let coolDown = (new Date(resetTime).getTime() - Date.now()) / 1000;
        let message = resetTime ? `Wait for ${Math.ceil(coolDown) + 1}s before retry` : options.message;
        res.status(options.statusCode).send(message);
    }
});

export const rateLimit_5 = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Wait for 12s before retry',
    handler: function (req, res, next, options) {
        let resetTime = req.rateLimit.resetTime;
        let coolDown = (new Date(resetTime).getTime() - Date.now()) / 1000;
        let message = resetTime ? `Wait for ${Math.ceil(coolDown) + 1}s before retry` : options.message;
        res.status(options.statusCode).send(message);
    }
});
