import config from "../../config/index.js";
import NodeCache from "node-cache";
import {saveError} from "../../error/saveError.js";

const refreshTokenBlackList = new NodeCache({stdTTL: 60 * 60});
let cacheDuration = Number(config.jwt.accessTokenExpire.replace('h', '')) * 60 * 60;

export function addToBlackList(jwtKey, cause, duration = null) {
    try {
        if (duration) {
            if (duration > 60) {
                refreshTokenBlackList.set(jwtKey, cause, duration);
            }
        } else {
            refreshTokenBlackList.set(jwtKey, cause, cacheDuration);
        }
    } catch (error) {
        saveError(error);
    }
}

export function checkTokenBlackListed(token) {
    return refreshTokenBlackList.has(token);
}
