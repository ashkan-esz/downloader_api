import {findUserById} from "../../data/usersDbMethods";

export default async function attachCurrentUser(req, res, next) {
    let userData = await findUserById(req.jwtUserData.userId);
    if (!userData) {
        return res.status(401).json({
            code: 401,
            errorMessage: 'Cannot find userId',
        });
    }
    req.userData = userData;
    return next();
}

