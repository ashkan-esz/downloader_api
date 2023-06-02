export function sendResponse(req, res, serviceResult) {
    serviceResult.responseData.isGuest = req.isGuest === undefined ? false : req.isGuest;
    return res.status(serviceResult.responseData.code).json(serviceResult.responseData);
}