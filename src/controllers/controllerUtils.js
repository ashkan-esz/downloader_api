
export async function sendResponse(req, res, serviceResult) {
    serviceResult.responseData.isGuest = req.isGuest === undefined ? false : req.isGuest;
    BigInt.prototype.toJSON = function() { return this.toString() }
    return res.status(serviceResult.responseData.code).json(serviceResult.responseData);
}