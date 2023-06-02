import {findUserById} from "../../data/db/usersDbMethods.js";
import {errorMessage} from "../../services/serviceUtils.js";


export async function uploadProfileImage(req, res, next) {
    let userData = await findUserById(req.jwtUserData.userId, {profileImageCounter: 1});
    if (userData === 'error') {
        return res.status(409).json({
            data: null,
            code: 500,
            errorMessage: errorMessage.serverError,
            isGuest: false,
        });
    }
    if (!userData) {
        return res.status(404).json({
            data: null,
            code: 404,
            errorMessage: errorMessage.userNotFound,
            isGuest: false,
        });
    }
    if (userData.profileImageCounter > 19) {
        return res.status(409).json({
            data: null,
            code: 409,
            errorMessage: errorMessage.exceedProfileImage,
            isGuest: false,
        });
    }
    next();
}
