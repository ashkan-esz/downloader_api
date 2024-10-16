import fs from "fs";
import prisma from "../data/prisma.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";
import * as zlib from "zlib";
import crypto from "crypto";
import config from "../config/index.js";
import {getDatesBetween} from "../crawlers/utils/utils.js";
import {
    getDbBackupFile,
    getDbBackupFilesList,
    removeDbBackupFileFromS3,
    uploadDbBackupFileToS3
} from "../data/cloudStorage.js";

try {
    await fs.promises.mkdir('./db-backups');
} catch (error) {
}

const backupDir = './db-backups';
const _daysToKeepBackUpFiles = 7;
const _encryptAlgorythm = 'aes-256-ctr';
const _iv = "5183666c72eec9e4";

export default function (agenda) {
    agenda.define("backup db", {concurrency: 1}, async (job) => {
        await backupDbJobFunc();
    });
}

const _modelNames = Object.freeze([
    'user', 'follow', 'activeSession', 'profileImage', 'computedFavoriteGenres',
    'movieSettings', 'downloadLinksSettings', 'notificationSettings',
    'staff', 'likeDislikeStaff', 'followStaff',
    'character', 'likeDislikeCharacter', 'favoriteCharacter',
    'castImage',
    'movie', 'relatedMovie', 'credit',
    'likeDislikeMovie', 'watchedMovie', 'followMovie',
    'watchListGroup', 'watchListMovie',
    'userCollection', 'userCollectionMovie',
    "room", "message", "mediaFile", "userMessageRead",
    "notificationEntityType", "notification",
    "bot", "userBot",
    "permission", "role", "roleToPermission", "userToRole",
    "userTorrent",
]);

export async function backupDbJobFunc(isManualStart = false) {
    try {
        updateCronJobsStatus('backupDb', 'start');

        if (!isManualStart && (Date.now() - config.serverStartTime < 30 * 60 * 1000)) {
            //don't start backup process if server just started
            updateCronJobsStatus('backupDb', 'end');
            return;
        }
        if (await checkPostgresEmpty()) {
            //don't start backup process if postgres is empty
            updateCronJobsStatus('backupDb', 'end');
            return;
        }

        updateCronJobsStatus('backupDb', 'removing old backups');
        await removeOldBackups();

        const dateString = new Date().toISOString();
        BigInt.prototype.toJSON = function () {
            return this.toString()
        }

        for (let i = 0; i < _modelNames.length; i++) {
            updateCronJobsStatus('backupDb', _modelNames[i]);
            let data = await prisma[_modelNames[i]].findMany();
            updateCronJobsStatus('backupDb', _modelNames[i] + ': stringify');
            let temp = JSON.stringify(data);
            data = null;
            await new Promise((resolve, reject) => {
                updateCronJobsStatus('backupDb', _modelNames[i] + ': compress with gzip');
                zlib.gzip(temp, async (error, compressedData) => {
                    temp = null;
                    if (error) {
                        saveError(error);
                        return reject(error);
                    }

                    updateCronJobsStatus('backupDb', _modelNames[i] + ': encrypting data');
                    const password = crypto.createHash('sha256').update(config.dataBases.backupPassword).digest('base64').slice(0, 32);
                    const cipher = crypto.createCipheriv(_encryptAlgorythm, password, _iv);
                    let encryptedData = cipher.update(compressedData);
                    compressedData = null;
                    encryptedData = Buffer.concat([encryptedData, cipher.final()]);

                    updateCronJobsStatus('backupDb', _modelNames[i] + ': write file');
                    const fileName = `backup-${_modelNames[i]}-${dateString}.gz`; //backup-modelName-date.gz
                    await fs.promises.writeFile(`${backupDir}/${fileName}`, encryptedData);
                    updateCronJobsStatus('backupDb', _modelNames[i] + ': uploading to s3');
                    await uploadDbBackupFileToS3(encryptedData, fileName);
                    encryptedData = null;
                    return resolve();
                });
            });
        }

        updateCronJobsStatus('backupDb', 'end');
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('backupDb', 'end');
        return {status: 'error'};
    }
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export async function restoreBackupDbJobFunc(autoStartOnServerUp = false) {
    try {
        updateCronJobsStatus('restoreBackupDb', 'start');

        if (autoStartOnServerUp && !(await checkPostgresEmpty())) {
            updateCronJobsStatus('restoreBackupDb', 'end');
            return {status: 'not empty'};
        }

        updateCronJobsStatus('restoreBackupDb', 'fetching backup files list');
        let s3Files = await getDbBackupFilesList();
        if (s3Files.length === 0) {
            updateCronJobsStatus('restoreBackupDb', 'end');
            return {status: 'ok'};
        }

        updateCronJobsStatus('restoreBackupDb', 'filter last backup files list');
        let backupFiles = [];
        for (let i = 0; i < _modelNames.length; i++) {
            let lastDate = null;
            let lastBackup = null;
            for (let j = 0; j < s3Files.length; j++) {
                if (s3Files[j].Key.split('-')[1] === _modelNames[i]) {
                    let date = s3Files[j].Key.split('-').slice(2).join('-').replace('.gz', '');
                    if (!lastBackup || getDatesBetween(new Date(date), new Date(lastDate)).milliseconds > 0) {
                        lastDate = date;
                        lastBackup = s3Files[j];
                    }
                }
            }
            if (lastBackup) {
                backupFiles.push(lastBackup);
            }
        }

        backupFiles = backupFiles.sort((a, b) => _modelNames.indexOf(a.Key.split('-')[1]) - _modelNames.indexOf(b.Key.split('-')[1]));

        if (backupFiles.length === 0) {
            updateCronJobsStatus('restoreBackupDb', 'end');
            return {status: 'empty'};
        }

        for (let i = 0; i < backupFiles.length; i++) {
            const modelName = backupFiles[i].Key.split('-')[1]; //backup-modelName-date.gz
            if (autoStartOnServerUp) {
                console.log(`====> [[Restoring PostgresDb Backup: ${modelName}]]`);
            }
            updateCronJobsStatus('restoreBackupDb', modelName + ': downloading file');
            let encryptedData = await getDbBackupFile(backupFiles[i].Key); //buffer

            updateCronJobsStatus('restoreBackupDb', modelName + ': decrypt file');
            const password = crypto.createHash('sha256').update(config.dataBases.backupPassword).digest('base64').slice(0, 32);
            const decipher = crypto.createDecipheriv(_encryptAlgorythm, password, _iv);
            let decryptedData = decipher.update(encryptedData);
            encryptedData = null;
            decryptedData = Buffer.concat([decryptedData, decipher.final()]);

            await new Promise((resolve, reject) => {
                updateCronJobsStatus('restoreBackupDb', modelName + ': gunzip file');
                zlib.gunzip(decryptedData, async (error, uncompressedData) => {
                    decryptedData = null;
                    if (error) {
                        saveError(error);
                        return reject(error);
                    }

                    updateCronJobsStatus('restoreBackupDb', modelName + ': JSON parse');
                    let data = JSON.parse(uncompressedData);
                    uncompressedData = null;

                    let totalSize = data.length;
                    let loopCounter = 0;
                    let loopSize = 100;
                    while (data.length > 0) {
                        updateCronJobsStatus('restoreBackupDb', modelName + `: adding to db (${loopCounter * loopSize}/${totalSize})`);
                        loopCounter++;
                        let insertData = data.splice(0, loopSize);
                        try {
                            await prisma[modelName].createMany({data: insertData, skipDuplicates: true});
                        } catch (error2) {
                            saveError(error2);
                        }
                    }

                    data = null;
                    return resolve();
                });
            });
        }

        updateCronJobsStatus('restoreBackupDb', 'fixing serial id counter');
        await fixSerialIdCounterAfterBackupRestore();

        updateCronJobsStatus('restoreBackupDb', 'end');
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('restoreBackupDb', 'end');
        return {status: 'error'};
    }
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export async function checkPostgresEmpty() {
    try {
        const modelNames = [
            'staff', 'likeDislikeStaff', 'followStaff',
            'character', 'likeDislikeCharacter', 'favoriteCharacter',
            'castImage', 'relatedMovie', 'credit',
            'likeDislikeMovie', 'watchedMovie', 'followMovie',
            'watchListGroup', 'watchListMovie',
            'userCollection', 'userCollectionMovie',
        ];
        for (let i = 0; i < modelNames.length; i++) {
            let count = await prisma[modelNames[i]].count();
            if (count > 0) {
                return false;
            }
        }
        return true;
    } catch (error) {
        saveError(error);
        return true;
    }
}

export async function fixSerialIdCounterAfterBackupRestore() {
    const models = [
        {
            name: 'User',
            fieldName: 'userId',
        },
        {
            name: 'Role',
            fieldName: 'id',
        },
        {
            name: 'Permission',
            fieldName: 'id',
        },
        {
            name: 'Staff',
            fieldName: 'id',
        },
        {
            name: 'Character',
            fieldName: 'id',
        },
        {
            name: 'Credit',
            fieldName: 'id',
        },
        {
            name: 'Room',
            fieldName: 'roomId',
        },
        {
            name: 'Message',
            fieldName: 'id',
        },
        {
            name: 'MediaFile',
            fieldName: 'id',
        },
        {
            name: 'Notification',
            fieldName: 'id',
        },
    ];

    for (let i = 0; i < models.length; i++) {
        try {
            console.log(`====> [[Fixing PostgresDb Serial Id Counter: ${models[i].name}]]`);
            updateCronJobsStatus('restoreBackupDb', `fixing serial id counter [${models[i].name}]`);
            const raw = `SELECT setval(pg_get_serial_sequence('"${models[i].name}"', '${models[i].fieldName}'), coalesce(max("${models[i].fieldName}"),0) + 1, false) FROM "${models[i].name}";`
            await prisma.$executeRawUnsafe(raw);
        } catch (error) {
            saveError(error);
        }
    }
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export async function removeOldBackups() {
    try {
        let files = await fs.promises.readdir(backupDir);
        for (let i = 0; i < files.length; i++) {
            let fileDate = files[i].split('-').slice(2).join('-').replace('.gz', '');
            if (getDatesBetween(new Date(), new Date(fileDate)).days >= _daysToKeepBackUpFiles) {
                await fs.promises.unlink(backupDir + '/' + files[i]);
            }
        }

        let s3Files = await getDbBackupFilesList();
        for (let i = 0; i < s3Files.length; i++) {
            let fileDate = s3Files[i].Key.split('-').slice(2).join('-').replace('.gz', '');
            if (getDatesBetween(new Date(), new Date(fileDate)).days >= _daysToKeepBackUpFiles) {
                await removeDbBackupFileFromS3(s3Files[i].Key);
            }
        }
    } catch (error) {
        saveError(error);
    }
}