import config from "../config";
import {findUser, addUser, updateUserAuthTokens, verifyUserEmail, updateEmailToken} from "../data/usersDbMethods";
import {userModel} from "../models/user";
import * as bcrypt from "bcrypt";
import agenda from "../agenda";
import jwt from "jsonwebtoken";
import {v4 as uuidv4} from 'uuid';
import {addToBlackList} from "../api/middlewares/isAuth";
import {saveError} from "../error/saveError";

//todo : forget password

export async function signup(username, email, password, host) {
    try {
        let findUserResult = await findUser(username, email);
        if (findUserResult) {
            if (findUserResult.username === username.toLowerCase()) {
                return generateServiceResult({}, 403, 'This username already exists');
            }
            if (findUserResult.email === email) {
                return generateServiceResult({}, 403, 'This email already exists');
            }
        }

        let hashedPassword = await bcrypt.hash(password, 12);
        let emailVerifyToken = await bcrypt.hash(uuidv4(), 12);
        emailVerifyToken = emailVerifyToken.replace(/\//g, '');
        let emailVerifyToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour
        let userData = userModel(username, email, hashedPassword, emailVerifyToken, emailVerifyToken_expire);
        let userId = await addUser(userData);
        if (!userId) {
            return generateServiceResult({}, 500, 'Server error, try again later');
        }
        const user = getJwtPayload(userData, userId);
        const tokens = generateAuthTokens(user);
        await updateUserAuthTokens(userId, tokens.refreshToken);
        await agenda.schedule('in 5 seconds', 'registration email', {
            rawUsername: userData.rawUsername,
            email,
            emailVerifyToken,
            host,
        });
        return generateServiceResult({
            accessToken: tokens.accessToken,
            accessToken_expire: tokens.accessToken_expire,
            username: userData.rawUsername,
            userId: userData._id,
        }, 201, '', tokens);
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
}

export async function login(username_email, password) {
    //todo : send email on login
    try {
        let userData = await findUser(username_email, username_email);
        if (!userData) {
            return generateServiceResult({}, 400, 'Cannot find user');
        }
        if (await bcrypt.compare(password, userData.password)) {
            const user = getJwtPayload(userData);
            const tokens = generateAuthTokens(user);
            await updateUserAuthTokens(userData._id, tokens.refreshToken, true);
            return generateServiceResult({
                accessToken: tokens.accessToken,
                accessToken_expire: tokens.accessToken_expire,
                username: userData.rawUsername,
                userId: userData._id,
            }, 200, '', tokens);
        } else {
            return generateServiceResult({}, 403, 'Username and password do not match');
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
}

export async function getToken(userData, prevRefreshToken) {
    try {
        if (prevRefreshToken === userData.refreshToken) {
            const user = getJwtPayload(userData);
            const tokens = generateAuthTokens(user);
            await updateUserAuthTokens(userData._id, tokens.refreshToken);
            return generateServiceResult({
                accessToken: tokens.accessToken,
                accessToken_expire: tokens.accessToken_expire,
                username: userData.rawUsername,
            }, 200, '', tokens);
        } else {
            return generateServiceResult({}, 401, 'Invalid RefreshToken');
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
}

export async function logout(userData, prevRefreshToken, prevAccessToken) {
    try {
        if (prevRefreshToken === userData.refreshToken) {
            try {
                let decodedJwt = jwt.decode(prevAccessToken);
                if (decodedJwt) {
                    let jwtExpireLeft = (decodedJwt.exp * 1000 - Date.now()) / 1000;
                    addToBlackList(userData.refreshToken, 'logout', jwtExpireLeft);
                }
            } catch (error2) {
                saveError(error2);
            }

            await updateUserAuthTokens(userData._id, '');
            return generateServiceResult({accessToken: ''}, 200, '');
        } else {
            return generateServiceResult({}, 403, 'Invalid RefreshToken');
        }
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
}

export async function sendVerifyEmail(userData, host) {
    try {
        let newEmailToken = await bcrypt.hash(uuidv4(), 12);
        newEmailToken = newEmailToken.replace(/\//g, '');
        let newEmailToken_expire = Date.now() + (6 * 60 * 60 * 1000);  //6 hour
        let updateResult = updateEmailToken(userData._id, newEmailToken, newEmailToken_expire);
        if (updateResult) {
            await agenda.now('verify email', {
                rawUsername: userData.rawUsername,
                email: userData.email,
                emailVerifyToken: newEmailToken,
                host,
            });

            return generateServiceResult({}, 200, '');
        }
        return generateServiceResult({}, 400, 'Cannot find user email');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
}

export async function verifyEmail(token) {
    try {
        let verify = await verifyUserEmail(token);
        if (verify) {
            return generateServiceResult({message: 'email verified'}, 200, '');
        }
        return generateServiceResult({}, 404, 'Invalid/Stale Token');
    } catch (error) {
        saveError(error);
        return generateServiceResult({}, 500, 'Server error, try again later');
    }
}

function getJwtPayload(userData, userId = '') {
    return {
        userId: (userData._id || userId).toString(),
        username: userData.rawUsername,
        role: userData.role,
    };
}

function generateAuthTokens(user) {
    const accessToken = jwt.sign(user, config.jwt.accessTokenSecret, {expiresIn: config.jwt.accessTokenExpire});
    const refreshToken = jwt.sign(user, config.jwt.refreshTokenSecret, {expiresIn: config.jwt.refreshTokenExpire});
    return {
        accessToken,
        accessToken_expire: jwt.decode(accessToken).exp * 1000,
        refreshToken,
    };
}

function generateServiceResult(tokenFields, code, errorMessage, extraData = {}) {
    return {
        ...extraData,
        data: {
            ...tokenFields,
            code: code,
            errorMessage: errorMessage,
        }
    };
}
