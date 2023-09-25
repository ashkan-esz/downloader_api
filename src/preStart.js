import config from "./config/index.js";
import {createCollectionsAndIndexes} from "./data/createCollectionsIndex.js";
import * as usersDbMethods from "./data/db/usersDbMethods.js";
import * as bcrypt from "bcrypt";
import {v4 as uuidv4} from "uuid";
import {generateAuthTokens, getJwtPayload} from "./services/users.services.js";
import {createBuckets, defaultProfileImage} from "./data/cloudStorage.js";
import {addMoviesFromMongodbToPostgres} from "./data/db/moviesDbMethods.js";


export async function preStart(force = false) {
    if (config.admin.user && config.admin.pass) {
        await createAdminUser();
    }
    console.log('====> adding movies to postgres');
    await addMoviesFromMongodbToPostgres();
    console.log('====> movies added to postgres');
    if (config.initDbsOnStart || force) {
        await createCollectionsAndIndexes();
        await createBuckets();
        await createTestUser();
    }
}

async function createTestUser() {
    console.log('creating test user');
    try {
        let hashedPassword = await bcrypt.hash('$$test_user_password$$', 12);
        let userData = await usersDbMethods.addUser('$$test_user$$', '', hashedPassword, 'test_user', '0', 0, defaultProfileImage);
        if (userData === 'username exist' || userData === 'email exist') {
            //test user already exist
            let findUserResult = await usersDbMethods.findUser('$$test_user$$', '');
            console.log('test user data (already exist): ', {
                username: findUserResult.username,
                rawUsername: findUserResult.rawUsername,
                userId: findUserResult.userId,
                role: findUserResult.role,
            });
            return;
        }
        if (!userData) {
            console.log('error on creating test user');
            return;
        }
        const user = getJwtPayload(userData);
        const tokens = generateAuthTokens(user, '10000d', '10000d');
        const deviceId = uuidv4();
        await usersDbMethods.addSession(userData.userId, {}, deviceId, tokens.refreshToken); //deviceInfo, deviceId
        console.log('test user data: ', {
            accessToken: tokens.accessToken,
            accessToken_expire: tokens.accessToken_expire,
            refreshToken: tokens.refreshToken,
            username: userData.username,
            rawUsername: userData.rawUsername,
            userId: userData.userId,
            role: userData.role,
        });
        //---------------------------------
        //---------------------------------
    } catch (error) {
        console.log('error on creating test user');
        saveError(error);
    }
}

async function createAdminUser() {
    console.log('====> creating admin user');
    try {
        let hashedPassword = await bcrypt.hash(config.admin.pass, 12);
        const email = config.admin.user + '@gmail.com';
        let userData = await usersDbMethods.addUser(config.admin.user, email, hashedPassword, 'admin', '', 0, defaultProfileImage);
        if (userData === 'username exist' || userData === 'email exist') {
            console.log('====> admin user already exist');
            return;
        }
        if (userData) {
            console.log('====> admin user created!');
        } else {
            console.log('====> error on creating admin user');
        }
    } catch (error) {
        console.log('====> error on creating admin user');
        saveError(error);
    }
}
