import config from "./config/index.js";
import {createCollectionsAndIndexes} from "./data/createCollectionsIndex.js";
import * as usersDbMethods from "./data/db/usersDbMethods.js";
import * as bcrypt from "bcrypt";
import {v4 as uuidv4} from "uuid";
import {generateAuthTokens, getJwtPayload} from "./services/users.services.js";
import {createBuckets, defaultProfileImage} from "./data/cloudStorage.js";
import {addMoviesFromMongodbToPostgres} from "./data/db/moviesDbMethods.js";
import * as roleAndPermissionsDbMethods from "./data/db/admin/roleAndPermissionsDbMethods.js";
import {Default_Role_Ids} from "./data/db/admin/roleAndPermissionsDbMethods.js";
import {restoreBackupDbJobFunc} from "./jobs/dbBackup.js";
import {addNotificationEntityTypes} from "./data/db/notificationDbMethods.js";
import {addBotsFromMongodbToPostgres} from "./data/db/botsDbMethods.js";

export let _testUserId = null;

export async function preStart(force = false) {
    if (config.nodeEnv !== 'dev') {
        console.log('====> [[Adding Movies To Postgres]]');
        await addMoviesFromMongodbToPostgres();
        console.log('====> [[Adding Movies to Postgres: Done]]');

        console.log('====> [[Adding Bots To Postgres]]');
        await addBotsFromMongodbToPostgres();
        console.log('====> [[Adding Bots to Postgres: Done]]');

        console.log('====> [[Adding permissions To Postgres]]');
        await roleAndPermissionsDbMethods.addPermissionsToPostgres();
        console.log('====> [[Adding permissions to Postgres: Done]]');

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

        console.log('====> [[Adding main_admin_role To Postgres]]');
        await roleAndPermissionsDbMethods.addMainAdminRoleToPostgres();
        await roleAndPermissionsDbMethods.addDefaultAdminRoleToPostgres();
        console.log('====> [[Adding main_admin_role to Postgres: Done]]');

        console.log('====> [[Adding default_user_role To Postgres]]');
        await roleAndPermissionsDbMethods.addDefaultUserRoleToPostgres();
        await roleAndPermissionsDbMethods.addTestUserRoleToPostgres();
        await roleAndPermissionsDbMethods.addDefaultBotRoleToPostgres();
        console.log('====> [[Adding default_user_role to Postgres: Done]]');

        console.log('====> [[Creating Notifications Entity Types]]');
        await addNotificationEntityTypes();
        console.log('====> [[Creating Notifications Entity Types: done]]');
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
        if (!_testUserId) {
            await createTestUser();
        }
    }
}

async function createTestUser() {
    console.log('====> [[Creating Guest User]]');
    try {
        let hashedPassword = await bcrypt.hash('$$test_user_password$$', 11);
        let userData = await usersDbMethods.addUser('$$test_user$$', '', hashedPassword, Default_Role_Ids.testUser, '0', 0, defaultProfileImage);
        if (userData === 'userId exist' || userData === 'username exist' || userData === 'email exist') {
            //test user already exist
            let testUserData = await usersDbMethods.findUser('$$test_user$$', '', true);
            if (testUserData.activeSessions && testUserData.activeSessions.length > 0) {
                console.log('====> [[Creating Guest User: Already Exists]]');
                _testUserId = testUserData.userId;
                return;
            } else {
                userData = testUserData;
            }
        }
        if (!userData) {
            console.log('====> [[Creating Guest User: Error]]');
            return;
        }
        const user = getJwtPayload(userData, [Default_Role_Ids.testUser]);
        const tokens = generateAuthTokens(user, '10000d', '10000d');
        const deviceId = uuidv4();
        await usersDbMethods.addSession(userData.userId, {}, deviceId, tokens.refreshToken); //deviceInfo, deviceId
        console.log('====> [[Creating Guest User: Done]]');
        _testUserId = userData.userId;
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
        let hashedPassword = await bcrypt.hash(config.admin.pass, 13);
        const email = config.admin.user + '@gmail.com';
        let userData = await usersDbMethods.addUser(config.admin.user, email, hashedPassword,  Default_Role_Ids.mainAdmin, '', 0, defaultProfileImage);
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
