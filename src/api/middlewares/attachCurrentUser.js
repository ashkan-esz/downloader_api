import {findUserById} from "../../data/usersDbMethods.js";

export default async function attachCurrentUser(req, res, next) {
    if (!req.isAuth && req.authCode) {
        return res.status(req.authCode).json({
            code: req.authCode,
            errorMessage: req.authCode === 401 ? 'Unauthorized' : 'Invalid token'
        });
    }
    let userData = await findUserById(req.jwtUserData.userId);
    if (userData === 'error') {
        return res.status(500).json({
            data: null,
            code: 500,
            errorMessage: 'Server error, try again later',
        });
    } else if (!userData) {
        return res.status(401).json({
            data: null,
            code: 401,
            errorMessage: 'Cannot find userId',
        });
    }
    req.userData = userData;
    return next();
}

