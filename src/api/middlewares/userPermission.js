import {getProfileImagesCount} from "../../data/db/usersDbMethods.js";
import {errorMessage} from "../../services/serviceUtils.js";
import * as adminConfigDbMethods from "../../data/db/admin/adminConfigDbMethods.js";


export async function uploadProfileImage(req, res, next) {
    let profileImageCount = await getProfileImagesCount(req.jwtUserData.userId);
    if (profileImageCount === 'error') {
        return res.status(500).json({
            data: null,
            code: 500,
            errorMessage: errorMessage.serverError,
            isGuest: false,
            isCacheData: false,
        });
    }

    if (profileImageCount > 19) {
        return res.status(409).json({
            data: null,
            code: 409,
            errorMessage: errorMessage.exceedProfileImage,
            isGuest: false,
            isCacheData: false,
        });
    }
    next();
}

export async function uploadAppVersion(req, res, next) {
    const result = await adminConfigDbMethods.getAppVersionDB(true);
    if (result === 'error') {
        return res.status(500).json({
            data: null,
            code: 500,
            errorMessage: errorMessage.serverError,
            isGuest: false,
            isCacheData: false,
        });
    }

    const appData = req.query.appData;
    const app = result.find(app => app.appName === appData.appName && app.os === appData.os);
    if (app && app.versions.find(v => v.version === appData.version)) {
        return res.status(409).json({
            data: null,
            code: 409,
            errorMessage: errorMessage.alreadyExist,
            isGuest: false,
            isCacheData: false,
        });
    }

    next();
}
