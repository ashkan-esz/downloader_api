import config from "./config/index.js";
import {createCollectionsAndIndexes} from "./data/createCollectionsIndex.js";
import * as usersDbMethods from "./data/db/usersDbMethods.js";
import * as bcrypt from "bcrypt";
import {v4 as uuidv4} from "uuid";
import {generateAuthTokens, getJwtPayload} from "./services/users.services.js";
import {createBuckets, defaultProfileImage} from "./data/cloudStorage.js";
import {addMoviesFromMongodbToPostgres} from "./data/db/moviesDbMethods.js";
import {restoreBackupDbJobFunc} from "./jobs/dbBackup.js";
import {addNotificationEntityTypes} from "./data/db/notificationDbMethods.js";

export let testUserCreated = false;

export async function preStart(force = false) {
    if (config.nodeEnv !== 'dev') {
        console.log('====> [[Adding Movies To Postgres]]');
        await addMoviesFromMongodbToPostgres();
        console.log('====> [[Adding Movies to Postgres: Done]]');

        console.log('====> [[Restoring PostgresDb Backup]]');
        let res = await restoreBackupDbJobFunc(true);
        if (res?.status === 'error') {
            console.log('====> [[Restoring PostgresDb Backup: Error]]');
        } else if (res?.status === 'empty') {
            console.log('====> [[Restoring PostgresDb Backup: Backup Not Found]]');
        } else if (res?.status === 'not empty') {
            console.log('====> [[Restoring PostgresDb Backup: Bypass Because Not Needed]]');
        } else {
            console.log('====> [[Restoring PostgresDb Backup: Done]]');
        }
    }
    if (config.admin.user && config.admin.pass) {
        await Promise.allSettled([
            createAdminUser(),
            createTestUser(),
        ]);
    }
    if (config.initDbsOnStart || force) {
        await createCollectionsAndIndexes();
        await createBuckets();
        if (!testUserCreated) {
            await createTestUser();
        }
        console.log('====> [[Creating Notifications Entity Types]]');
        await addNotificationEntityTypes();
        console.log('====> [[Creating Notifications Entity Types: done]]');
    }
}

async function createTestUser() {
    console.log('====> [[Creating Guest User]]');
    try {
        let hashedPassword = await bcrypt.hash('$$test_user_password$$', 12);
        let userData = await usersDbMethods.addUser('$$test_user$$', '', hashedPassword, 'test_user', '0', 0, defaultProfileImage);
        if (userData === 'userId exist' || userData === 'username exist' || userData === 'email exist') {
            //test user already exist
            console.log('====> [[Creating Guest User: Already Exists]]');
            testUserCreated = true;
            return;
        }
        if (!userData) {
            console.log('====> [[Creating Guest User: Error]]');
            return;
        }
        const user = getJwtPayload(userData);
        const tokens = generateAuthTokens(user, '10000d', '10000d');
        const deviceId = uuidv4();
        await usersDbMethods.addSession(userData.userId, {}, deviceId, tokens.refreshToken); //deviceInfo, deviceId
        console.log('====> [[Creating Guest User: Done]]');
        testUserCreated = true;
        //---------------------------------
        //---------------------------------
    } catch (error) {
        console.log('====> [[Creating Guest User: Error]]');
        saveError(error);
    }
}

async function createAdminUser() {
    console.log('====> [[Creating Admin User]]');
    try {
        let hashedPassword = await bcrypt.hash(config.admin.pass, 12);
        const email = config.admin.user + '@gmail.com';
        let userData = await usersDbMethods.addUser(config.admin.user, email, hashedPassword, 'admin', '', 0, defaultProfileImage);
        if (userData === 'userId exist' || userData === 'username exist' || userData === 'email exist') {
            console.log('====> [[Creating Admin User: Already Exists]]');
        } else if (userData) {
            console.log('====> [[Creating Admin User: Done]]');
        } else {
            console.log('====> [[Creating Admin User: Error]]');
        }
    } catch (error) {
        console.log('====> [[Creating Admin User: Error]]');
        saveError(error);
    }
}
