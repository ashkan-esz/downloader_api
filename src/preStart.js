import {createCollectionsAndIndexes} from "./data/createCollectionsIndex.js";
import {userModel} from "./models/user.js";
import {addUser, findUser, setTokenForNewUser} from "./data/usersDbMethods.js";
import * as bcrypt from "bcrypt";
import {v4 as uuidv4} from "uuid";
import {generateAuthTokens, getJwtPayload} from "./services/users.services.js";


(async function preStart() {
    await createCollectionsAndIndexes();
    await createTestUser();
})()

async function createTestUser() {
    console.log('creating test user');
    try {
        let findUserResult = await findUser('$$test_user$$', '', {
            username: 1,
            rawUsername: 1,
            role: 1,
            activeSessions: 1,
        });

        if (findUserResult === 'error') {
            console.log('error on creating test user');
        } else if (!findUserResult) {
            //create test user
            let deviceInfo = {
                ipLocation: '',
            };
            let deviceId = uuidv4();
            let hashedPassword = await bcrypt.hash('$$test_user_password$$', 12);
            let testUser = userModel('$$test_user$$', '', hashedPassword, '', 0, deviceInfo, deviceId);
            testUser.role = 'test-user';
            let userId = await addUser(testUser);
            if (!userId) {
                console.log('error on creating test user');
            }
            const user = getJwtPayload(testUser, userId);
            const tokens = generateAuthTokens(user, '10000d');
            await setTokenForNewUser(userId, tokens.refreshToken);
            console.log('test user data: ', {
                accessToken: tokens.accessToken,
                accessToken_expire: tokens.accessToken_expire,
                refreshToken: tokens.refreshToken,
                username: testUser.username,
                rawUsername: testUser.rawUsername,
                userId: userId,
                role: testUser.role,
            });
        } else {
            //test user already exist
            console.log('test user data (already exist): ', {
                refreshToken: findUserResult.activeSessions.map(item => item.refreshToken).join('/'),
                username: findUserResult.username,
                rawUsername: findUserResult.rawUsername,
                userId: findUserResult._id,
                role: findUserResult.role,
            });
        }
    } catch (error) {
        console.log('error on creating test user');
        saveError(error);
    }
}
