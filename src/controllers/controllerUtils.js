import {setRedis} from "../data/redis.js";

export async function sendResponse(req, res, serviceResult) {
    serviceResult.responseData.isGuest = req.isGuest === undefined ? false : req.isGuest;

    if (req.isGuest && req.originalUrl.startsWith('/movies/')) {
        await setRedis(req.url, {
            ...serviceResult.responseData,
            isCacheData: true,
        }, 5 * 60);
    }

    return res.status(serviceResult.responseData.code).json(serviceResult.responseData);
}